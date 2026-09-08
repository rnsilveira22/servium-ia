import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Modal } from '../components/Modal';

interface CicloResumo {
  id: string;
  estado: string;
  criado_em: string;
  itens: number;
  resolvidos: number;
  excecoes: number;
}

interface Excecao {
  id: string;
  tipo: string;
  motivo: string;
  contexto: unknown;
  criado_em: string;
  item_id: string;
  tentativas: number;
  item_descricao: string;
  cliente_nome: string;
  ciclo_id: string;
}

function formatarContexto(contexto: unknown): string | null {
  if (contexto === null || contexto === undefined) return null;
  if (typeof contexto === 'string') {
    const limpo = contexto.trim();
    return limpo === '' || limpo === '{}' ? null : limpo;
  }
  if (typeof contexto === 'object') {
    const json = JSON.stringify(contexto);
    return json === '{}' ? null : json;
  }
  return String(contexto);
}

export function ExcecoesPage() {
  const { sessao } = useAuth();
  const isAdmin = sessao?.papel === 'admin';

  const [excecoes, setExcecoes] = useState<Excecao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ tipo: 'resolvido' | 'cancelado'; itemId: string } | null>(null);

  useEffect(() => {
    api<CicloResumo[]>('/ciclos')
      .then(async (ciclos) => {
        const comExcecoes = ciclos.filter((c) => c.excecoes > 0);
        const results = await Promise.all(
          comExcecoes.map((c) =>
            api<Excecao[]>(`/ciclos/${c.id}/excecoes`)
              .then((excs) => excs.map((e) => ({ ...e, ciclo_id: c.id })))
              .catch(() => [] as Excecao[])
          )
        );
        setExcecoes(results.flat());
      })
      .catch(() => setErro('Erro ao carregar excecoes'))
      .finally(() => setLoading(false));
  }, []);

  const handleDecidir = async (itemId: string, desfecho: 'resolvido' | 'cancelado') => {
    setErro('');
    setActionLoading(itemId);
    try {
      await api(`/ciclos/itens/${itemId}/decidir`, { method: 'POST', body: { desfecho } });
      setExcecoes((prev) => prev.filter((e) => e.item_id !== itemId));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao processar acao');
    } finally {
      setActionLoading('');
      setConfirmAction(null);
    }
  };

  const handleReenviar = async (itemId: string) => {
    setErro('');
    setActionLoading(itemId);
    try {
      await api(`/ciclos/itens/${itemId}/reenviar`, { method: 'POST' });
      setExcecoes((prev) => prev.filter((e) => e.item_id !== itemId));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao reenviar');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <div className="page-loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Excecoes</h1>
      </div>

      {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}

      {excecoes.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma excecao registrada.</p>
          <p className="text-muted">Excecoes aparecerao aqui quando itens de ciclos encontrarem problemas.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Contexto</th>
                <th>Cliente</th>
                <th>Item</th>
                <th>Tentativas</th>
                <th>Data</th>
                <th>Ciclo</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {excecoes.map((exc) => (
                <tr key={exc.id}>
                  <td><span className="badge badge-alert">{exc.tipo}</span></td>
                  <td>{exc.motivo}</td>
                  <td>{formatarContexto(exc.contexto)}</td>
                  <td>{exc.cliente_nome}</td>
                  <td>{exc.item_descricao}</td>
                  <td>{exc.tentativas}</td>
                  <td>{new Date(exc.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td><Link to={`/ciclos/${exc.ciclo_id}`} className="link">{exc.ciclo_id.slice(0, 8)}</Link></td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionLoading === exc.item_id}
                          onClick={() => setConfirmAction({ tipo: 'resolvido', itemId: exc.item_id })}
                        >
                          Resolver
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={actionLoading === exc.item_id}
                          onClick={() => setConfirmAction({ tipo: 'cancelado', itemId: exc.item_id })}
                        >
                          Cancelar
                        </button>
                        <button
                          className="btn btn-sm"
                          disabled={actionLoading === exc.item_id}
                          onClick={() => handleReenviar(exc.item_id)}
                        >
                          Reenviar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmAction && (
        <Modal title="Confirmar acao" onClose={() => setConfirmAction(null)}>
          <p>
            Tem certeza que deseja marcar este item como{' '}
            <strong>{confirmAction.tipo === 'resolvido' ? 'resolvido' : 'cancelado'}</strong>?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-sm" onClick={() => setConfirmAction(null)}>
              Voltar
            </button>
            <button
              className={confirmAction.tipo === 'resolvido' ? 'btn btn-primary btn-sm' : 'btn btn-danger btn-sm'}
              data-autofocus
              disabled={!!actionLoading}
              onClick={() => handleDecidir(confirmAction.itemId, confirmAction.tipo)}
            >
              {actionLoading ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
