// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';

const CICLOS = [
  { id: 'c-1', estado: 'aberto', criado_em: '2026-10-20T09:00:00Z', itens: 4, resolvidos: 2, excecoes: 1 },
];

const PAINEL = [
  {
    cliente_id: 'cli-1',
    cliente: 'Acme SA',
    semaforo: 'vermelho',
    motivo: '1 exceção aguardando sua decisão; prazo em 2 dias',
    pendentes: 1,
    excecoes: 1,
    prazo_proximo: '2026-10-28',
  },
  {
    cliente_id: 'cli-2',
    cliente: 'Padaria Boa Massa',
    semaforo: 'verde',
    motivo: 'Tudo em dia',
    pendentes: 0,
    excecoes: 0,
    prazo_proximo: null,
  },
];

function instalarFetch(painel: unknown = PAINEL) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const corpo = url.endsWith('/ciclos/painel') ? painel : CICLOS;
    return new Response(JSON.stringify(corpo), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

function renderizar() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage — painel por cliente', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('mostra cada cliente com semáforo em texto, motivo e prazo formatado', async () => {
    instalarFetch();
    renderizar();

    await waitFor(() => expect(screen.getByText('Acme SA')).toBeTruthy());
    expect(screen.getByText('Atenção')).toBeTruthy();
    expect(screen.getByText('Em dia')).toBeTruthy();
    expect(screen.getByText('1 exceção aguardando sua decisão; prazo em 2 dias')).toBeTruthy();
    expect(screen.getByText('28/10/2026')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /1 precisa de atenção hoje/ })).toBeTruthy();
  });

  it('oferece o atalho "Decidir" apenas para clientes com exceção', async () => {
    instalarFetch();
    renderizar();

    await waitFor(() => expect(screen.getByText('Acme SA')).toBeTruthy());
    const links = screen.getAllByRole('link', { name: 'Decidir' });
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute('href')).toBe('/excecoes');
  });

  it('não renderiza a seção de clientes quando o painel vem vazio', async () => {
    instalarFetch([]);
    renderizar();

    await waitFor(() => expect(screen.getByText('Ciclos recentes')).toBeTruthy());
    expect(screen.queryByText(/Clientes/)).toBeNull();
  });
});
