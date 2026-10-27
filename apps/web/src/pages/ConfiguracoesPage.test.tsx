// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfiguracoesPage } from './ConfiguracoesPage';

let papel: 'admin' | 'operador' = 'admin';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ sessao: { operadorId: 'op-1', tenantId: 't-1', papel } }),
}));

const PADRAO = { ativo: false, hora: 8, enviar_vazio: false };

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Instala um fetch falso e devolve as chamadas feitas (url + método + corpo). */
function instalarFetch(resposta: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => resposta(String(input), init));
}

function chamadas(spy: ReturnType<typeof instalarFetch>) {
  return spy.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: init?.method ?? 'GET',
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  }));
}

describe('ConfiguracoesPage · resumo diário (VP-02 CA-07)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    papel = 'admin';
  });

  it('carrega a configuração atual e mostra o botão Salvar desabilitado enquanto nada mudou', async () => {
    instalarFetch(() => json({ ativo: true, hora: 7, enviar_vazio: true }));
    render(<ConfiguracoesPage />);

    await waitFor(() => expect(screen.getByLabelText('Enviar resumo diário')).toBeTruthy());
    expect((screen.getByLabelText('Enviar resumo diário') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Horário de envio/) as HTMLSelectElement).value).toBe('7');
    expect((screen.getByLabelText('Enviar também quando estiver tudo em dia') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('oferece as 24 horas e informa que o horário é o de Brasília', async () => {
    instalarFetch(() => json(PADRAO));
    render(<ConfiguracoesPage />);

    await waitFor(() => expect(screen.getByLabelText(/Horário de envio/)).toBeTruthy());
    const opcoes = Array.from((screen.getByLabelText(/Horário de envio/) as HTMLSelectElement).options).map((o) => o.text);
    expect(opcoes).toHaveLength(24);
    expect(opcoes[0]).toBe('00:00');
    expect(opcoes[8]).toBe('08:00');
    expect(opcoes[23]).toBe('23:00');
    expect(screen.getByText('Horário de Brasília.')).toBeTruthy();
  });

  it('salva só após alteração, envia o corpo completo por PUT e confirma', async () => {
    const spy = instalarFetch((_url, init) =>
      init?.method === 'PUT' ? json({ ativo: true, hora: 9, enviar_vazio: false }) : json(PADRAO),
    );
    render(<ConfiguracoesPage />);
    await waitFor(() => expect(screen.getByLabelText('Enviar resumo diário')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Enviar resumo diário'));
    fireEvent.change(screen.getByLabelText(/Horário de envio/), { target: { value: '9' } });
    const salvar = screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement;
    expect(salvar.disabled).toBe(false);
    fireEvent.click(salvar);

    await waitFor(() => expect(screen.getByText('Configuração salva.')).toBeTruthy());
    const put = chamadas(spy).find((c) => c.method === 'PUT');
    expect(put?.url).toContain('/configuracoes/resumo-diario');
    expect(put?.body).toEqual({ ativo: true, hora: 9, enviar_vazio: false });
    expect((screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('mostra o erro da API ao falhar e mantém o botão habilitado para tentar de novo', async () => {
    instalarFetch((_url, init) =>
      init?.method === 'PUT' ? json({ message: 'hora deve ser um inteiro entre 0 e 23' }, 400) : json(PADRAO),
    );
    render(<ConfiguracoesPage />);
    await waitFor(() => expect(screen.getByLabelText('Enviar resumo diário')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Enviar resumo diário'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('hora deve ser um inteiro entre 0 e 23'));
    expect(screen.queryByText('Configuração salva.')).toBeNull();
    expect((screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('mostra erro de carregamento sem exibir o formulário', async () => {
    instalarFetch(() => json({ message: 'Erro 500' }, 500));
    render(<ConfiguracoesPage />);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Erro 500'));
    expect(screen.queryByLabelText('Enviar resumo diário')).toBeNull();
  });

  it('operador não vê o formulário e a tela nem chama a API', async () => {
    papel = 'operador';
    const spy = instalarFetch(() => json(PADRAO));
    render(<ConfiguracoesPage />);

    expect(screen.getByText(/Somente administradores/)).toBeTruthy();
    expect(screen.queryByLabelText('Enviar resumo diário')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
