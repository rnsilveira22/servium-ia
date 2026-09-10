import type { ChecklistTemplateDTO, CriarChecklistTemplateInput } from '@servium-ia/shared-types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface ApiOptions {
  method?: string;
  body?: unknown;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string }).message ?? `Erro ${res.status}`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export function listarChecklistTemplates(): Promise<ChecklistTemplateDTO[]> {
  return api<ChecklistTemplateDTO[]>('/checklist-templates');
}

export function criarChecklistTemplate(input: CriarChecklistTemplateInput): Promise<ChecklistTemplateDTO> {
  return api<ChecklistTemplateDTO>('/checklist-templates', { method: 'POST', body: input });
}
