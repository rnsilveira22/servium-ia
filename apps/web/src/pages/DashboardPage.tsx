import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Table, TableHead } from '../components/Table';
import { StatusBadge } from '../components/Badge';
import { Card } from '../components/Card';
import { SemaforoBadge, type Semaforo } from '../components/SemaforoBadge';

interface CicloResumo {
  id: string;
  estado: string;
  criado_em: string;
  itens: number;
  resolvidos: number;
  excecoes: number;
}

interface ClientePainel {
  cliente_id: string;
  cliente: string;
  semaforo: Semaforo;
  motivo: string;
  pendentes: number;
  excecoes: number;
  prazo_proximo: string | null;
}

function formatarPrazo(prazo: string | null): string {
  if (!prazo) return '—';
  const [ano, mes, dia] = prazo.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function DashboardPage() {
  const [ciclos, setCiclos] = useState<CicloResumo[]>([]);
  const [clientes, setClientes] = useState<ClientePainel[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([
      api<CicloResumo[]>('/ciclos').catch(() => [] as CicloResumo[]),
      api<ClientePainel[]>('/ciclos/painel').catch(() => [] as ClientePainel[]),
    ])
      .then(([c, p]) => {
        setCiclos(c);
        setClientes(p);
      })
      .catch(() => setErro('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, []);

  const ativos = ciclos.filter((c) => c.estado !== 'encerrado');
  const totalItens = ciclos.reduce((s, c) => s + c.itens, 0);
  const totalResolvidos = ciclos.reduce((s, c) => s + c.resolvidos, 0);
  const totalExcecoes = ciclos.reduce((s, c) => s + c.excecoes, 0);
  const emAtencao = clientes.filter((c) => c.semaforo === 'vermelho').length;

  if (loading) return <div className="page-loading">Carregando...</div>;
  if (erro) return <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>;

  return (
    <div>
      <h1>Painel</h1>
      <div className="cards-grid">
        <Card value={ativos.length} label="Ciclos ativos" />
        <Card value={totalItens - totalResolvidos} label="Itens pendentes" />
        <Card value={totalResolvidos} label="Concluidos" />
        <Card value={totalExcecoes} label="Excecoes abertas" alert />
      </div>

      {clientes.length > 0 && (
        <section className="section" aria-labelledby="painel-clientes-titulo">
          <h2 id="painel-clientes-titulo">
            Clientes{emAtencao > 0 ? ` — ${emAtencao} ${emAtencao === 1 ? 'precisa' : 'precisam'} de atenção hoje` : ''}
          </h2>
          <Table>
            <TableHead columns={['Situação', 'Cliente', 'O que falta', 'Prazo', '']} />
            <tbody>
              {clientes.map((c) => (
                <tr key={c.cliente_id} data-semaforo={c.semaforo}>
                  <td><SemaforoBadge semaforo={c.semaforo} /></td>
                  <td>{c.cliente}</td>
                  <td className="painel-clientes-motivo">{c.motivo}</td>
                  <td>{formatarPrazo(c.prazo_proximo)}</td>
                  <td>
                    {c.excecoes > 0 && <Link to="/excecoes" className="link">Decidir</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      {ciclos.length > 0 && (
        <section className="section">
          <h2>Ciclos recentes</h2>
          <Table>
            <TableHead columns={['Estado', 'Itens', 'Resolvidos', 'Excecoes', 'Criado em', '']} />
            <tbody>
              {ciclos.slice(0, 10).map((c) => (
                <tr key={c.id}>
                  <td><StatusBadge estado={c.estado} /></td>
                  <td>{c.itens}</td>
                  <td>{c.resolvidos}</td>
                  <td>{c.excecoes > 0 ? <span className="badge badge-alert">{c.excecoes}</span> : '0'}</td>
                  <td>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td><Link to={`/ciclos/${c.id}`} className="link">Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      {ciclos.length === 0 && (
        <div className="empty-state">
          <p>Nenhum ciclo registrado ainda.</p>
          <Link to="/ciclos" className="btn btn-primary">Criar primeiro ciclo</Link>
        </div>
      )}
    </div>
  );
}
