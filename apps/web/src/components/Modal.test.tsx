// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Modal } from './Modal';

function renderizarModal(onClose = vi.fn()) {
  return render(
    <Modal title="Cancelar ciclo" onClose={onClose}>
      <p>Deseja mesmo cancelar?</p>
      <Button size="sm" data-autofocus onClick={onClose}>
        Confirmar
      </Button>
    </Modal>,
  );
}

describe('Modal (acessibilidade)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('expoe dialog com aria-modal e aria-labelledby', () => {
    renderizarModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const heading = screen.getByRole('heading', { name: 'Cancelar ciclo' });
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('fecha com Escape', () => {
    const onClose = vi.fn();
    renderizarModal(onClose);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fecha ao clicar no backdrop, mas nao no conteudo', () => {
    const onClose = vi.fn();
    const { container } = renderizarModal(onClose);
    fireEvent.click(container.querySelector('.modal')!);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('.modal-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mantem o focus preso ao ultimo/primeiro elemento compativel', () => {
    renderizarModal();
    const confirmar = screen.getByRole('button', { name: 'Confirmar' });
    confirmar.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(confirmar);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirmar);
  });

  it('restaura o focus no elemento anterior ao fechar', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Abrir';
    document.body.appendChild(trigger);
    trigger.focus();

    const onClose = vi.fn();
    const { container, unmount } = renderizarModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    onClose.mockImplementation(() => unmount());
    onClose();
    expect(document.activeElement).toBe(trigger);

    container.remove();
    trigger.remove();
  });
});