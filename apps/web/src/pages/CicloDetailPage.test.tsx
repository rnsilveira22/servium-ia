// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CicloDetailPage } from './CicloDetailPage';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ sessao: { operadorId: 'op-1', tenantId: 't-1', papel: 'admin' } }),
}));

const EXCECAO = {
  id: 'exc-1',
  tipo: 'sem_resposta',
  motivo: 'Cliente não respondeu',
  contexto: null,
  item_id: 'it-2',
  tentativas: 3,
  item_descricao: 'Verso da CNH',
  cliente_nome: 'Acme SA',
  criado_em: '2026-08-30T10:00:00Z',
};

const DETALHE = {
  id: 'ciclo-1',
  estado: 'aberto',
  criado_em: '2026-08-30T09:00:00Z',
  encerrado_em: null,
  obrigacao_id: 'obl-1',
  obrigacao: 'Entrega de CTPS',
  cliente_id: 'cli-1',
  cliente: 'Acme SA',
  itens: [
    {
      id: 'it-1',
      descricao: 'Frente da CNH',
      estado: 'cobrado',
      tentativas: 1,
      atualizado_em: '2026-08-30T09:05:00Z',
      excecao: null,
    },
  ],
  comunicacoes: [
    {
      id: 'm-1',
      item_ciclo_id: 'it-1',
      direcao: 'envio',
      canal: 'email',
      destinatario: 'cliente@acme.local',
      remetente: null,
      template: null,
      status: 'enviado',
      criado_em: '2026-08-30T09:05:00Z',
    },
  ],
};

function instalarFetch(
  detalhe: { status: number; body: unknown },
  excecoes: unknown[] = [],
  bloqueiaCiclos = false,
): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const metodo = init?.method ?? 'GET';
      const resposta = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      if (url.includes('/cancelar') && metodo === 'POST') return resposta({ ok: true, cancelado: true });
      if (url.includes('/excecoes')) return resposta(excecoes);
      if (url.includes('/ciclos/')) {
        if (bloqueiaCiclos) return new Promise(() => {});
        return resposta(detalhe.body, detalhe.status);
      }
      return resposta({});
    },
  );
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/ciclos/ciclo-1']}>
      <Routes>
        <Route path="/ciclos/:id" element={<CicloDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CicloDetailPage · detalhe legível', () => {
  it('mostra loading enquanto carrega', () => {
    instalarFetch({ status: 200, body: DETALHE }, [], true);
    renderizar();
    expect(screen.getByText('Carregando...')).toBeTruthy();
  });

  it('renderiza cliente e obrigação como título e dados legíveis', async () => {
    instalarFetch({ status: 200, body: DETALHE });
    renderizar();
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toContain(
      'Ciclo de Acme SA — Entrega de CTPS',
    );
    expect(screen.getByText('Cliente')).toBeTruthy();
    expect(screen.getByText('Acme SA')).toBeTruthy();
    expect(screen.getByText('Obrigacao')).toBeTruthy();
    expect(screen.getByText('Entrega de CTPS')).toBeTruthy();
    expect(screen.getByText('Frente da CNH')).toBeTruthy();
    expect(screen.getByText('cobrado')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('cliente@acme.local')).toBeTruthy();
  });

  it('não usa o UUID como informação principal (título)', async () => {
    instalarFetch({ status: 200, body: DETALHE });
    renderizar();
    const h1 = (await screen.findByRole('heading', { level: 1 })).textContent ?? '';
    expect(h1).not.toMatch(/ciclo-1/);
  });

  it('ciclo sem itens e sem comunicações mostra estado vazio', async () => {
    instalarFetch({
      status: 200,
      body: { ...DETALHE, itens: [], comunicacoes: [] },
    });
    renderizar();
    expect(await screen.findByText('Nenhum item neste ciclo.')).toBeTruthy();
    expect(screen.getByText('Nenhuma comunicacao neste ciclo.')).toBeTruthy();
  });

  it('ciclo inexistente (404) mostra mensagem amigável', async () => {
    instalarFetch({ status: 404, body: { message: 'ciclo não encontrado' } });
    renderizar();
    expect(await screen.findByText('Ciclo não encontrado.')).toBeTruthy();
  });

  it('erro de API mostra mensagem genérica, não erro técnico cru', async () => {
    instalarFetch({ status: 500, body: { message: 'ECONNREFUSED' } });
    renderizar();
    expect(
      await screen.findByText('Não foi possível carregar o ciclo. Tente novamente.'),
    ).toBeTruthy();
    expect(screen.queryByText('ECONNREFUSED')).toBeNull();
  });

  it('exceção aberta é listada com ações de admin', async () => {
    instalarFetch({ status: 200, body: DETALHE }, [EXCECAO]);
    renderizar();
    expect(await screen.findByText('sem_resposta')).toBeTruthy();
    expect(screen.getByText('Cliente não respondeu')).toBeTruthy();
    expect(screen.getByText('Resolver')).toBeTruthy();
    expect(screen.getByText('Reenviar')).toBeTruthy();
  });

  it('#73: exibe botão "Cancelar ciclo" quando aberto e cancela com confirmação + feedback', async () => {
    instalarFetch({ status: 200, body: DETALHE });
    renderizar();
    const botao = await screen.findByRole('button', { name: 'Cancelar ciclo' });
    expect(botao).toBeTruthy();

    botao.click();
    expect(await screen.findByRole('heading', { name: 'Cancelar ciclo' })).toBeTruthy();

    const confirmar = screen.getByRole('button', { name: 'Confirmar cancelamento' });
    confirmar.click();

    expect(await screen.findByText(/ciclo cancelado/i)).toBeTruthy();
    await screen.findByText('Cancelado');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancelar ciclo' })).toBeNull());
  });

  it('#73: não exibe "Cancelar ciclo" e desabilita ações quando cancelado', async () => {
    const cancelado = { ...DETALHE, estado: 'cancelado', encerrado_em: '2026-08-30T12:00:00Z' };
    instalarFetch({ status: 200, body: cancelado }, [EXCECAO]);
    renderizar();
    expect(await screen.findByText('Cancelado')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar ciclo' })).toBeNull();
    expect((screen.getByText('Resolver') as HTMLButtonElement).closest('button')?.disabled).toBe(true);
    expect((screen.getByText('Reenviar') as HTMLButtonElement).closest('button')?.disabled).toBe(true);
  });
});