import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createDriver } from '../support/driver.js';
import { takeScreenshot } from '../support/evidence.js';
import { LoginPage } from '../pages/LoginPage.js';
import { LayoutPage } from '../pages/LayoutPage.js';
import { ObrigacoesPage } from '../pages/ObrigacoesPage.js';
import { CiclosPage } from '../pages/CiclosPage.js';
import { CicloDetailPage } from '../pages/CicloDetailPage.js';
import type { WebDriver } from 'selenium-webdriver';
import { ENV } from '../config/env.js';

let driver: WebDriver;
let loginPage: LoginPage;
let layoutPage: LayoutPage;
let obrigacoesPage: ObrigacoesPage;
let ciclosPage: CiclosPage;
let cicloDetailPage: CicloDetailPage;

function apiFetch(path: string, method: string, body: unknown): Promise<number> {
  const bodyStr = body === undefined ? 'undefined' : JSON.stringify(body);
  return driver.executeScript<number>(
    `return fetch(arguments[0], {
        method: arguments[1],
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: arguments[2],
      }).then((r) => r.status).catch(() => -1);`,
    `${ENV.API_URL}${path}`,
    method,
    bodyStr,
  );
}

beforeAll(async () => {
  driver = await createDriver();
  loginPage = new LoginPage(driver);
  layoutPage = new LayoutPage(driver);
  obrigacoesPage = new ObrigacoesPage(driver);
  ciclosPage = new CiclosPage(driver);
  cicloDetailPage = new CicloDetailPage(driver);
});

afterAll(async () => {
  await driver?.quit();
});

beforeEach(async () => {
  await driver.manage().deleteAllCookies();
});

describe('Local Acceptance — ativação de ciclo pela UI', () => {
  it('operador cadastra/ativa ciclo a partir de obrigação legível (sem UUID manual)', async () => {
    const sufixo = Date.now();
    const clienteNome = `E2E Cliente ${sufixo}`;
    const descricao = `E2E Obrigacao ${sufixo}`;

    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();

const clienteStatus = await apiFetch('/clientes', 'POST', { nome: clienteNome, email: `e2e-${sufixo}@local.test` });
    expect(clienteStatus).toBe(201);

    await layoutPage.clickNav('Obrigacoes');
    await obrigacoesPage.clickNovaObrigacao();
    await obrigacoesPage.waitForClienteOption(clienteNome);
    await obrigacoesPage.selectCliente(clienteNome);
    await obrigacoesPage.fillDescricao(descricao);
    await obrigacoesPage.submit();
    await obrigacoesPage.waitingRow(descricao);
    await obrigacoesPage.activateCicloOnRow(descricao);
    const sucesso = await obrigacoesPage.getSuccessMessage();
    expect(sucesso).toContain('Ciclo ativado');
    expect(sucesso).toContain(descricao);
    await takeScreenshot(driver, `ciclo-ativado-obrigacao-${sufixo}`);

    await layoutPage.clickNav('Ciclos');
    await ciclosPage.open();
    expect(await ciclosPage.hasCiclo(clienteNome, descricao)).toBe(true);
    await takeScreenshot(driver, `ciclo-listado-${sufixo}`);

    await cicloDetailPage.openByRow(clienteNome, descricao);
    expect(await cicloDetailPage.heading()).toBe(`Ciclo de ${clienteNome} — ${descricao}`);
    expect(await cicloDetailPage.hasSection('Itens (0)')).toBe(true);
    expect(await cicloDetailPage.hasError()).toBe(false);
    expect(await cicloDetailPage.currentUrl()).toContain('/ciclos/');
    await takeScreenshot(driver, `ciclo-detalhe-${sufixo}`);
  }, 60_000);

  it('#73: operador cancela ciclo ativo pelo detalhe (UI) e vê status Cancelado', async () => {
    const sufixo = Date.now();
    const clienteNome = `E2E Canc Cliente ${sufixo}`;
    const descricao = `E2E Canc Obrigacao ${sufixo}`;

    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();

    const clienteStatus = await apiFetch('/clientes', 'POST', { nome: clienteNome, email: `e2e-canc-${sufixo}@local.test` });
    expect(clienteStatus).toBe(201);

    await layoutPage.clickNav('Obrigacoes');
    await obrigacoesPage.clickNovaObrigacao();
    await obrigacoesPage.waitForClienteOption(clienteNome);
    await obrigacoesPage.selectCliente(clienteNome);
    await obrigacoesPage.fillDescricao(descricao);
    await obrigacoesPage.submit();
    await obrigacoesPage.waitingRow(descricao);
    await obrigacoesPage.activateCicloOnRow(descricao);
    await obrigacoesPage.getSuccessMessage();

    await layoutPage.clickNav('Ciclos');
    await ciclosPage.open();
    await cicloDetailPage.openByRow(clienteNome, descricao);

    expect(await cicloDetailPage.statusLabel()).toBe('Aberto');
    expect(await cicloDetailPage.hasCancelarCicloButton()).toBe(true);

    await cicloDetailPage.cancelarCiclo('ativado por engano (E2E)');
    await takeScreenshot(driver, `ciclo-cancelado-${sufixo}`);

    expect(await cicloDetailPage.statusLabel()).toBe('Cancelado');
    expect(await cicloDetailPage.hasCancelarCicloButton()).toBe(false);
  }, 60_000);
});