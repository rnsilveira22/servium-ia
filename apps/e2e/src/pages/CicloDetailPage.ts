import { By, until, type WebDriver } from 'selenium-webdriver';

export class CicloDetailPage {
  private driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  /** Abre o detalhe do ciclo clicando em "Detalhes" na linha da lista. */
  async openByRow(clienteNome: string, descricao: string): Promise<void> {
    const row = await this.driver.findElement(
      By.xpath(`//tr[td[text()="${clienteNome}"] and td[text()="${descricao}"]]`),
    );
    await row.findElement(By.linkText('Detalhes')).click();
    const h1 = await this.driver.wait(until.elementLocated(By.css('.page-header h1')), 8000);
    await this.driver.wait(until.elementTextContains(h1, `Ciclo de ${clienteNome} — ${descricao}`), 8000);
  }

  /** Cabeçalho em linguagem de negócio (sem UUID). */
  async heading(): Promise<string> {
    return this.driver.findElement(By.css('.page-header h1')).getText();
  }

  async hasSection(titulo: string): Promise<boolean> {
    try {
      await this.driver.wait(
        until.elementLocated(By.xpath(`//h2[normalize-space(.)="${titulo}"]`)),
        8000,
      );
      return true;
    } catch {
      return false;
    }
  }

  async hasError(): Promise<boolean> {
    return (await this.driver.findElements(By.css('.alert-error'))).length > 0;
  }

  async currentUrl(): Promise<string> {
    return this.driver.getCurrentUrl();
  }

  /** #73 · Tem botão "Cancelar ciclo" (ciclo aberto). */
  async hasCancelarCicloButton(): Promise<boolean> {
    try {
      await this.driver.wait(
        until.elementLocated(By.xpath('//button[normalize-space(.)="Cancelar ciclo"]')),
        8000,
      );
      return true;
    } catch {
      return false;
    }
  }

  /** #73 · Abre o modal e confirma o cancelamento (motivo opcional). */
  async cancelarCiclo(motivo?: string): Promise<void> {
    await this.driver.findElement(By.xpath('//button[normalize-space(.)="Cancelar ciclo"]')).click();
    if (motivo) {
      const textarea = await this.driver.wait(
        until.elementLocated(By.css('#motivo-cancelar')),
        8000,
      );
      await textarea.sendKeys(motivo);
    }
    await this.driver.findElement(By.xpath('//button[normalize-space(.)="Confirmar cancelamento"]')).click();
    await this.driver.wait(until.elementLocated(By.css('.alert-success')), 8000);
  }

  /** #73 · Label do status exibido no badge. */
  async statusLabel(): Promise<string> {
    const el = await this.driver.findElement(By.css('table .badge'));
    return el.getText();
  }
}