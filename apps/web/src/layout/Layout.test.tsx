// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    sessao: { operadorId: 'op-1', tenantId: 't-1', papel: 'admin' },
    logout: vi.fn(),
  }),
}));

function renderizarLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>Conteudo da pagina</div>} />
          <Route path="/clientes" element={<div>Clientes</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Layout · menu mobile (#94)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('hamburguer controla o menu com aria-expanded/aria-controls e classe open', async () => {
    const { container } = renderizarLayout();
    const toggle = screen.getByRole('button', { name: 'Abrir menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('sidebar-nav');
    expect(screen.getByRole('navigation', { name: 'Principal' }).id).toBe('sidebar-nav');
    expect(container.querySelector('aside.sidebar.open')).toBeNull();

    fireEvent.click(toggle);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fechar menu' }).getAttribute('aria-expanded')).toBe('true'),
    );
    expect(container.querySelector('aside.sidebar.open')).not.toBeNull();
  });

  it('fecha com Escape', async () => {
    const { container } = renderizarLayout();
    const toggle = screen.getByRole('button', { name: 'Abrir menu' });
    fireEvent.click(toggle);
    await waitFor(() => expect(container.querySelector('aside.sidebar.open')).not.toBeNull());

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(container.querySelector('aside.sidebar.open')).toBeNull());
  });

  it('clica no backdrop e fecha o menu', async () => {
    const { container } = renderizarLayout();
    const toggle = screen.getByRole('button', { name: 'Abrir menu' });
    fireEvent.click(toggle);
    await waitFor(() => expect(container.querySelector('aside.sidebar.open')).not.toBeNull());

    const backdrop = container.querySelector('.sidebar-backdrop');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    await waitFor(() => expect(container.querySelector('aside.sidebar.open')).toBeNull());
  });
});