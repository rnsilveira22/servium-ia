import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card } from '../components/Card';
import { Table, TableHead } from '../components/Table';
import { Skeleton } from '../components/Skeleton';

interface Metrics {
  totalClientes?: number;
  totalObrigacoes?: number;
  ciclosAtivos?: number;
  excecoesAbertas?: number;
  [key: string]: unknown;
}

interface Health {
  status: string;
  uptime?: number;
  timestamp?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export function AuditoriaPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);
  const [errorHealth, setErrorHealth] = useState<string | null>(null);

  useEffect(() => {
    api<Metrics>('/metrics')
      .then(setMetrics)
      .catch((e: Error) => setErrorMetrics(e.message))
      .finally(() => setLoadingMetrics(false));

    api<Health>('/health')
      .then(setHealth)
      .catch((e: Error) => setErrorHealth(e.message))
      .finally(() => setLoadingHealth(false));
  }, []);

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}min`;
  };

  const formatValue = (val: unknown) => {
    if (typeof val === 'number') return val.toLocaleString('pt-BR');
    if (typeof val === 'boolean') return val ? 'Sim' : 'Nao';
    if (val === null || val === undefined) return '-';
    return String(val);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Auditoria</h1>
      </div>

      <section className="section">
        <h2>Metricas</h2>
        {loadingMetrics && (
          <div className="cards-grid" aria-label="Carregando metricas" role="status">
            <Card label={<Skeleton width="70%" />} value={<Skeleton width="40%" height="1.5rem" />} />
            <Card label={<Skeleton width="70%" />} value={<Skeleton width="40%" height="1.5rem" />} />
            <Card label={<Skeleton width="70%" />} value={<Skeleton width="40%" height="1.5rem" />} />
            <Card label={<Skeleton width="70%" />} value={<Skeleton width="40%" height="1.5rem" />} />
          </div>
        )}
        {errorMetrics && <div className="alert alert-error" role="alert" aria-live="assertive">{errorMetrics}</div>}
        {metrics && (
          <div className="cards-grid">
            {Object.entries(metrics).map(([key, value]) => (
              <Card key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')} value={formatValue(value)} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Saude do Sistema</h2>
        {loadingHealth && <div className="loading">Verificando saude...</div>}
        {errorHealth && <div className="alert alert-error" role="alert" aria-live="assertive">{errorHealth}</div>}
        {health && (
          <Table>
            <TableHead columns={['Propriedade', 'Valor']} />
            <tbody>
              <tr>
                <td>Status</td>
                <td>
                  <span className={`badge badge-${health.status === 'ok' ? 'ativo' : 'encerrado'}`}>
                    {health.status}
                  </span>
                </td>
              </tr>
              {health.uptime !== undefined && (
                <tr>
                  <td>Uptime</td>
                  <td>{formatUptime(health.uptime)}</td>
                </tr>
              )}
              {health.timestamp && (
                <tr>
                  <td>Timestamp</td>
                  <td>{new Date(health.timestamp).toLocaleString('pt-BR')}</td>
                </tr>
              )}
              {health.correlationId && (
                <tr>
                  <td>Correlation ID</td>
                  <td><code>{health.correlationId}</code></td>
                </tr>
              )}
              {Object.entries(health)
                .filter(([k]) => !['status', 'uptime', 'timestamp', 'correlationId'].includes(k))
                .map(([key, value]) => (
                  <tr key={key}>
                    <td>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</td>
                    <td>{formatValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
