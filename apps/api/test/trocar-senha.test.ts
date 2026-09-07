import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { hash } from '@node-rs/argon2';

import { ADMIN_URL, validarPoliticaSenha, mensagemPoliticaSenha } from '@servium/db';
import { buildApp } from '../src/app.factory';

const TEN = '77777777-7777-7777-7777-777777777701';
const SLUG = 'tenant-politica-senha';
const SENHA = 'senha-' + randomBytes(8).toString('hex');
const NOVA_SENHA = 'nova-' + randomBytes(10).toString('hex');
const EMAIL = 'admin@politica-senha.local';
const EMAIL_OP = 'op@politica-senha.local';

let app: INestApplication;
let req: supertest.Agent;
let admin: import('pg').Client;
let cookieValido: string;

async function criarUsuarios() {
  const senhaHash = await hash(SENHA);
  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Politica Senha',$2)", [TEN, SLUG]);
  await admin.query(
    `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
     VALUES ($1,'Admin Test',$2,$3,'admin')`,
    [TEN, EMAIL, senhaHash]
  );
  await admin.query(
    `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
     VALUES ($1,'Op Test',$2,$3,'operador')`,
    [TEN, EMAIL_OP, senhaHash]
  );
}

beforeAll(async () => {
  const pg = await import('pg');
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();
  await criarUsuarios();

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
});

afterAll(async () => {
  await app.close();
  await limpar();
  void admin.end();
});

async function limpar() {
  await admin.query('DELETE FROM sessoes WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM eventos_auditoria WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM operadores WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM tenants WHERE id=$1', [TEN]);
}

async function loginCom(senha: string) {
  const r = await req.post('/auth/login').send({ slug: SLUG, email: EMAIL, senha });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.headers['set-cookie'][0].split(';')[0] as string;
}

async function eventos(acao: string) {
  const { rows } = await admin.query(
    `SELECT detalhes FROM eventos_auditoria WHERE tenant_id=$1 AND entidade='auth' AND acao=$2 ORDER BY criado_em`,
    [TEN, acao]
  );
  return rows.map((r) => r.detalhes);
}

