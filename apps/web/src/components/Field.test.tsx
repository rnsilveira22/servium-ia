// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Field } from './Field';

describe('Field (E-02)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('injetam htmlFor no label e id no input via cloneElement', () => {
    const { container } = render(
      <Field label="CPF">
        <input />
      </Field>,
    );
    const label = container.querySelector('label');
    const input = container.querySelector('input');
    expect(label?.htmlFor).toBeTruthy();
    expect(label?.htmlFor).toBe(input?.getAttribute('id'));
    expect(input?.getAttribute('id')).toBeTruthy();
  });

  it('usa htmlFor explicito quando informado', () => {
    const { container } = render(
      <Field label="CPF" htmlFor="cpf-field">
        <input />
      </Field>,
    );
    const label = container.querySelector('label');
    expect(label?.htmlFor).toBe('cpf-field');
  });

  it('renderiza hint com aria-describedby ligado ao campo', () => {
    const { container } = render(
      <Field label="CPF" hint="Somente numeros">
        <input />
      </Field>,
    );
    const input = container.querySelector('input');
    const hint = screen.getByText('Somente numeros');
    expect(input?.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('renderiza erro com role=alert e aria-invalid', () => {
    const { container } = render(
      <Field label="CPF" error="CPF invalido">
        <input />
      </Field>,
    );
    expect(screen.getByRole('alert').textContent).toBe('CPF invalido');
    const input = container.querySelector('input');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  });

  it('marca campo obrigatorio', () => {
    const { container } = render(
      <Field label="CPF" required>
        <input />
      </Field>,
    );
    expect(container.querySelector('.field-required')).not.toBeNull();
  });
});