// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Badge, StatusBadge } from './Badge';

describe('Badge / StatusBadge (E-02)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('Badge padrao e neutral', () => {
    const { container } = render(<Badge>Novo</Badge>);
    const badge = screen.getByText('Novo');
    expect(badge.className.includes('badge-neutral')).toBe(true);
    expect(container.querySelector('.badge')).not.toBeNull();
  });

  it('Badge aplica classe do tone', () => {
    render(<Badge tone="alert">Falha</Badge>);
    const badge = screen.getByText('Falha');
    expect(badge.className.includes('badge-alert')).toBe(true);
  });

  it('StatusBadge mapeia estados para tones', () => {
    const { rerender } = render(<StatusBadge estado="ativo" />);
    expect(screen.getByText('ativo').className.includes('badge-ativo')).toBe(true);

    rerender(<StatusBadge estado="aberto" />);
    expect(screen.getByText('aberto').className.includes('badge-aberto')).toBe(true);

    rerender(<StatusBadge estado="cancelado" />);
    expect(screen.getByText('cancelado').className.includes('badge-cancelado')).toBe(true);
  });

  it('StatusBadge desconhecido vira neutral', () => {
    render(<StatusBadge estado="foo" />);
    expect(screen.getByText('foo').className.includes('badge-neutral')).toBe(true);
  });
});