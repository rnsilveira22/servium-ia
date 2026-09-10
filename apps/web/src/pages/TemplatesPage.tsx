import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Table, TableHead } from '../components/Table';
import { criarChecklistTemplate, listarChecklistTemplates } from '../api/client';
import { tamanhoEmMegabytes, tipoEsperadoLabel } from '../labels';
import type { ChecklistTemplateDTO, TipoEsperado } from '@servium-ia/shared-types';

const TIPOS: TipoEsperado[] = ['documento', 'informacao', 'assinatura'];

interface ItemForm {
  key: string;
  descricao: string;
  tipo_esperado: TipoEsperado;
  tamanho_max_mb: string;
}

let chaveSequencial = 0;

function novaChaveItem(): string {
  chaveSequencial += 1;
  return `item-${chaveSequencial}`;
}

function novoItem(): ItemForm {
  return { key: novaChaveItem(), descricao: '', tipo_esperado: 'documento', tamanho_max_mb: '' };
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<ChecklistTemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    listarChecklistTemplates()
      .then(setTemplates)
      .catch(() => setErro('Não foi possível carregar os templates. Tente novamente.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const adicionarItem = () => setItens((prev) => [...prev, novoItem()]);
  const removerItem = (key: string) => setItens((prev) => prev.filter((i) => i.key !== key));

  const atualizarItem = (key: string, patch: Partial<ItemForm>) =>
    setItens((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  function validar(): string | null {
    if (!nome.trim()) return 'Dê um nome ao template antes de salvar.';
    if (itens.length === 0) return 'Adicione ao menos um item ao template.';
    for (const item of itens) {
      if (!item.descricao.trim()) return 'Preencha a descrição de todos os itens.';
      const tamanho = Number(item.tamanho_max_mb);
      if (item.tamanho_max_mb.trim() !== '' && (Number.isNaN(tamanho) || tamanho <= 0)) {
        return 'Informe um tamanho máximo válido em megabytes ou deixe em branco.';
      }
    }
    return null;
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setAviso('');
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setSaving(true);
    try {
      await criarChecklistTemplate({
        nome: nome.trim(),
        itens: itens.map((item, index) => ({
          descricao: item.descricao.trim(),
          tipo_esperado: item.tipo_esperado,
          ordem: index + 1,
          ...(item.tamanho_max_mb.trim() !== ''
            ? { tamanho_max_bytes: Math.round(Number(item.tamanho_max_mb) * 1024 * 1024) }
            : {}),
        })),
      });
      setAviso(`Template "${nome.trim()}" criado.`);
      setNome('');
      setItens([]);
      setShowForm(false);
      load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar o template.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Templates de checklist</h1>
          <p className="text-muted">
            Crie o checklist que a Funcionária Digital usará para solicitar documentos.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Novo template'}
        </Button>
      </div>

      {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}
      {aviso && <div className="alert alert-success" role="status" aria-live="polite">{aviso}</div>}

      {showForm && (
        <form className="form-template section" onSubmit={handleCreate}>
          <Field label="Nome do template" required>
            <input
              data-testid="template-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Abertura de conta"
              required
            />
          </Field>

          <section className="section">
            <h2>Itens do checklist</h2>
            {itens.length === 0 && (
              <p className="field-hint">Adicione ao menos um item — é o que será solicitado ao cliente.</p>
            )}
            {itens.map((item, index) => (
              <div key={item.key} className="item-form-row" data-testid={`template-item-${index + 1}`}>
                <div className="item-form-head">
                  <span className="item-form-title">Item {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerItem(item.key)}
                    aria-label={`Remover item ${index + 1}`}
                  >
                    Remover
                  </Button>
                </div>
                <Field label={`Item ${index + 1} · Descrição`} required>
                  <input
                    value={item.descricao}
                    onChange={(e) => atualizarItem(item.key, { descricao: e.target.value })}
                    placeholder="Ex.: Frente da CNH"
                    required
                  />
                </Field>
                <div className="item-form-grid">
                  <Field label={`Item ${index + 1} · Tipo esperado`}>
                    <select
                      value={item.tipo_esperado}
                      onChange={(e) => atualizarItem(item.key, { tipo_esperado: e.target.value as TipoEsperado })}
                    >
                      {TIPOS.map((t) => (
                        <option key={t} value={t}>{tipoEsperadoLabel(t)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={`Item ${index + 1} · Tamanho máximo (MB)`} hint="Opcional — limite de arquivo enviado pelo cliente.">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.tamanho_max_mb}
                      onChange={(e) => atualizarItem(item.key, { tamanho_max_mb: e.target.value })}
                      placeholder="Ex.: 5"
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={adicionarItem}>
              + Adicionar item
            </Button>
          </section>

          <div className="form-actions">
            <Button type="submit" loading={saving}>
              {saving ? 'Salvando...' : 'Salvar template'}
            </Button>
          </div>
        </form>
      )}

      <section className="section">
        <h2>Templates cadastrados ({templates.length})</h2>
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum template cadastrado ainda.</p>
            <p className="text-muted">Crie o primeiro checklist para configurar as solicitações.</p>
            {!showForm && <Button onClick={() => setShowForm(true)}>Criar primeiro template</Button>}
          </div>
        ) : (
          <Table>
            <TableHead columns={['Nome', 'Canal de envio', 'Qtd. de itens', 'Itens']} />
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>{t.nome}</td>
                  <td>{t.canal === 'email' ? 'E-mail' : t.canal}</td>
                  <td>{t.itens.length}</td>
                  <td>
                    <ul className="checklist-itens">
                      {t.itens.map((it) => (
                        <li key={it.id}>
                          {it.descricao} — {tipoEsperadoLabel(it.tipo_esperado)}
                          {tamanhoEmMegabytes(it.tamanho_max_bytes)}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}