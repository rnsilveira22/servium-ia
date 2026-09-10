import { By, until, type WebDriver } from 'selenium-webdriver';
import { ENV } from '../config/env.js';

export class ExcecoesPage {
  private driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  async open(): Promise<void> {
    await this.driver.get(`${ENV.WEB_URL}/excecoes`);
    await this.driver.wait(until.elementLocated(By.css('.page-header h1')), 8000);
  }

  async waitForExcecaoLoaded(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.css('.excecao-card')),
      8000,
    );
  }

  async isEmpty(): Promise<boolean> {
    try {
      await this.driver.wait(
        until.elementLocated(By.css('.empty-state')),
        5000,
      );
      return true;
    } catch {
      return false;
    }
  }

  async getMotivoRotulo(): Promise<string> {
    const badge = await this.driver.wait(
      until.elementLocated(By.css('.excecao-card .badge')),
      8000,
    );
    return badge.getText();
  }

  async getMotivoExplicacao(): Promise<string> {
    const el = await this.driver.wait(
      until.elementLocated(By.css('.excecao-explicacao')),
      8000,
    );
    return el.getText();
  }

  async getClienteNome(): Promise<string> {
    const el = await this.driver.findElement(By.css('.excecao-titulo'));
    return el.getText();
  }

  async getItemDescricao(): Promise<string> {
    const el = await this.driver.findElement(By.css('.excecao-card .text-muted'));
    return el.getText();
  }

  async clickResolver(): Promise<void> {
    const btn = await this.driver.wait(
      until.elementLocated(By.xpath('//div[contains(@class,"excecao-acoes")]//button[contains(text(),"Resolver")]')),
      8000,
    );
    await btn.click();
  }

  async clickReenviar(): Promise<void> {
    const btn = await this.driver.wait(
      until.elementLocated(By.xpath('//div[contains(@class,"excecao-acoes")]//button[contains(text(),"Reenviar")]')),
      8000,
    );
    await btn.click();
  }

  async clickCancelar(): Promise<void> {
    const btn = await this.driver.wait(
      until.elementLocated(By.xpath('//div[contains(@class,"excecao-acoes")]//button[contains(text(),"Cancelar")]')),
      8000,
    );
    await btn.click();
  }

  async waitForModal(): Promise<void> {
    await this.driver.wait(until.elementLocated(By.css('[role="dialog"]')), 5000);
  }

  async getModalTitle(): Promise<string> {
    const dialog = await this.driver.findElement(By.css('[role="dialog"]'));
    const titleId = await dialog.getAttribute('aria-labelledby');
    if (!titleId) throw new Error('Modal sem aria-labelledby');
    const title = await this.driver.findElement(By.id(titleId));
    return title.getText();
  }

  async getModalContent(): Promise<string> {
    const dialog = await this.driver.findElement(By.css('[role="dialog"]'));
    return dialog.getText();
  }

  async confirmAction(): Promise<void> {
    const btns = await this.driver.findElements(By.css('[role="dialog"] button'));
    for (const btn of btns) {
      const text = await btn.getText();
      if (text.startsWith('Confirmar')) {
        await btn.click();
        return;
      }
    }
    throw new Error('Botão de confirmação não encontrado no modal');
  }

  async cancelModal(): Promise<void> {
    const btns = await this.driver.findElements(By.css('[role="dialog"] button'));
    for (const btn of btns) {
      const text = await btn.getText();
      if (text === 'Voltar') {
        await btn.click();
        return;
      }
    }
    throw new Error('Botão Voltar não encontrado no modal');
  }

  async waitForSuccessMessage(): Promise<string> {
    const el = await this.driver.wait(until.elementLocated(By.css('.alert-success')), 8000);
    return el.getText();
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      const el = await this.driver.wait(until.elementLocated(By.css('.alert-error')), 5000);
      return el.getText();
    } catch {
      return null;
    }
  }

  async hasNoExcecoes(): Promise<boolean> {
    try {
      const empty = await this.driver.wait(
        until.elementLocated(By.css('.empty-state')),
        5000,
      );
      const text = await empty.getText();
      return text.includes('Nenhuma exceção registrada');
    } catch {
      return false;
    }
  }
}
