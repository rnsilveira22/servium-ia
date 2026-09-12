// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExcecoesPage } from './ExcecoesPage';

let mockPapel = 'admin';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ sessao: { operadorId: 'op-1', tenantId: 't-1', papel: mockPapel } }),
}));

const CICLOS = [
  { id: 'c-1', estado: 'aberto', criado_em: '2026-08-30T09:00:00Z', itens: 2, resolvidos: 1, excecoes: 1 },
];

const EXCECAO = {
  id: 'exc-1',
  tipo: 'escalada_limite',
  motivo: 'tentativas sociais esgotadas (3/3)',
  contexto: { passo: 'segundo_envio', canal: 'email' },
  criado_em: '2026-08-30T10:00:00Z',
  item_id: 'it-2',
  tentativas: 3,
  item_descricao: 'Verso da CNH',
  cliente_nome: 'Acme SA',
};

interface Chamada {
  url: string;
  method?: string;
  body?: unknown;
}

function instalarFetch(chamadas: Chamada[] = []): Chamada[] {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      chamadas.push({ url, method, body: init?.body });
      const resposta = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      if (method === 'GET' && url.endsWith('/ciclos')) return resposta(CICLOS);
      if (method === 'GET' && url.includes('/excecoes')) return resposta([EXCECAO]);
      if (method === 'POST' && url.includes('/decidir')) return resposta({ ok: true });
      if (method === 'POST' && url.includes('/reenviar')) return resposta({ ok: true });
      return resposta({});
    },
  );
  return chamadas;
}

function renderizar() {
  return render(
    <MemoryRouter>
      <ExcecoesPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockPapel = 'admin';
});

function soNoDetalheTecnico(texto: string | RegExp): void {
  for (const el of screen.queryAllByText(texto)) {
    expect(el.closest('.excecao-tecnico')).not.toBeNull();
  }
}

describe('ExcecoesPage · exceções explicadas + ações com confirmação (M1-UI-05)', () => {
  it('explica o motivo em linguagem de negócio e NUNCA mostra JSON cru como linguagem principal', async () => {
    instalarFetch();
    renderizar();

    expect(await screen.findByText('Tentativas esgotadas')).toBeTruthy();
    expect(screen.getByText('Nenhuma resposta após 3 tentativas.')).toBeTruthy();
    expect(screen.getByText('Verso da CNH')).toBeTruthy();
    expect(screen.getByText('Acme SA')).toBeTruthy();

    soNoDetalheTecnico(/segundo_envio/);
    soNoDetalheTecnico(/tentativas sociais esgotadas/);
  });

  it('detalhe técnico fica colapsável (DUX-01) e só aparece após expandir', async () => {
    instalarFetch();
    renderizar();
    await screen.findByText('Tentativas esgotadas');

    const pre = screen.getByText(/segundo_envio/);
    const detalhe = pre.closest('details') as HTMLDetailsElement | null;
    expect(detalhe).not.toBeNull();
    expect(detalhe!.hasAttribute('open')).toBe(false);

    fireEvent.click(screen.getByText('Ver detalhes técnicos'));

    await waitFor(() => expect(detalhe!.open).toBe(true));
    expect(screen.getByText(/tentativas sociais esgotadas/)).toBeTruthy();
  });

  it('#94: modal de confirmação é acessível e fecha com Escape; ação NÃO executa antes da confirmação', async () => {
    const chamadas = instalarFetch();
    renderizar();

    const resolver = await screen.findByRole('button', { name: 'Resolver' });
    resolver.click();

    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getByText(/marcado como Concluído/i)).toBeTruthy();

    expect(chamadas.some((c) => c.method === 'POST' && c.url.includes('/decidir'))).toBe(false);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(chamadas.some((c) => c.method === 'POST' && c.url.includes('/decidir'))).toBe(false);
  });

  it('Resolvido: confirmação executa decidir (persistido) e a UI reflete a remoção da exceção', async () => {
    const chamadas = instalarFetch();
    renderizar();

    const resolver = await screen.findByRole('button', { name: 'Resolver' });
    resolver.click();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar conclusão' }));

    expect(await screen.findByText('Item concluído. A exceção foi resolvida.')).toBeTruthy();

    const post = chamadas.find((c) => c.method === 'POST' && c.url.includes('/decidir'));
    expect(post).toBeDefined();
    expect(post!.url).toContain('/ciclos/itens/it-2/decidir');
    expect(JSON.parse(String(post!.body))).toEqual({ desfecho: 'resolvido' });

    await waitFor(() => expect(screen.getByText('Nenhuma exceção registrada.')).toBeTruthy());
    expect(screen.queryByText('Tentativas esgotadas')).toBeNull();
  });

  it('Cancelar: modal explica a consequência e confirmação envia desfecho cancelado', async () => {
    const chamadas = instalarFetch();
    renderizar();

    const cancelar = await screen.findByRole('button', { name: 'Cancelar' });
    cancelar.click();

    expect(await screen.findByText(/marcado como Cancelado/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));

    expect(await screen.findByText('Item cancelado. Nenhuma nova solicitação será enviada.')).toBeTruthy();
    const post = chamadas.find((c) => c.method === 'POST' && c.url.includes('/decidir'));
    expect(JSON.parse(String(post!.body))).toEqual({ desfecho: 'cancelado' });
    await waitFor(() => expect(screen.getByText('Nenhuma exceção registrada.')).toBeTruthy());
  });

  it('Reenviar: só executa após confirmação e reenvia via endpoint', async () => {
    const chamadas = instalarFetch();
    renderizar();

    const reenviar = await screen.findByRole('button', { name: 'Reenviar' });
    reenviar.click();

    expect(await screen.findByText(/enviará uma nova solicitação ao cliente/i)).toBeTruthy();

    expect(chamadas.some((c) => c.method === 'POST' && c.url.includes('/reenviar'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reenvio' }));

    expect(await screen.findByText(/Solicitação reenviada\./)).toBeTruthy();
    const post = chamadas.find((c) => c.method === 'POST' && c.url.includes('/reenviar'));
    expect(post).toBeDefined();
    expect(post!.url).toContain('/ciclos/itens/it-2/reenviar');
    await waitFor(() => expect(screen.getByText('Nenhuma exceção registrada.')).toBeTruthy());
  });

  it('erro de API pós-ação é exibido de forma legível', async () => {
    const chamadas: Chamada[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        chamadas.push({ url, method, body: init?.body });
        const resposta = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        if (method === 'GET' && url.endsWith('/ciclos')) return resposta(CICLOS);
        if (method === 'GET' && url.includes('/excecoes')) return resposta([EXCECAO]);
        if (method === 'POST' && url.includes('/decidir')) {
          return resposta({ message: 'item não está em exceção' }, 400);
        }
        return resposta({});
      },
    );
    renderizar();

    const resolver = await screen.findByRole('button', { name: 'Resolver' });
    resolver.click();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar conclusão' }));

    expect(await screen.findByText('item não está em exceção')).toBeTruthy();
    expect(screen.getByText('Tentativas esgotadas')).toBeTruthy();
  });

  it('operador comum visualiza exceções com aviso orientativo e sem botões de ação', async () => {
    mockPapel = 'operador';
    instalarFetch();
    renderizar();

    expect(await screen.findByText('Tentativas esgotadas')).toBeTruthy();
    expect(screen.getByText('Apenas administradores podem decidir ou reenviar exceções.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Resolver' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reenviar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
  });
});