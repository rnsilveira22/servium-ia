import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Table, TableHead } from '../components/Table';
import { StatusBadge } from '../components/Badge';
import { Card } from '../components/Card';

interface CicloResumo {
  id: string;
  estado: string;
  criado_em: string;
  itens: number;
  resolvidos: number;
  excecoes: number;
}

export function DashboardPage() {
  const [ciclos, setCiclos] = useState<CicloResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([
      api<CicloResumo[]>('/ciclos').catch(() => [] as CicloResumo[]),
    ])
      .then(([c]) => { setCiclos(c); })
      .catch(() => setErro('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, []);

  const ativos = ciclos.filter((c) => c.estado !== 'encerrado');
  const totalItens = ciclos.reduce((s, c) => s + c.itens, 0);
  const totalResolvidos = ciclos.reduce((s, c) => s + c.resolvidos, 0);
  const totalExcecoes = ciclos.reduce((s, c) => s + c.excecoes, 0);

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
