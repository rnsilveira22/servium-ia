// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModelosEmailPage } from './ModelosEmailPage';

const MODELO = {
  id: 'tpl-1',
  nome: 'Abertura de Empresa',
  assunto: 'Documentação: {{item_descricao}} para {{cliente_nome}}',
  corpo: 'Olá {{cliente_nome}},\n\nenvie {{item_descricao}}.\n\nIdentificador: {{token_correlacao}}',
  criado_em: '2026-09-21T10:00:00Z',
};

const CHECKLIST = {
  id: 'cl-1',
  nome: 'Abertura de Empresa',
  canal: 'email',
  email_template_id: 'tpl-1',
  email_template_nome: 'Abertura de Empresa',
  itens: [{ id: 'i1', descricao: 'Contrato social', tipo_esperado: 'documento', tamanho_max_bytes: null, ordem: 1 }],
};

function instalarFetch() {
  const chamadas: unknown[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      chamadas.push({ url, method });
      const resposta = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      if (method === 'GET' && url.endsWith('/email-templates')) return resposta([MODELO]);
      if (method === 'GET' && url.endsWith('/checklist-templates')) return resposta([CHECKLIST]);
      if (method === 'POST' && url.endsWith('/email-templates')) return resposta({ ...MODELO }, 201);
      if (method === 'DELETE' && url.includes('/email-templates/')) return resposta({ ok: true });
      return resposta({ message: 'não esperado' }, 500);
    },
  );
  return chamadas;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ModelosEmailPage', () => {
  it('lista modelos com o checklist vinculado', async () => {
    instalarFetch();
    render(
      <MemoryRouter>
        <ModelosEmailPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByText('Abertura de Empresa').length).toBeGreaterThan(0));
    expect(screen.getByText('Documentação: {{item_descricao}} para {{cliente_nome}}')).toBeDefined();
    expect(screen.getAllByText('Abertura de Empresa').length).toBeGreaterThan(1);
  });

  it('cria modelo a partir do formulário', async () => {
    const chamadas = instalarFetch();
    render(
      <MemoryRouter>
        <ModelosEmailPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByText("Abertura de Empresa").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('+ Novo Modelo'));
    fireEvent.change(screen.getByPlaceholderText('Solicitação de documentos — abertura de empresa'), { target: { value: 'Solicitação de docs' } });
    fireEvent.change(screen.getByPlaceholderText('Documentação necessária para abertura de empresa'), { target: { value: 'Assunto teste' } });
    fireEvent.change(screen.getByPlaceholderText(/Para abrirmos sua empresa/), {
      target: { value: 'Olá {{cliente_nome}},\n\nenvie {{item_descricao}}.\n\nIdentificador: {{token_correlacao}}' },
    });
    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() =>
      expect(chamadas.some((c) => (c as { method?: string }).method === 'POST')).toBe(true),
    );
    expect(chamadas.filter((c) => (c as { method?: string }).method === 'POST').length).toBe(1);
  });

  it('excluir modelo confirma e chama DELETE', async () => {
    const chamadas = instalarFetch();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <MemoryRouter>
        <ModelosEmailPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByText("Abertura de Empresa").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Excluir'));
    await waitFor(() =>
      expect(chamadas.some((c) => (c as { method?: string }).method === 'DELETE')).toBe(true),
    );
  });
});