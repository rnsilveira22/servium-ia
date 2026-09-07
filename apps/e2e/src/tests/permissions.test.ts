import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createDriver } from '../support/driver.js';
import { LoginPage } from '../pages/LoginPage.js';
import { LayoutPage } from '../pages/LayoutPage.js';
import type { WebDriver } from 'selenium-webdriver';
import { ENV } from '../config/env.js';

const OPERATOR_EMAIL = process.env.E2E_OPERATOR_EMAIL ?? 'oper@dev.local';
const OPERATOR_PASSWORD = process.env.E2E_OPERATOR_PASSWORD ?? 'oper-dev-corp-2026';
const ADMIN_ENDPOINT = `${ENV.API_URL}/auth/gmail/tokens`;

let driver: WebDriver;
let loginPage: LoginPage;
let layoutPage: LayoutPage;

function apiStatus(path: string): Promise<number> {
  return driver.executeScript<number>(
    `return fetch(${JSON.stringify(path)}, { credentials: 'include' })
        .then((r) => r.status)
        .catch(() => -1);`,
  );
}

beforeAll(async () => {
  driver = await createDriver();
  loginPage = new LoginPage(driver);
  layoutPage = new LayoutPage(driver);
});

afterAll(async () => {
  await driver?.quit();
});

beforeEach(async () => {
  await driver.manage().deleteAllCookies();
});

describe('Permissoes (RBAC) E2E', () => {
  it('papel exibido no sidebar: Administrador', async () => {
    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();
    expect((await layoutPage.getRoleLabel()).toUpperCase()).toBe('ADMINISTRADOR');
  });

  it('papel exibido no sidebar: Operador', async () => {
    await loginPage.loginAsAuthed(ENV.SLUG, OPERATOR_EMAIL, OPERATOR_PASSWORD);
    await layoutPage.waitForAuthenticated();
    expect((await layoutPage.getRoleLabel()).toUpperCase()).toBe('OPERADOR');
  });

  it('rota restrita a admin responde 200 para admin', async () => {
    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();
    const status = await apiStatus(ADMIN_ENDPOINT);
    expect(status).toBe(200);
  });

  it('rota restrita a admin responde 403 para operador', async () => {
    await loginPage.loginAsAuthed(ENV.SLUG, OPERATOR_EMAIL, OPERATOR_PASSWORD);
    await layoutPage.waitForAuthenticated();
    const status = await apiStatus(ADMIN_ENDPOINT);
    expect(status).toBe(403);
  });
});