import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { motivoExcecaoEmLinguagem } from '../labels';

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

type AcaoExcecao = 'resolver' | 'cancelar' | 'reenviar';

interface Confirmacao {
  acao: AcaoExcecao;
  itemId: string;
  itemDescricao: string;
}

const CONFIRMACAO: Record<AcaoExcecao, { titulo: string; botao: string; perigo?: boolean }> = {
  resolver: { titulo: 'Resolver item', botao: 'Confirmar conclusão' },
  cancelar: { titulo: 'Cancelar item', botao: 'Confirmar cancelamento', perigo: true },
  reenviar: { titulo: 'Reenviar solicitação', botao: 'Confirmar reenvio' },
};

function consequencia(acao: AcaoExcecao, descricao: string): string {
  if (acao === 'resolver') {
    return `O item "${descricao}" será marcado como Concluído. A Funcionária Digital não enviará novas solicitações para este item.`;
  }
  if (acao === 'cancelar') {
    return `O item "${descricao}" será marcado como Cancelado. Nenhuma nova solicitação será enviada e o item sai do acompanhamento.`;
  }
  return `A Funcionária Digital enviará uma nova solicitação ao cliente para o item "${descricao}". Se as tentativas se esgotarem novamente, o item voltará a aparecer aqui.`;
}

export function ExcecoesPage() {
  const { sessao } = useAuth();
  const isAdmin = sessao?.papel === 'admin';

  const [excecoes, setExcecoes] = useState<Excecao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    api<CicloResumo[]>('/ciclos')
      .then(async (ciclos) => {
        const comExcecoes = ciclos.filter((c) => c.excecoes > 0);
        const resultados = await Promise.all(
          comExcecoes.map((c) =>
            api<Excecao[]>(`/ciclos/${c.id}/excecoes`)
              .then((excs) => excs.map((e) => ({ ...e, ciclo_id: c.id })))
              .catch(() => [] as Excecao[])
          )
        );
        setExcecoes(resultados.flat());
      })
      .catch(() => setErro('Não foi possível carregar as exceções. Tente novamente.'))
      .finally(() => setLoading(false));
  }, []);

  const executarAcao = async () => {
    if (!confirmacao) return;
    const { acao, itemId } = confirmacao;
    setErro('');
    setAviso('');
    setActionLoading(acao);
    try {
      if (acao === 'resolver' || acao === 'cancelar') {
        await api(`/ciclos/itens/${itemId}/decidir`, {
          method: 'POST',
          body: { desfecho: acao === 'resolver' ? 'resolvido' : 'cancelado' },
        });
      } else {
        await api(`/ciclos/itens/${itemId}/reenviar`, { method: 'POST' });
      }
      setExcecoes((prev) => prev.filter((e) => e.item_id !== itemId));
      setAviso(
        acao === 'resolver'
          ? 'Item concluído. A exceção foi resolvida.'
          : acao === 'cancelar'
            ? 'Item cancelado. Nenhuma nova solicitação será enviada.'
            : 'Solicitação reenviada. A Funcionária Digital voltou a trabalhar no item.'
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir a ação.');
    } finally {
      setActionLoading('');
      setConfirmacao(null);
    }
  };

  if (loading) return <div className="page-loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Exceções</h1>
      </div>

      {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}
      {aviso && <div className="alert alert-success" role="status" aria-live="polite">{aviso}</div>}

      {excecoes.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma exceção registrada.</p>
          <p className="text-muted">
            Exceções aparecem aqui quando a Funcionária Digital precisa de atenção para concluir um item.
          </p>
        </div>
      ) : (
        excecoes.map((exc) => {
          const motivo = motivoExcecaoEmLinguagem(exc.tipo, exc.tentativas);
          const contextoJson =
            exc.contexto === undefined || exc.contexto === null
              ? ''
              : typeof exc.contexto === 'string'
                ? exc.contexto
                : JSON.stringify(exc.contexto);
          return (
            <section key={exc.id} className="card excecao-card">
              <div className="excecao-card-header">
                <div>
                  <h2 className="excecao-titulo">{exc.cliente_nome}</h2>
                  <p className="text-muted">{exc.item_descricao}</p>
                </div>
                <Badge tone="alert">{motivo.rotulo}</Badge>
              </div>

              <p className="excecao-explicacao">{motivo.explicacao}</p>

              <dl className="excecao-detalhes">
                <div>
                  <dt>Solicitações enviadas</dt>
                  <dd>{exc.tentativas}</dd>
                </div>
                <div>
                  <dt>Data da exceção</dt>
                  <dd>{new Date(exc.criado_em).toLocaleDateString('pt-BR')}</dd>
                </div>
                <div>
                  <dt>Acompanhamento</dt>
                  <dd>
                    <Link to={`/ciclos/${exc.ciclo_id}`} className="link">Abrir ciclo</Link>
                  </dd>
                </div>
              </dl>

              {isAdmin && (
                <div className="excecao-acoes">
                  <Button
                    size="sm"
                    disabled={!!actionLoading}
                    onClick={() => setConfirmacao({ acao: 'resolver', itemId: exc.item_id, itemDescricao: exc.item_descricao })}
                  >
                    Resolver
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!!actionLoading}
                    onClick={() => setConfirmacao({ acao: 'reenviar', itemId: exc.item_id, itemDescricao: exc.item_descricao })}
                  >
                    Reenviar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={!!actionLoading}
                    onClick={() => setConfirmacao({ acao: 'cancelar', itemId: exc.item_id, itemDescricao: exc.item_descricao })}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              <details className="excecao-tecnico">
                <summary>Ver detalhes técnicos</summary>
                {contextoJson && <pre>{contextoJson}</pre>}
                {exc.motivo && (
                  <p className="text-muted">Registro interno: {exc.motivo}</p>
                )}
              </details>
            </section>
          );
        })
      )}

      {confirmacao && (
        <Modal title={CONFIRMACAO[confirmacao.acao].titulo} onClose={() => !actionLoading && setConfirmacao(null)}>
          <p>{consequencia(confirmacao.acao, confirmacao.itemDescricao)}</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" disabled={!!actionLoading} onClick={() => setConfirmacao(null)}>
              Voltar
            </Button>
            <Button
              size="sm"
              variant={CONFIRMACAO[confirmacao.acao].perigo ? 'danger' : 'primary'}
              data-autofocus
              loading={actionLoading === confirmacao.acao}
              onClick={executarAcao}
            >
              {actionLoading ? 'Processando...' : CONFIRMACAO[confirmacao.acao].botao}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}