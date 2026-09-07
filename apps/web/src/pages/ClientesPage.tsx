import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { ClienteDTO } from '@servium-ia/shared-types';

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
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo Cliente'}
        </button>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}

      {showForm && (
        <form className="form-inline" onSubmit={handleCreate}>
          <label className="field">
            <span>Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className="field">
            <span>Identificacao (CPF/CNPJ)</span>
            <input value={identificacao} onChange={(e) => setIdentificacao(e.target.value)} />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}

      {clientes.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum cliente cadastrado.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Cadastrar primeiro cliente</button>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Identificacao</th>
              <th>E-mail</th>
              <th>Criado em</th>
            </tr>
          </thead>
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
        </table>
      )}
    </div>
  );
}
