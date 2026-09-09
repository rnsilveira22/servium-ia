import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Table, TableHead } from '../components/Table';

interface CicloDetalhe {
  id: string;
  estado: string;
  criado_em: string;
  encerrado_em: string | null;
  obrigacao_id: string;
  obrigacao: string;
  cliente_id: string;
  cliente: string;
  itens: {
    id: string;
    estado: string;
    tentativas: number;
    descricao: string;
    atualizado_em: string;
    excecao: {
      id: string;
      tipo: string;
      motivo: string;
      contexto: unknown;
      criado_em: string;
    } | null;
  }[];
  comunicacoes: {
    id: string;
    item_ciclo_id: string | null;
    direcao: string;
    canal: string;
    destinatario: string | null;
    remetente: string | null;
    template: string | null;
    status: string;
    criado_em: string;
  }[];
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
}

function formatarData(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
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

function mensagemErro(err: unknown): string {
  const status = (err as { status?: number } | undefined)?.status;
  if (status === 404) return 'Ciclo não encontrado.';
  if (status === 403) return 'Você não tem permissão para ver este ciclo.';
  return 'Não foi possível carregar o ciclo. Tente novamente.';
}

const ESTADO_LABEL: Record<string, string> = {
  aberto: 'Aberto',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

export function CicloDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { sessao } = useAuth();
  const isAdmin = sessao?.papel === 'admin';

  const [ciclo, setCiclo] = useState<CicloDetalhe | null>(null);
  const [excecoes, setExcecoes] = useState<Excecao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ tipo: 'resolvido' | 'cancelado'; itemId: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivoCancel, setMotivoCancel] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setCiclo(null);
    setExcecoes([]);
    setErro('');
    setAviso('');
    setCancelOpen(false);
    Promise.all([
      api<CicloDetalhe>(`/ciclos/${id}`),
      api<Excecao[]>(`/ciclos/${id}/excecoes`).catch(() => [] as Excecao[]),
    ])
      .then(([c, e]) => { setCiclo(c); setExcecoes(e); })
      .catch((err) => {
        console.error('Falha ao carregar o detalhe do ciclo', id, err);
        setErro(mensagemErro(err));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDecidir = async (itemId: string, desfecho: 'resolvido' | 'cancelado') => {
    setErro('');
    setActionLoading(itemId);
    try {
      await api(`/ciclos/itens/${itemId}/decidir`, { method: 'POST', body: { desfecho } });
      setExcecoes((prev) => prev.filter((e) => e.item_id !== itemId));
      setCiclo((prev) => {
        if (!prev) return prev;
        return { ...prev, itens: prev.itens.filter((i) => i.id !== itemId) };
      });
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

  const handleCancelar = async () => {
    if (!ciclo) return;
    setErro('');
    setAviso('');
    setActionLoading('ciclo');
    try {
      await api(`/ciclos/${ciclo.id}/cancelar`, {
        method: 'POST',
        body: motivoCancel.trim() ? { motivo: motivoCancel.trim() } : {},
      });
      setCiclo((prev) => (prev ? { ...prev, estado: 'cancelado', encerrado_em: new Date().toISOString() } : prev));
      setAviso('Ciclo cancelado. O Funcionário Digital não enviará novas comunicações.');
      setCancelOpen(false);
      setMotivoCancel('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cancelar o ciclo');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <div className="page-loading">Carregando...</div>;

  if (erro && !ciclo) return <div className="container"><div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div><Link to="/ciclos" className="link">&larr; Ciclos</Link></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/ciclos" className="link">&larr; Ciclos</Link>
          <h1>{ciclo ? `Ciclo de ${ciclo.cliente} — ${ciclo.obrigacao}` : 'Ciclo'}</h1>
        </div>
      </div>

      {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}
      {aviso && <div className="alert alert-success" role="status" aria-live="polite">{aviso}</div>}

      {ciclo && (
        <>
          <section className="section">
            <h2>Informacoes</h2>
            <Table>
              <tbody>
                <tr>
                  <td className="text-muted">Cliente</td>
                  <td>{ciclo.cliente}</td>
                </tr>
                <tr>
                  <td className="text-muted">Obrigacao</td>
                  <td>{ciclo.obrigacao}</td>
                </tr>
                <tr>
                  <td className="text-muted">Status</td>
                  <td>
                    <span className={`badge badge-${ciclo.estado}`}>{ESTADO_LABEL[ciclo.estado] ?? ciclo.estado}</span>
                    {ciclo.estado === 'aberto' && (
                      <Button
                        variant="danger"
                        size="sm"
                        style={{ marginLeft: '0.75rem' }}
                        loading={actionLoading === 'ciclo'}
                        onClick={() => setCancelOpen(true)}
                      >
                        {actionLoading === 'ciclo' ? 'Cancelando...' : 'Cancelar ciclo'}
                      </Button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Ativado em</td>
                  <td>{formatarData(ciclo.criado_em)}</td>
                </tr>
                {ciclo.encerrado_em && (
                  <tr>
                    <td className="text-muted">Encerrado em</td>
                    <td>{formatarData(ciclo.encerrado_em)}</td>
                  </tr>
                )}
                <tr>
                  <td className="text-muted">ID</td>
                  <td className="text-muted">{ciclo.id}</td>
                </tr>
              </tbody>
            </Table>
          </section>

          <section className="section">
            <h2>Itens ({ciclo.itens.length})</h2>
            {ciclo.itens.length === 0 ? (
              <div className="empty-state"><p>Nenhum item neste ciclo.</p></div>
            ) : (
              <Table>
                <TableHead columns={['Descricao', 'Estado', 'Tentativas', 'Ultima acao']} />
                <tbody>
                  {ciclo.itens.map((item) => (
                    <tr key={item.id}>
                      <td>{item.descricao}</td>
                      <td><span className={`badge badge-${item.estado}`}>{item.estado}</span></td>
                      <td>{item.tentativas}</td>
                      <td>{formatarData(item.atualizado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>

          <section className="section">
            <h2>Comunicacoes ({ciclo.comunicacoes.length})</h2>
            {ciclo.comunicacoes.length === 0 ? (
              <div className="empty-state"><p>Nenhuma comunicacao neste ciclo.</p></div>
            ) : (
              <Table>
                <TableHead columns={['Direcao', 'Canal', 'Status', 'Destinatario / Remetente', 'Data']} />
                <tbody>
                  {ciclo.comunicacoes.map((com) => (
                    <tr key={com.id}>
                      <td>{com.direcao}</td>
                      <td>{com.canal}</td>
                      <td><span className="badge badge-info">{com.status}</span></td>
                      <td>{com.destinatario ?? com.remetente ?? '—'}</td>
                      <td>{formatarData(com.criado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>

          <section className="section">
            <h2>Excecoes ({excecoes.length})</h2>
            {excecoes.length === 0 ? (
              <div className="empty-state"><p>Nenhuma excecao neste ciclo.</p></div>
            ) : (
              <Table>
                <TableHead columns={['Tipo', 'Motivo', 'Contexto', 'Cliente', 'Item', 'Tentativas', 'Data', ...(isAdmin ? [''] : [])]} />
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
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              size="sm"
                              disabled={actionLoading === exc.item_id || ciclo.estado !== 'aberto'}
                              onClick={() => setConfirmAction({ tipo: 'resolvido', itemId: exc.item_id })}
                            >
                              Resolver
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={actionLoading === exc.item_id || ciclo.estado !== 'aberto'}
                              onClick={() => setConfirmAction({ tipo: 'cancelado', itemId: exc.item_id })}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={actionLoading === exc.item_id || ciclo.estado !== 'aberto'}
                              onClick={() => handleReenviar(exc.item_id)}
                            >
                              Reenviar
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>
        </>
      )}

      {confirmAction && (
        <Modal title="Confirmar acao" onClose={() => setConfirmAction(null)}>
          <p>
            Tem certeza que deseja marcar este item como{' '}
            <strong>{confirmAction.tipo === 'resolvido' ? 'resolvido' : 'cancelado'}</strong>?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction(null)}>
              Voltar
            </Button>
            <Button
              size="sm"
              variant={confirmAction.tipo === 'resolvido' ? 'primary' : 'danger'}
              data-autofocus
              loading={!!actionLoading}
              onClick={() => handleDecidir(confirmAction.itemId, confirmAction.tipo)}
            >
              {actionLoading ? 'Processando...' : 'Confirmar'}
            </Button>
          </div>
        </Modal>
      )}

      {cancelOpen && (
        <Modal title="Cancelar ciclo" onClose={() => setCancelOpen(false)}>
          <p>
            Tem certeza que deseja <strong>cancelar</strong> este ciclo? O Funcionário Digital
            não enviará novas comunicações e os itens existentes serão preservados para consulta.
          </p>
          <div className="form-group">
            <label htmlFor="motivo-cancelar">Motivo (opcional)</label>
            <textarea
              id="motivo-cancelar"
              rows={3}
              value={motivoCancel}
              onChange={(e) => setMotivoCancel(e.target.value)}
              placeholder="Ex.: ciclo ativado para a obrigação errada"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" disabled={!!actionLoading} onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              size="sm"
              variant="danger"
              data-autofocus
              loading={actionLoading === 'ciclo'}
              onClick={() => handleCancelar()}
            >
              {actionLoading === 'ciclo' ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
