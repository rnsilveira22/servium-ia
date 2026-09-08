import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ClienteDTO, ObrigacaoDTO } from '@servium-ia/shared-types';

interface CicloResumo {
  id: string;
  estado: string;
  criado_em: string;
  obrigacao: string;
  cliente: string;
  itens: number;
  resolvidos: number;
  excecoes: number;
}

export function CiclosPage() {
  const [ciclos, setCiclos] = useState<CicloResumo[]>([]);
  const [obrigacoes, setObrigacoes] = useState<ObrigacaoDTO[]>([]);
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ativando, setAtivando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [obrigacaoId, setObrigacaoId] = useState('');

  const load = () => {
    Promise.all([
      api<CicloResumo[]>('/ciclos'),
      api<ObrigacaoDTO[]>('/obrigacoes').catch(() => [] as ObrigacaoDTO[]),
      api<ClienteDTO[]>('/clientes').catch(() => [] as ClienteDTO[]),
    ])
      .then(([c, o, cl]) => { setCiclos(c); setObrigacoes(o); setClientes(cl); })
      .catch(() => setErro('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const clienteNome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? id;

  const obrigacaoSelecionada = obrigacoes.find((o) => o.id === obrigacaoId);

  const handleAtivar = async () => {
    setErro('');
    setAviso('');
    if (!obrigacaoId) {
      setErro('Selecione uma obrigação para ativar o ciclo.');
      return;
    }
    setAtivando(true);
    try {
      await api('/ciclos', { method: 'POST', body: { obrigacao_id: obrigacaoId } });
      setAviso(`Ciclo ativado para "${obrigacaoSelecionada?.descricao ?? 'obrigação selecionada'}".`);
      setObrigacaoId('');
      setShowForm(false);
      load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível ativar o ciclo.');
    } finally {
      setAtivando(false);
    }
  };

  if (loading) return <div className="page-loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Ciclos</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Ativar Ciclo'}
        </button>
      </div>

      {aviso && <div className="alert alert-success" role="status" aria-live="polite">{aviso}</div>}
      {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}

      {showForm && (
        <div className="form-inline">
          {obrigacoes.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma obrigação disponível para ativar um ciclo.</p>
              <p className="text-muted">Cadastre uma obrigação primeiro para ativar um ciclo.</p>
            </div>
          ) : (
            <>
              <label className="field">
                <span>Obrigação</span>
                <select value={obrigacaoId} onChange={(e) => setObrigacaoId(e.target.value)}>
                  <option value="">Selecione uma obrigação...</option>
                  {obrigacoes.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.descricao} — {clienteNome(o.cliente_id)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" onClick={handleAtivar} disabled={ativando}>
                {ativando ? 'Ativando...' : 'Ativar ciclo'}
              </button>
            </>
          )}
        </div>
      )}

      {ciclos.length === 0 && !showForm ? (
        <div className="empty-state">
          <p>Nenhum ciclo registrado.</p>
          <p className="text-muted">Clique em “+ Ativar Ciclo” para iniciar o monitoramento de uma obrigação.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Obrigação</th>
                <th>Estado</th>
                <th>Itens</th>
                <th>Resolvidos</th>
                <th>Excecoes</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ciclos.map((c) => (
                <tr key={c.id}>
                  <td>{c.cliente}</td>
                  <td>{c.obrigacao}</td>
                  <td><span className={`badge badge-${c.estado}`}>{c.estado}</span></td>
                  <td>{c.itens}</td>
                  <td>{c.resolvidos}</td>
                  <td>{c.excecoes > 0 ? <span className="badge badge-alert">{c.excecoes}</span> : '0'}</td>
                  <td>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td><Link to={`/ciclos/${c.id}`} className="link">Detalhes</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}