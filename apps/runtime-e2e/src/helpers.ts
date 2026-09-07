import { createHash, randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import pg from 'pg';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');

export const ADMIN_URL = process.env.DATABASE_URL ?? 'postgres://servium:servium_dev@localhost:5432/servium';
export const APP_URL = process.env.APP_DATABASE_URL ?? 'postgres://servium_app:servium_app@localhost:5432/servium';

export const MAILPIT_API = process.env.MAILPIT_API_URL ?? 'http://localhost:8025';
export const MAILPIT_SMTP = {
  host: process.env.MAILPIT_SMTP_HOST ?? 'localhost',
  port: Number(process.env.MAILPIT_SMTP_PORT ?? 1025),
};
export const AGENTE = process.env.MAILPIT_AGENT_EMAIL ?? 'assistente@servium.local';
export const API_PORT = 3400 + Math.floor(Math.random() * 900);

export async function garantirBuildApi(): Promise<void> {
  if (existsSync(join(REPO_ROOT, 'apps/api/dist/main.js'))) return;
  const { execFileSync } = await import('node:child_process');
  execFileSync('npm', ['run', 'build', '-w', '@servium-ia/api'], { cwd: REPO_ROOT, stdio: 'inherit' });
}

export interface Processo {
  proc: ChildProcess;
  readonly saida: string;
}

export function iniciarProcesso(
  cmd: string,
  args: string[],
  env: Record<string, string>,
  descreve: string
): Processo {
  const proc = spawn(cmd, args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const linhas: string[] = [];
  const grava = (chunk: Buffer) => {
    const texto = chunk.toString();
    linhas.push(texto);
    process.stdout.write(`[${descreve}] ${texto.trimEnd()}\n`);
  };
  proc.stdout?.on('data', grava);
  proc.stderr?.on('data', grava);
  return {
    proc,
    get saida(): string {
      return linhas.join('');
    },
  };
}

export async function aguardar(
  condicao: () => Promise<boolean>,
  tempoMaxMs: number,
  label: string
): Promise<void> {
  const inicio = Date.now();
  while (Date.now() - inicio < tempoMaxMs) {
    if (await condicao()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`timeout aguardando ${label}`);
}

export async function aguardarApi(port: number): Promise<void> {
  await aguardar(async () => {
    try {
      const r = await fetch(`http://localhost:${port}/health`);
      return r.ok;
    } catch {
      return false;
    }
  }, 30_000, 'API pronta');
}

/* -------------------------------- DB -------------------------------- */

export function novoTenantId(): string {
  const hex = randomBytes(16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function hashToken(token: string): Promise<string> {
  return createHash('sha256').update(token).digest('hex');
}

export interface SeedDados {
  ten: string;
  slug: string;
  operadorId: string;
  clienteEmail: string;
  obrigacaoId: string;
  cookie: string;
}

export async function semear(admin: pg.Client): Promise<SeedDados> {
  const ten = novoTenantId();
  const slug = `e2e-${ten.slice(0, 8)}`;
  const clienteEmail = `cliente-${ten.slice(0, 8)}@e2e.local`;
  const token = randomBytes(24).toString('hex');
  const cookie = `sid=${token}`;

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Runtime E2E',$2)", [ten, slug]);
  const { rows: op } = await admin.query(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'E2E','e2e@e2e.local','nao-usado','admin') RETURNING id",
    [ten]
  );
  await admin.query(
    `INSERT INTO sessoes (tenant_id, operador_id, token_hash, expira_em)
     VALUES ($1,$2,$3, now() + interval '2 hours')`,
    [ten, op[0]!.id, await hashToken(token)]
  );
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente E2E',$2) RETURNING id",
    [ten, clienteEmail]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Docs E2E') RETURNING id",
    [ten]
  );
  for (const desc of ['Contrato social', 'CNPJ']) {
    await admin.query(
      "INSERT INTO itens_template (tenant_id,template_id,descricao,tipo_esperado) VALUES ($1,$2,$3,'documento')",
      [ten, tpl[0]!.id, desc]
    );
  }
  const { rows: obl } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Entregar docs E2E',$3) RETURNING id",
    [ten, cli[0]!.id, tpl[0]!.id]
  );

  return { ten, slug, operadorId: op[0]!.id, clienteEmail, obrigacaoId: obl[0]!.id, cookie };
}

export async function limparTenant(admin: pg.Client, ten: string): Promise<void> {
  for (const sql of [
    "DELETE FROM sessoes WHERE tenant_id=$1",
    "DELETE FROM jobs_fila WHERE tenant_id=$1",
    "DELETE FROM eventos_auditoria WHERE tenant_id=$1",
    "DELETE FROM excecoes WHERE tenant_id=$1",
    "DELETE FROM mensagens_gmail WHERE tenant_id=$1",
    "DELETE FROM mensagens_comunicacao WHERE tenant_id=$1",
    "DELETE FROM documentos WHERE tenant_id=$1",
    "DELETE FROM itens_ciclo WHERE tenant_id=$1",
    "DELETE FROM ciclos WHERE tenant_id=$1",
    "DELETE FROM obrigacoes WHERE tenant_id=$1",
    "DELETE FROM itens_template WHERE tenant_id=$1",
    "DELETE FROM checklist_templates WHERE tenant_id=$1",
    "DELETE FROM clientes WHERE tenant_id=$1",
    "DELETE FROM operadores WHERE tenant_id=$1",
    "DELETE FROM tenants WHERE id=$1",
  ]) {
    await admin.query(sql, [ten]);
  }
}

/* -------------------------------- Mail -------------------------------- */

export async function responderComoCliente(clienteEmail: string, token: string): Promise<void> {
  const transporte = nodemailer.createTransport(MAILPIT_SMTP);
  try {
    await transporte.sendMail({
      from: clienteEmail,
      to: AGENTE,
      subject: 'Re: Pendência documental',
      text: `Segue o documento.\n\nIdentificador: ${token}`,
    });
  } finally {
    transporte.close();
  }
}

export function encerrar(proc: ChildProcess): void {
  if (proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  setTimeout(() => {
    if (proc.exitCode === null) proc.kill('SIGKILL');
  }, 5_000).unref();
}