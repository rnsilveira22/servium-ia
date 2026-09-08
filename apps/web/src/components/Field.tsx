import { cloneElement, useId, type ReactElement } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactElement<{ id?: string }>;
}

export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const describedBy = hint || error ? `${id}-helper` : undefined;

  const input = cloneElement(children, {
    id: children.props.id ?? id,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(error ? { 'aria-invalid': true } : {}),
  });

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>
      {input}
      {hint && <small id={`${id}-helper`} className="field-hint">{hint}</small>}
      {error && (
        <small id={`${id}-helper`} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}