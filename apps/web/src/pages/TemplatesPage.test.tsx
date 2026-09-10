// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TemplatesPage } from './TemplatesPage';

interface Chamada {
  url: string;
  method?: string;
  body?: unknown;
}

interface TemplateCriado {
  id: string;
  nome: string;
  canal: string;
  itens: Array<{
    id: string;
    descricao: string;
    tipo_esperado: string;
    tamanho_max_bytes: number | null;
    ordem: number;
  }>;
}

const TEMPLATE_EXISTENTE: TemplateCriado = {
  id: 'tpl-0',
  nome: 'Admissão básica',
  canal: 'email',
  itens: [
    { id: 'it-0a', descricao: 'Frente da CNH', tipo_esperado: 'documento', tamanho_max_bytes: 5242880, ordem: 1 },
    { id: 'it-0b', descricao: 'Comprovante de residência', tipo_esperado: 'documento', tamanho_max_bytes: null, ordem: 2 },
  ],
};

function instalarFetch(templatesIniciais: TemplateCriado[] = []): { chamadas: Chamada[]; criar: (nome: string, itens: unknown) => void } {
  const chamadas: Chamada[] = [];
  const estado = { templates: [...templatesIniciais] };

  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      chamadas.push({ url, method, body: init?.body });
      const resposta = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      if (method === 'GET' && url.endsWith('/checklist-templates')) {
        return resposta(estado.templates);
      }
      if (method === 'POST' && url.endsWith('/checklist-templates')) {
        const inputCriado = JSON.parse(String(init?.body)) as { nome: string; itens: unknown[] };
        const criado: TemplateCriado = {
          id: 'tpl-novo',
          nome: inputCriado.nome,
          canal: 'email',
          itens: (inputCriado.itens as Array<{ descricao: string; tipo_esperado: string; tamanho_max_bytes?: number; ordem: number }>).map((i, index) => ({
            id: `it-novo-${index + 1}`,
            descricao: i.descricao,
            tipo_esperado: i.tipo_esperado,
            tamanho_max_bytes: i.tamanho_max_bytes ?? null,
            ordem: i.ordem,
          })),
        };
        estado.templates = [criado, ...estado.templates];
        return resposta(criado, 201);
      }
      return resposta({});
    },
  );

  return {
    chamadas,
    criar: (nome, itens) => {
      // voz de contrato: idêntico ao POST real
      estado.templates = [
        { id: 'tpl-novo', nome, canal: 'email', itens: itens as TemplateCriado['itens'] },
        ...estado.templates,
      ];
    },
  };
}

function renderizar() {
  return render(<TemplatesPage />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TemplatesPage · página de templates/checklists (M1-UI-01)', () => {
  it('lista templates vindos da API com linguagem de negócio', async () => {
    instalarFetch([TEMPLATE_EXISTENTE]);
    renderizar();

    expect(await screen.findByText('Admissão básica')).toBeTruthy();
    expect(screen.getByText('E-mail')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText(/Frente da CNH — Documento \(até 5 MB\)/)).toBeTruthy();
    expect(screen.getByText(/Comprovante de residência — Documento/)).toBeTruthy();
  });

  it('impede criar template sem itens e orienta o usuário (§4.5 passos 1–4)', async () => {
    const { chamadas } = instalarFetch();
    renderizar();

    fireEvent.click(await screen.findByRole('button', { name: '+ Novo template' }));
    fireEvent.change(screen.getByLabelText(/Nome do template/), { target: { value: 'Sem itens' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar template' }));

    expect(await screen.findByText('Adicione ao menos um item ao template.')).toBeTruthy();
    expect(chamadas.some((c) => c.method === 'POST' && c.url.endsWith('/checklist-templates'))).toBe(false);
  });

  it('cria template com campos reais e reflete o resultado persistido na listagem (6 passos §4.5)', async () => {
    const { chamadas } = instalarFetch();
    renderizar();

    fireEvent.click(await screen.findByRole('button', { name: '+ Novo template' }));

    fireEvent.change(screen.getByLabelText(/Nome do template/), { target: { value: 'Abertura de conta' } });

    fireEvent.click(screen.getByRole('button', { name: '+ Adicionar item' }));
    fireEvent.change(screen.getByLabelText(/Item 1 · Descrição/), { target: { value: 'Frente da CNH' } });
    fireEvent.change(screen.getByLabelText(/Item 1 · Tipo esperado/), { target: { value: 'assinatura' } });
    fireEvent.change(screen.getByLabelText(/Item 1 · Tamanho máximo/), { target: { value: '2.5' } });

    fireEvent.click(screen.getByRole('button', { name: '+ Adicionar item' }));
    fireEvent.change(screen.getByLabelText(/Item 2 · Descrição/), { target: { value: 'Verso da CNH' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar template' }));

    await screen.findByText(/Template "Abertura de conta" criado\./);

    const post = chamadas.find((c) => c.method === 'POST' && c.url.endsWith('/checklist-templates'));
    expect(post).toBeDefined();
    const corpo = JSON.parse(String(post!.body)) as {
      nome: string;
      itens: Array<{ descricao: string; tipo_esperado: string; tamanho_max_bytes?: number; ordem: number }>;
    };
    expect(corpo.nome).toBe('Abertura de conta');
    expect(corpo.itens).toHaveLength(2);
    expect(corpo.itens[0]).toEqual({
      descricao: 'Frente da CNH',
      tipo_esperado: 'assinatura',
      tamanho_max_bytes: 2621440,
      ordem: 1,
    });
    expect(corpo.itens[1]).toEqual({
      descricao: 'Verso da CNH',
      tipo_esperado: 'documento',
      ordem: 2,
    });

    await waitFor(() => expect(screen.getByText('Abertura de conta')).toBeTruthy());
    expect(screen.getByText(/Frente da CNH — Assinatura \(até 2\.5 MB\)/)).toBeTruthy();
    expect(screen.getByText(/Verso da CNH — Documento/)).toBeTruthy();
  }, 10_000);
});