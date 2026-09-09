import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { ObrigacaoDTO, ClienteDTO, ChecklistTemplateDTO } from '@servium-ia/shared-types';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Table, TableHead } from '../components/Table';

export function ObrigacoesPage() {
  const [obrigacoes, setObrigacoes] = useState<ObrigacaoDTO[]>([]);
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prazo, setPrazo] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [saving, setSaving] = useState(false);
  const [ativandoId, setAtivandoId] = useState<string | null>(null);

  const load = () => {
    Promise.all([
      api<ObrigacaoDTO[]>('/obrigacoes').catch(() => [] as ObrigacaoDTO[]),
      api<ClienteDTO[]>('/clientes').catch(() => [] as ClienteDTO[]),
      api<ChecklistTemplateDTO[]>('/checklist-templates').catch(() => [] as ChecklistTemplateDTO[]),
    ])
      .then(([o, c, t]) => { setObrigacoes(o); setClientes(c); setTemplates(t); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const clienteNome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? id.slice(0, 8);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setAviso('');
    setSaving(true);
    try {
      await api('/obrigacoes', { method: 'POST', body: { cliente_id: clienteId, descricao, prazo: prazo || undefined } });
      setClienteId(''); setDescricao(''); setPrazo('');
      setShowForm(false);
      load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar obrigacao');
    } finally {
      setSaving(false);
    }
  };

  const handleAtivarCiclo = async (o: ObrigacaoDTO) => {
    setErro('');
    setAviso('');
    setAtivandoId(o.id);
    try {
      await api('/ciclos', { method: 'POST', body: { obrigacao_id: o.id } });
      setAviso(`Ciclo ativado para "${o.descricao}".`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível ativar o ciclo.');
    } finally {
      setAtivandoId(null);
    }
  };

  if (loading) return <div className="page-loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Obrigacoes</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nova Obrigacao'}
        </Button>
      </div>

      {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}
      {aviso && <div className="alert alert-success" role="status" aria-live="polite">{aviso}</div>}

      {showForm && (
        <form className="form-inline" onSubmit={handleCreate}>
          <Field label="Cliente" htmlFor="obrigacao-cliente">
            <select id="obrigacao-cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
              <option value="">Selecione...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Descricao" required>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </Field>
          <Field label="Prazo">
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Field>
          <Button type="submit" loading={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      )}

      {obrigacoes.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma obrigacao cadastrada.</p>
          <Button onClick={() => setShowForm(true)}>Cadastrar primeira obrigacao</Button>
        </div>
      ) : (
        <Table>
          <TableHead columns={['Cliente', 'Descricao', 'Prazo', 'Criado em', '']} />
          <tbody>
            {obrigacoes.map((o) => (
              <tr key={o.id}>
                <td>{clienteNome(o.cliente_id)}</td>
                <td>{o.descricao}</td>
                <td>{o.prazo ? new Date(o.prazo).toLocaleDateString('pt-BR') : '-'}</td>
                <td>{new Date(o.criado_em).toLocaleDateString('pt-BR')}</td>
                <td>
                  <Button size="sm" disabled={ativandoId !== null} onClick={() => handleAtivarCiclo(o)}>
                    {ativandoId === o.id ? 'Ativando...' : 'Ativar ciclo'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {templates.length > 0 && (
        <section className="section">
          <h2>Templates de Checklist</h2>
          <Table>
            <TableHead columns={['Nome', 'Canal', 'Itens']} />
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>{t.nome}</td>
                  <td>{t.canal}</td>
                  <td>{t.itens.length}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}
    </div>
  );
}
