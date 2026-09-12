import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import type { WebDriver } from 'selenium-webdriver';

import { createDriver } from '../support/driver.js';
import { takeScreenshot } from '../support/evidence.js';
import { LoginPage } from '../pages/LoginPage.js';
import { LayoutPage } from '../pages/LayoutPage.js';
import { CiclosPage } from '../pages/CiclosPage.js';
import { CicloDetailPage } from '../pages/CicloDetailPage.js';
import { ENV } from '../config/env.js';

let driver: WebDriver;
let loginPage: LoginPage;
let layoutPage: LayoutPage;
let ciclosPage: CiclosPage;
let cicloDetailPage: CicloDetailPage;
let db: pg.Client;

function apiFetch(path: string, method: string, body: unknown): Promise<unknown> {
  const bodyStr = body === undefined ? 'undefined' : JSON.stringify(body);
  return driver.executeScript<unknown>(
    `return fetch(arguments[0], {
        method: arguments[1],
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: arguments[2],
      }).then((r) => r.json().then((j) => ({ status: r.status, body: j })).catch(() => ({ status: r.status, body: {} })));`,
    `${ENV.API_URL}${path}`,
    method,
    bodyStr,
  );
}

/** Cria um ciclo com 2 itens e os marca como 'recebido' (simula a correlação
 *  de resposta do cliente — o caminho real é coberto pelo runtime-e2e). */
async function criarCicloComItensRecebidos(sufixo: number): Promise<{ cliente: string; obrigacao: string; item1: string }> {
  const clienteNome = `E2E B1 Cliente ${sufixo}`;
  const descricao = `E2E B1 Obrigacao ${sufixo}`;
  const item1 = `Doc B1 ${sufixo}`;
  const item2 = `Dado B1 ${sufixo}`;

  const cliente = (await apiFetch('/clientes', 'POST', { nome: clienteNome, email: `b1-${sufixo}@local.test` })) as {
    status: number;
    body: { id: string };
  };
  expect(cliente.status).toBe(201);

  const template = (await apiFetch('/checklist-templates', 'POST', {
    nome: `Tpl B1 ${sufixo}`,
    itens: [
      { descricao: item1, tipo_esperado: 'documento' },
      { descricao: item2, tipo_esperado: 'informacao' },
    ],
  })) as { status: number; body: { id: string } };
  expect(template.status).toBe(201);

  const obrigacao = (await apiFetch('/obrigacoes', 'POST', {
    cliente_id: cliente.body.id,
    descricao,
    template_id: template.body.id,
  })) as { status: number; body: { id: string } };
  expect(obrigacao.status).toBe(201);

  const ciclo = (await apiFetch('/ciclos', 'POST', { obrigacao_id: obrigacao.body.id })) as {
    status: number;
    body: { id: string };
  };
  expect(ciclo.status).toBe(201);

  // Neste harness só a API roda (sem worker): o job ciclo.ativar não é processado,
  // então o item é criado no DB exatamente como o handler faria (copia do template).
  const { rowCount: criados } = await db.query<{ count: string }>(
    `INSERT INTO itens_ciclo (tenant_id, ciclo_id, item_template_id)
     SELECT c.tenant_id, c.id, t.id
       FROM ciclos c
       JOIN itens_template t ON t.template_id=$2
      WHERE c.id=$1
      RETURNING id`,
    [ciclo.body.id, template.body.id],
  );
  expect(criados).toBe(2);

  const { rowCount } = await db.query(
    "UPDATE itens_ciclo SET estado='recebido', atualizado_em=now() WHERE ciclo_id=$1 AND estado='pendente'",
    [ciclo.body.id],
  );
  expect(rowCount).toBe(2);

  return { cliente: clienteNome, obrigacao: descricao, item1 };
}

beforeAll(async () => {
  driver = await createDriver();
  loginPage = new LoginPage(driver);
  layoutPage = new LayoutPage(driver);
  ciclosPage = new CiclosPage(driver);
  cicloDetailPage = new CicloDetailPage(driver);
  db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? 'postgres://servium:servium_dev@localhost:5432/servium' });
  await db.connect();
});

afterAll(async () => {
  await db?.end();
  await driver?.quit();
});

beforeEach(async () => {
  await driver.manage().deleteAllCookies();
});

describe('Local Acceptance — B-1 validação humana do item recebido (UI)', () => {
  it('admin valida item recebido: ação "Validar e concluir" ⇒ badge resolvido', async () => {
    const sufixo = Date.now();

    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();

    const { cliente, obrigacao, item1 } = await criarCicloComItensRecebidos(sufixo);

    await layoutPage.clickNav('Ciclos');
    await ciclosPage.open();
    expect(await ciclosPage.hasCiclo(cliente, obrigacao)).toBe(true);

    await cicloDetailPage.openByRow(cliente, obrigacao);
    expect(await cicloDetailPage.itemBadge(item1, 'recebido')).toBe('recebido');
    expect(await cicloDetailPage.hasValidarConcluirButton()).toBe(true);
    expect(await cicloDetailPage.hasEncaminharParaAnaliseButton()).toBe(true);
    await takeScreenshot(driver, `b1-recebido-acoes-${sufixo}`);

    await cicloDetailPage.validarConcluir();
    expect(await cicloDetailPage.itemBadge(item1, 'resolvido')).toBe('resolvido');
    expect(await cicloDetailPage.hasError()).toBe(false);
    await takeScreenshot(driver, `b1-resolvido-${sufixo}`);
  }, 90_000);

  it('admin encaminha item recebido para análise: "Encaminhar para análise" ⇒ exceção no fluxo existente', async () => {
    const sufixo = Date.now();

    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();

    const { cliente, obrigacao, item1 } = await criarCicloComItensRecebidos(sufixo);

    await layoutPage.clickNav('Ciclos');
    await ciclosPage.open();
    await cicloDetailPage.openByRow(cliente, obrigacao);

    await cicloDetailPage.encaminharParaAnalise('documento divergente (E2E)');
    expect(await cicloDetailPage.itemBadge(item1, 'excecao')).toBe('excecao');
    expect(await cicloDetailPage.hasSection('Excecoes (1)')).toBe(true);
    expect(await cicloDetailPage.hasError()).toBe(false);
    await takeScreenshot(driver, `b1-excecao-${sufixo}`);
  }, 90_000);
});