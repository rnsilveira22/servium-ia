import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { EMAIL_TEMPLATE_PLACEHOLDERS, type ChecklistTemplateDTO, type EmailTemplateDTO } from '@servium-ia/shared-types';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Table, TableHead } from '../components/Table';

export function ModelosEmailPage() {
  const [modelos, setModelos] = useState<EmailTemplateDTO[]>([]);
  const [checklists, setChecklists] = useState<ChecklistTemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [assunto, setAssunto] = useState('');
  const [corpo, setCorpo] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState('');
  const [editandoAssunto, setEditandoAssunto] = useState('');
  const [editandoCorpo, setEditandoCorpo] = useState('');
  const [vincularModelo, setVincularModelo] = useState('');
  const [vincularChecklist, setVincularChecklist] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      api<EmailTemplateDTO[]>('/email-templates').catch(() => [] as EmailTemplateDTO[]),
      api<ChecklistTemplateDTO[]>('/checklist-templates').catch(() => [] as ChecklistTemplateDTO[]),
    ])
      .then(([m, c]) => { setModelos(m); setChecklists(c); })
      .catch(() => setErro('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const checklistDoModelo = (modeloId: string) => checklists.find((c) => c.email_template_id === modeloId);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setSaving(true);
    try {
      await api('/email-templates', { method: 'POST', body: { nome, assunto, corpo } });
      setNome(''); setAssunto(''); setCorpo('');
      setShowForm(false);
      setAviso('Modelo de e-mail criado.');
      load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar modelo');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setErro('');
    setSaving(true);
    try {
      await api(`/email-templates/${id}`, { method: 'PUT', body: { nome: editandoNome, assunto: editandoAssunto, corpo: editandoCorpo } });
      setEditandoId(null);
      setAviso('Modelo atualizado.');
      load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar modelo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErro('');
    if (!window.confirm('Excluir este modelo de e-mail?')) return;
    try {
      await api(`/email-templates/${id}`, { method: 'DELETE' });
      setAviso('Modelo excluído.');
      load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir modelo');
    }
  };

  const handleVincular = async () => {
    setErro('');
    if (!vincularModelo || !vincularChecklist) {
      setErro('Selecione um modelo e um checklist para vincular.');
      return;
    }
    setSaving(true);
    try {
      await api(`/checklist-templates/${vincularChecklist}/vincular-email-template`, {
        method: 'PUT',
        body: { email_template_id: vincularModelo },
      });
      setAviso('Checklist vinculado ao modelo de e-mail.');
      setVincularModelo(''); setVincularChecklist('');
      load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao vincular');
    } finally {
      setSaving(false);
    }
  };

  const handleDesvincular = async (checklistId: string) => {
    setErro('');
    setSaving(true);
    try {
      await api(`/checklist-templates/${checklistId}/vincular-email-template`, { method: 'PUT', body: { email_template_id: null } });
      setAviso('Vínculo removido.');
      load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao desvincular');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Modelos de E-mail</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo Modelo'}
        </Button>
      </div>

      {aviso && <div className="alert alert-success" role="status" aria-live="polite">{aviso}</div>}
      {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}

      {showForm && (
        <form className="form-inline" onSubmit={handleCreate}>
          <Field label="Nome" required>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Solicitação de documentos — abertura de empresa" />
          </Field>
          <Field label="Assunto" required>
            <input value={assunto} onChange={(e) => setAssunto(e.target.value)} required placeholder="Documentação necessária para abertura de empresa" />
          </Field>
          <Field
            label="Corpo"
            required
            hint={`Placeholders: ${EMAIL_TEMPLATE_PLACEHOLDERS.map((p) => `${p.chave} (${p.descricao})`).join(' · ')}. {{token_correlacao}} é obrigatório no corpo.`}
          >
            <textarea
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              required
              rows={6}
              placeholder={'Olá {{cliente_nome}},\n\nPara abrirmos sua empresa precisamos que você envie: {{item_descricao}}.\n\nIdentificador: {{token_correlacao}}'}
            />
          </Field>
          <Button type="submit" loading={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      )}

      {modelos.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum modelo de e-mail cadastrado.</p>
          <p className="text-muted">Crie um modelo padrão para solicitar documentação aos clientes.</p>
        </div>
      ) : (
        <Table>
          <TableHead columns={['Nome', 'Assunto', 'Corpo', 'Checklist vinculado', 'Criado em', '']} />
          <tbody>
            {modelos.map((m) => {
              const checklist = checklistDoModelo(m.id);
              return (
                <tr key={m.id}>
                  {editandoId === m.id ? (
                    <td colSpan={6}>
                      <form
                        className="form-inline"
                        onSubmit={(e) => { e.preventDefault(); handleUpdate(m.id); }}
                      >
                        <Field label="Nome" required>
                          <input value={editandoNome} onChange={(e) => setEditandoNome(e.target.value)} required />
                        </Field>
                        <Field label="Assunto" required>
                          <input value={editandoAssunto} onChange={(e) => setEditandoAssunto(e.target.value)} required />
                        </Field>
                        <Field label="Corpo" required>
                          <textarea value={editandoCorpo} onChange={(e) => setEditandoCorpo(e.target.value)} required rows={5} />
                        </Field>
                        <div>
                          <Button type="submit" size="sm" loading={saving}>Salvar</Button>{' '}
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditandoId(null)}>Cancelar</Button>
                        </div>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td>{m.nome}</td>
                      <td>{m.assunto}</td>
                      <td className="text-muted">{m.corpo.slice(0, 80)}{m.corpo.length > 80 ? '…' : ''}</td>
                      <td>
                        {checklist ? (
                          <span>
                            {checklist.nome}{' '}
                            <Button size="sm" variant="ghost" onClick={() => handleDesvincular(checklist.id)}>desvincular</Button>
                          </span>
                        ) : (
                          <span className="text-muted">nenhum</span>
                        )}
                      </td>
                      <td>{new Date(m.criado_em).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditandoId(m.id);
                              setEditandoNome(m.nome); setEditandoAssunto(m.assunto); setEditandoCorpo(m.corpo);
                            }}
                          >Editar</Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(m.id)}>Excluir</Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {modelos.length > 0 && checklists.length > 0 && (
        <div className="form-inline" style={{ marginTop: '1rem' }}>
          <Field label="Modelo de e-mail" htmlFor="vincular-modelo">
            <select id="vincular-modelo" value={vincularModelo} onChange={(e) => setVincularModelo(e.target.value)}>
              <option value="">Selecione...</option>
              {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </Field>
          <Field label="Vincular ao checklist" htmlFor="vincular-checklist">
            <select id="vincular-checklist" value={vincularChecklist} onChange={(e) => setVincularChecklist(e.target.value)}>
              <option value="">Selecione...</option>
              {checklists.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.email_template_id ? '(já vinculado)' : ''}</option>)}
            </select>
          </Field>
          <Button onClick={handleVincular} loading={saving}>Vincular checklist</Button>
        </div>
      )}
    </div>
  );
}