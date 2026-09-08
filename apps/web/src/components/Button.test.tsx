// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button (E-02)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renderiza classes de variante/tamanho padrao', () => {
    const { container } = render(<Button>Salvar</Button>);
    const btn = screen.getByRole('button', { name: 'Salvar' });
    expect(btn.className.split(' ')).toEqual(['btn', 'btn-primary']);
    expect(btn.getAttribute('aria-busy')).toBeNull();
    expect(container.querySelector('.btn-spinner')).toBeNull();
  });

  it('aplica variante danger, size sm e className extra', () => {
    render(
      <Button variant="danger" size="sm" className="ml-auto">
        Excluir
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Excluir' });
    expect(btn.className.includes('btn-danger')).toBe(true);
    expect(btn.className.includes('btn-sm')).toBe(true);
    expect(btn.className.includes('ml-auto')).toBe(true);
  });

  it('loading desabilita e marca aria-busy com spinner', () => {
    const { container } = render(<Button loading>Processando...</Button>);
    const btn = screen.getByRole('button', { name: 'Processando...' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.btn-spinner')).not.toBeNull();
  });

  it('propaga disabled e handlers de clique', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Clique
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Clique' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    btn.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});