describe('PRM-P0.3-A · política de senha ASVS/NIST (Issue #54)', () => {
  describe('CA-A-2 · validador de política (função pura)', () => {
    it('aceita senha com 12+ caracteres, incluindo espaços (sem composição obrigatória)', () => {
      expect(validarPoliticaSenha('acao-secreta de 12')).toEqual({ ok: true });
      expect(validarPoliticaSenha('a'.repeat(12))).toEqual({ ok: true });
    });

    it('rejeita senhas com menos de 12 caracteres', () => {
      expect(validarPoliticaSenha('curta123')).toEqual({ ok: false, motivo: 'curta_12' });
    });

    it('rejeita senhas acima de 64 caracteres (sem truncamento)', () => {
      const r = validarPoliticaSenha('a'.repeat(65));
      expect(r.ok).toBe(false);
      expect(r.motivo).toBe('longa_64');
    });

    it('aceita exatamente 64 caracteres (sem truncamento no limite)', () => {
      expect(validarPoliticaSenha('a'.repeat(64))).toEqual({ ok: true });
    });

    it('rejeita senhas comuns da blocklist (case-insensitive, acentos ignorados)', () => {
      expect(validarPoliticaSenha('Admin12345678').ok).toBe(false);
      expect(validarPoliticaSenha('Admin12345678').motivo).toBe('blocklist');
      expect(validarPoliticaSenha('PASSWORD1234').ok).toBe(false);
      expect(validarPoliticaSenha('sénha12345678').ok).toBe(false); // ~ são removidos na normalização
      expect(validarPoliticaSenha('sénha12345678').motivo).toBe('blocklist');
    });

    it('mensagem de erro é específica e descritiva', () => {
      expect(mensagemPoliticaSenha('curta_12')).toMatch(/mínimo 12/);
      expect(mensagemPoliticaSenha('longa_64')).toMatch(/máximo 64/);
      expect(mensagemPoliticaSenha('blocklist')).toMatch(/comuns|bloqueadas/i);
    });
  });

  describe('CA-A-1 · POST /auth/trocar-senha', () => {
    it('deny-by-default: sem sessão ⇒ 401', async () => {
      const r = await req.post('/auth/trocar-senha').send({ senha_atual: SENHA, nova_senha: NOVA_SENHA });
      expect(r.status).toBe(401);
    });

    it('corpo incompleto ⇒ 400 sem auditar', async () => {
      cookieValido = await loginCom(SENHA);
      for (const body of [{}, { senha_atual: SENHA }, { nova_senha: NOVA_SENHA }]) {
        const r = await req.post('/auth/trocar-senha').send(body).set('Cookie', cookieValido);
        expect(r.status, JSON.stringify(body)).toBe(400);
      }
      expect(await eventos('trocar_senha_falha')).toHaveLength(0);
    });

    it('senha atual incorreta ⇒ 400, mensagem específica e audita trocar_senha_falha', async () => {
      const r = await req
        .post('/auth/trocar-senha')
        .send({ senha_atual: 'errada-gerada', nova_senha: 'outra-senha-segura-123' })
        .set('Cookie', cookieValido);
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/incorreta/i);

      const detalhes = await eventos('trocar_senha_falha');
      expect(detalhes.at(-1)).toEqual({ motivo: 'senha_invalida' });
    });

    it('nova senha fora da política ⇒ 400 com mensagem específica e audita trocar_senha_falha', async () => {
      const r = await req
        .post('/auth/trocar-senha')
        .send({ senha_atual: SENHA, nova_senha: 'fraca' })
        .set('Cookie', cookieValido);
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/mínimo 12/);

      const detalhes = await eventos('trocar_senha_falha');
      expect(detalhes.at(-1)).toEqual({ motivo: 'politica_violada', motivo_detalhe: 'curta_12' });
    });

    it('senha válida ⇒ 204; login antigo falha e o novo funciona', async () => {
      const r = await req
        .post('/auth/trocar-senha')
        .send({ senha_atual: SENHA, nova_senha: NOVA_SENHA })
        .set('Cookie', cookieValido);
      expect(r.status).toBe(204);

      const velho = await req.post('/auth/login').send({ slug: SLUG, email: EMAIL, senha: SENHA });
      expect(velho.status).toBe(401);
      const novo = await req.post('/auth/login').send({ slug: SLUG, email: EMAIL, senha: NOVA_SENHA });
      expect(novo.status).toBe(200);

      const detalhes = await eventos('trocar_senha');
      expect(detalhes.at(-1)).toEqual({});
    });

    it('revoga as demais sessões do operador, preservando a sessão corrente', async () => {
      const cookieAtual = await loginCom(NOVA_SENHA); // senha já é NOVA_SENHA
      const cookieParalela = await loginCom(NOVA_SENHA);
      const ativoAntes = await admin.query(
        `SELECT count(*)::int AS n FROM sessoes WHERE operador_id = (SELECT id FROM operadores WHERE email=$1) AND revogado_em IS NULL`,
        [EMAIL]
      );
      expect(ativoAntes.rows[0].n).toBeGreaterThanOrEqual(2);

      const r = await req
        .post('/auth/trocar-senha')
        .send({ senha_atual: NOVA_SENHA, nova_senha: 'outra-' + randomUUID().slice(0, 20) })
        .set('Cookie', cookieAtual);
      expect(r.status).toBe(204);

      // sessão paralela revogada ⇒ 401; sessão corrente ainda válida ⇒ 200
      expect((await req.get('/auth/me').set('Cookie', cookieParalela)).status).toBe(401);
      const me = await req.get('/auth/me').set('Cookie', cookieAtual);
      expect(me.status).toBe(200);
      expect(me.body.operadorId).toBeTruthy();
    });

    it('operador (não-admin) também pode trocar a própria senha', async () => {
      const loginOp = await req.post('/auth/login').send({ slug: SLUG, email: EMAIL_OP, senha: SENHA });
      const cookieOp = loginOp.headers['set-cookie'][0].split(';')[0] as string;
      const r = await req
        .post('/auth/trocar-senha')
        .send({ senha_atual: SENHA, nova_senha: 'op-nova-' + randomBytes(6).toString('hex') })
        .set('Cookie', cookieOp);
      expect(r.status).toBe(204);
    });

    it('auditoria registra sucesso e falhas no tenant correto', async () => {
      const sucessos = (await eventos('trocar_senha')).length;
      const falhas = (await eventos('trocar_senha_falha')).length;
      expect(sucessos).toBeGreaterThanOrEqual(3);
      expect(falhas).toBeGreaterThanOrEqual(2);
    });
  });
});