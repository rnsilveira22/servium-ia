// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExcecoesPage } from './ExcecoesPage';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ sessao: { operadorId: 'op-1', tenantId: 't-1', papel: 'admin' } }),
}));

const CICLOS = [
  { id: 'c-1', estado: 'aberto', criado_em: '2026-08-30T09:00:00Z', itens: 2, resolvidos: 1, excecoes: 1 },
];

const EXCECAO = [
  {
    id: 'exc-1',
    tipo: 'sem_resposta',
    motivo: 'Cliente não respondeu',
    contexto: { passo: 'segundo_envio', canal: 'email' },
    criado_em: '2026-08-30T10:00:00Z',
    item_id: 'it-2',
    tentativas: 3,
    item_descricao: 'Verso da CNH',
    cliente_nome: 'Acme SA',
  },
];

function instalarFetch() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const resposta = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      if (method === 'GET' && url.endsWith('/ciclos')) return resposta(CICLOS);
      if (method === 'GET' && url.includes('/excecoes')) return resposta(EXCECAO);
      return resposta({});
    },
  );
}

describe('ExcecoesPage · modal acessível e contexto (#94)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('exceção com contexto é renderizada', async () => {
    instalarFetch();
    render(
      <MemoryRouter>
        <ExcecoesPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('{"passo":"segundo_envio","canal":"email"}')).toBeTruthy();
  });

  it('modal de confirmação tem role dialog + aria-modal e fecha com Escape', async () => {
    instalarFetch();
    render(
      <MemoryRouter>
        <ExcecoesPage />
      </MemoryRouter>,
    );

    const resolver = await screen.findByRole('button', { name: 'Resolver' });
    resolver.click();

    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});