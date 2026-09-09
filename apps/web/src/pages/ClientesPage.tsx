import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { ClienteDTO } from '@servium-ia/shared-types';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Table, TableHead } from '../components/Table';

export function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [identificacao, setIdentificacao] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api<ClienteDTO[]>('/clientes')
      .then(setClientes)
      .catch(() => setErro('Erro ao carregar clientes'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setSaving(true);
    try {
      await api('/clientes', { method: 'POST', body: { nome, identificacao: identificacao || undefined, email: email || undefined } });
      setNome(''); setIdentificacao(''); setEmail('');
      setShowForm(false);
      load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar cliente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo Cliente'}
        </Button>
      </div>

      {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}

      {showForm && (
        <form className="form-inline" onSubmit={handleCreate}>
          <Field label="Nome" required>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </Field>
          <Field label="Identificacao (CPF/CNPJ)">
            <input value={identificacao} onChange={(e) => setIdentificacao(e.target.value)} />
          </Field>
          <Field label="E-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" loading={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      )}

      {clientes.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum cliente cadastrado.</p>
          <Button onClick={() => setShowForm(true)}>Cadastrar primeiro cliente</Button>
        </div>
      ) : (
        <Table>
          <TableHead columns={['Nome', 'Identificacao', 'E-mail', 'Criado em']} />
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.identificacao ?? '-'}</td>
                <td>{c.email ?? '-'}</td>
                <td>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
