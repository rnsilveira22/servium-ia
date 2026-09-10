import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createDriver } from '../support/driver.js';
import { takeScreenshot } from '../support/evidence.js';
import { LoginPage } from '../pages/LoginPage.js';
import { LayoutPage } from '../pages/LayoutPage.js';
import { TemplatesPage } from '../pages/TemplatesPage.js';
import type { WebDriver } from 'selenium-webdriver';
import { ENV } from '../config/env.js';

let driver: WebDriver;
let loginPage: LoginPage;
let layoutPage: LayoutPage;
let templatesPage: TemplatesPage;

function apiGetTemplates(): Promise<Array<{ nome: string; itens: Array<{ descricao: string }> }>> {
  return driver.executeScript(
    `return fetch(${JSON.stringify(`${ENV.API_URL}/checklist-templates`)}, { credentials: 'include' })
      .then((r) => r.json())
      .catch(() => []);`,
  ) as Promise<Array<{ nome: string; itens: Array<{ descricao: string }> }>>;
}

beforeAll(async () => {
  driver = await createDriver();
  loginPage = new LoginPage(driver);
  layoutPage = new LayoutPage(driver);
  templatesPage = new TemplatesPage(driver);
});

afterAll(async () => {
  await driver?.quit();
});

beforeEach(async () => {
  await driver.manage().deleteAllCookies();
});

describe('M1-UI-01 · página de templates/checklists (jornada real)', () => {
  it('operador cria template com campos reais e o resultado persistido aparece na UI (6 passos §4.5)', async () => {
    const sufixo = Date.now();
    const nome = `E2E Checklist ${sufixo}`;

    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();

    // 1. abrir a página /templates
    await templatesPage.open();

    // 2. preencher os campos reais: nome + itens (descrição, tipo, tamanho)
    await templatesPage.clickNovoTemplate();
    await templatesPage.fillNome(nome);
    await templatesPage.clickAdicionarItem();
    await templatesPage.fillItemDescricao(1, 'Frente do documento');
    await templatesPage.selectItemTipo(1, 'documento');
    await templatesPage.fillItemTamanho(1, '5');
    await templatesPage.clickAdicionarItem();
    await templatesPage.fillItemDescricao(2, 'Assinatura do titular');
    await templatesPage.selectItemTipo(2, 'assinatura');

    // 3. submeter o formulário
    await templatesPage.submit();

    // 4. verificar a resposta (feedback da ação)
    const sucesso = await templatesPage.waitForSuccessMessage();
    expect(sucesso).toContain(`Template "${nome}" criado.`);
    await takeScreenshot(driver, `template-criado-${sufixo}`);

    // 5. verificar o resultado persistido via contrato/API
    await driver.sleep(500);
    const viaApi = await apiGetTemplates();
    const encontrado = viaApi.find((t) => t.nome === nome);
    expect(encontrado).toBeDefined();
    expect(encontrado!.itens).toHaveLength(2);

    // 6. verificar o resultado na UI (espelhado)
    expect(await templatesPage.hasTemplate(nome)).toBe(true);

    // persistência após reload (não é só estado de memória)
    await templatesPage.open();
    expect(await templatesPage.hasTemplate(nome)).toBe(true);
    expect(await templatesPage.getTemplateNameInList()).toContain(nome);
    await takeScreenshot(driver, `template-listado-${sufixo}`);
  }, 60_000);

  it('validação: template sem itens é impedido com mensagem orientativa', async () => {
    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();

    await templatesPage.open();
    await templatesPage.clickNovoTemplate();
    await templatesPage.fillNome(`E2E Sem Itens ${Date.now()}`);
    await templatesPage.submit();

    const erro = await templatesPage.getErrorMessage();
    expect(erro).toContain('Adicione ao menos um item');
    await takeScreenshot(driver, `template-sem-itens-${Date.now()}`);
  }, 60_000);
});