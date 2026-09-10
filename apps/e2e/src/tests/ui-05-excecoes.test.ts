import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { createDriver } from '../support/driver.js';
import { takeScreenshot } from '../support/evidence.js';
import { LoginPage } from '../pages/LoginPage.js';
import { LayoutPage } from '../pages/LayoutPage.js';
import { ExcecoesPage } from '../pages/ExcecoesPage.js';
import type { WebDriver } from 'selenium-webdriver';
import { ENV } from '../config/env.js';

const ADMIN_URL =
  process.env.DATABASE_URL ?? 'postgres://servium:servium_dev@localhost:5432/servium_m1_a';

interface FixtureExcecao {
  clienteId: string;
  templateId: string;
  obrigacaoId: string;
  cicloId: string;
  itemCicloId: string;
}

let driver: WebDriver;
let loginPage: LoginPage;
let layoutPage: LayoutPage;
let excecoesPage: ExcecoesPage;

async function criarFixtureExcecao(): Promise<FixtureExcecao> {
  const client = new pg.Client({ connectionString: ADMIN_URL });
  await client.connect();
  try {
    const tenant = (
      await client.query<{ id: string }>(`SELECT id FROM tenants WHERE slug='dev-corp' LIMIT 1`)
    ).rows[0]!.id;
    const sufixo = Date.now();

    const cliente = (
      await client.query<{ id: string }>(
        `INSERT INTO clientes (tenant_id, nome, email) VALUES ($1,$2,$3) RETURNING id`,
        [tenant, `E2E Exceção ${sufixo}`, `excecao-${sufixo}@e2e.local`]
      )
    ).rows[0]!.id;

    const template = (
      await client.query<{ id: string }>(
        `INSERT INTO checklist_templates (tenant_id, nome, canal) VALUES ($1,$2,'email') RETURNING id`,
        [tenant, `Template Exceção ${sufixo}`]
      )
    ).rows[0]!.id;

    const itemTemplate = (
      await client.query<{ id: string }>(
        `INSERT INTO itens_template (tenant_id, template_id, descricao, tipo_esperado, ordem)
         VALUES ($1,$2,$3,'documento',1) RETURNING id`,
        [tenant, template, 'Comprovante de endereço']
      )
    ).rows[0]!.id;

    const obrigacao = (
      await client.query<{ id: string }>(
        `INSERT INTO obrigacoes (tenant_id, cliente_id, descricao, template_id)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [tenant, cliente, `Obrigação Exceção ${sufixo}`, template]
      )
    ).rows[0]!.id;

    const ciclo = (
      await client.query<{ id: string }>(
        `INSERT INTO ciclos (tenant_id, obrigacao_id, estado) VALUES ($1,$2,'aberto') RETURNING id`,
        [tenant, obrigacao]
      )
    ).rows[0]!.id;

    const itemCiclo = (
      await client.query<{ id: string }>(
        `INSERT INTO itens_ciclo (tenant_id, ciclo_id, item_template_id, estado, tentativas)
         VALUES ($1,$2,$3,'excecao',3) RETURNING id`,
        [tenant, ciclo, itemTemplate]
      )
    ).rows[0]!.id;

    await client.query(
      `INSERT INTO excecoes (tenant_id, item_ciclo_id, tipo, motivo, contexto)
       VALUES ($1,$2,'escalada_limite',$3,$4)`,
      [tenant, itemCiclo, 'tentativas sociais esgotadas (3/3)', JSON.stringify({ tentativas: 3 })]
    );

    return { clienteId: cliente, templateId: template, obrigacaoId: obrigacao, cicloId: ciclo, itemCicloId: itemCiclo };
  } finally {
    await client.end();
  }
}

async function limparFixture(f: FixtureExcecao): Promise<void> {
  const client = new pg.Client({ connectionString: ADMIN_URL });
  await client.connect();
  try {
    await client.query('DELETE FROM excecoes WHERE item_ciclo_id=$1', [f.itemCicloId]);
    await client.query('DELETE FROM itens_ciclo WHERE id=$1', [f.itemCicloId]);
    await client.query('DELETE FROM ciclos WHERE id=$1', [f.cicloId]);
    await client.query('DELETE FROM obrigacoes WHERE id=$1', [f.obrigacaoId]);
    await client.query('DELETE FROM itens_template WHERE template_id=$1', [f.templateId]);
    await client.query('DELETE FROM checklist_templates WHERE id=$1', [f.templateId]);
    await client.query('DELETE FROM clientes WHERE id=$1', [f.clienteId]);
  } finally {
    await client.end();
  }
}

interface ItemCicloApi {
  id: string;
  estado: string;
}

function apiGetCiclo(cicloId: string): Promise<{ itens: ItemCicloApi[] }> {
  return driver.executeScript(
    `return fetch(${JSON.stringify(`${ENV.API_URL}/ciclos/${cicloId}`)}, { credentials: 'include' })
      .then((r) => r.json())
      .catch(() => null);`,
  ) as Promise<{ itens: ItemCicloApi[] }>;
}

function estadoDoItem(ciclo: { itens: ItemCicloApi[] }, itemId: string): string {
  const item = ciclo.itens.find((i) => i.id === itemId);
  if (!item) throw new Error(`item ${itemId} não encontrado no detalhe do ciclo`);
  return item.estado;
}

let fixture: FixtureExcecao;

beforeAll(async () => {
  fixture = await criarFixtureExcecao();
  driver = await createDriver();
  loginPage = new LoginPage(driver);
  layoutPage = new LayoutPage(driver);
  excecoesPage = new ExcecoesPage(driver);
});

afterAll(async () => {
  await driver?.quit();
  await limparFixture(fixture);
});

beforeEach(async () => {
  await driver.manage().deleteAllCookies();
});

describe('M1-UI-05 · exceções explicadas + ações com confirmação (jornada real)', () => {
  it('exceção escalada_limite aparece com motivo em linguagem de negócio (sem JSON cru) e Resolver altera estado persistido + UI', async () => {
    // abre /excecoes e localiza o card da exceção criada
    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();
    await excecoesPage.open();
    await excecoesPage.waitForExcecaoLoaded();

    // motivo em linguagem de negócio: nem tipo técnico nem JSON cru como principal
    expect(await excecoesPage.getMotivoRotulo()).toBe('Tentativas esgotadas');
    expect(await excecoesPage.getMotivoExplicacao()).toBe('Nenhuma resposta após 3 tentativas.');
    expect(await excecoesPage.getItemDescricao()).toBe('Comprovante de endereço');
    await takeScreenshot(driver, `excecao-card-${Date.now()}`);

    // abre o modal Decidir/Resolver — explica a consequência; ação NÃO executa antes da confirmação
    await excecoesPage.clickResolver();
    await excecoesPage.waitForModal();
    expect(await excecoesPage.getModalTitle()).toBe('Resolver item');
    const modalContent = await excecoesPage.getModalContent();
    expect(modalContent).toMatch(/marcado como Concluído/i);
    expect(modalContent).toMatch(/não enviará novas solicitações/i);
    await takeScreenshot(driver, `excecao-modal-decidir-${Date.now()}`);

    await excecoesPage.confirmAction();

    // feedback de sucesso pós-ação
    const sucesso = await excecoesPage.waitForSuccessMessage();
    expect(sucesso).toContain('Item concluído. A exceção foi resolvida.');

    // o resultado persiste via contrato/API: item sai de exceção
    await driver.sleep(600);
    const ciclo = await apiGetCiclo(fixture.cicloId);
    expect(estadoDoItem(ciclo, fixture.itemCicloId)).toBe('resolvido');

    // a UI reflete o novo estado (exceção removida da lista)
    await excecoesPage.open();
    expect(await excecoesPage.hasNoExcecoes()).toBe(true);
    await takeScreenshot(driver, `excecao-resolvida-${Date.now()}`);
  }, 90_000);

  it('modal de Cancelar explica a consequência e só executa após confirmação', async () => {
    // recria a exceção após o fluxo de Resolver (o decidir anterior consumiu a exceção)
    fixture = await criarFixtureExcecao();

    await loginPage.loginAsAuthed(ENV.SLUG, ENV.EMAIL, ENV.PASSWORD);
    await layoutPage.waitForAuthenticated();
    await excecoesPage.open();
    await excecoesPage.waitForExcecaoLoaded();

    await excecoesPage.clickCancelar();
    await excecoesPage.waitForModal();
    expect(await excecoesPage.getModalTitle()).toBe('Cancelar item');
    const modalContent = await excecoesPage.getModalContent();
    expect(modalContent).toMatch(/marcado como Cancelado/i);
    expect(modalContent).toMatch(/nenhuma nova solicitação/i);

    await excecoesPage.confirmAction();

    const sucesso = await excecoesPage.waitForSuccessMessage();
    expect(sucesso).toContain('Item cancelado.');

    await driver.sleep(600);
    const ciclo = await apiGetCiclo(fixture.cicloId);
    expect(estadoDoItem(ciclo, fixture.itemCicloId)).toBe('cancelado');

    await excecoesPage.open();
    expect(await excecoesPage.hasNoExcecoes()).toBe(true);
    await takeScreenshot(driver, `excecao-cancelada-${Date.now()}`);
  }, 90_000);
});