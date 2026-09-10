import { By, until, type WebDriver } from 'selenium-webdriver';
import { ENV } from '../config/env.js';

export class TemplatesPage {
  private driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  async open(): Promise<void> {
    await this.driver.get(`${ENV.WEB_URL}/templates`);
    await this.driver.wait(until.elementLocated(By.css('.page-header h1')), 8000);
  }

  async clickNovoTemplate(): Promise<void> {
    const btn = this.driver.findElement(By.xpath('//button[contains(text(),"Novo template")]'));
    await btn.click();
    await this.driver.wait(until.elementLocated(By.css('form.form-template')), 5000);
  }

  async fillNome(nome: string): Promise<void> {
    const input = this.driver.findElement(By.css('[data-testid="template-nome"]'));
    await input.clear();
    await input.sendKeys(nome);
  }

  async clickAdicionarItem(): Promise<void> {
    const btn = this.driver.findElement(By.xpath('//button[contains(text(),"Adicionar item")]'));
    await btn.click();
    await this.driver.sleep(300);
  }

  async fillItemDescricao(itemIndex: number, descricao: string): Promise<void> {
    const label = this.driver.findElement(
      By.xpath(`//label[contains(.,'Item ${itemIndex} · Descrição')]/input`),
    );
    await label.clear();
    await label.sendKeys(descricao);
  }

  async selectItemTipo(itemIndex: number, tipo: string): Promise<void> {
    const select = this.driver.findElement(
      By.xpath(`//label[contains(.,'Item ${itemIndex} · Tipo esperado')]/select`),
    );
    const option = select.findElement(By.xpath(`.//option[@value="${tipo}"]`));
    await option.click();
  }

  async fillItemTamanho(itemIndex: number, tamanhoMb: string): Promise<void> {
    const input = this.driver.findElement(
      By.xpath(`//label[contains(.,'Item ${itemIndex} · Tamanho máximo')]/input`),
    );
    await input.clear();
    await input.sendKeys(tamanhoMb);
  }

  async submit(): Promise<void> {
    const btn = this.driver.findElement(By.xpath('//button[contains(text(),"Salvar template")]'));
    await btn.click();
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

  async hasTemplate(nome: string): Promise<boolean> {
    try {
      await this.driver.wait(
        until.elementLocated(By.xpath(`//td[text()="${nome}"]`)),
        8000,
      );
      return true;
    } catch {
      return false;
    }
  }

  async getTemplateNameInList(): Promise<string[]> {
    const rows = await this.driver.findElements(By.css('table tbody tr td:first-child'));
    const names: string[] = [];
    for (const row of rows) {
      names.push(await row.getText());
    }
    return names;
  }
}
