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

  /** B-1 · Aguarda um item exibir o badge de estado esperado e devolve o texto. */
  async itemBadge(descricao: string, esperado: string): Promise<string> {
    const el = await this.driver.findElement(
      By.xpath(`//tr[td[text()="${descricao}"]][1]//span[contains(@class,'badge')]`),
    );
    await this.driver.wait(until.elementTextContains(el, esperado), 8000);
    return el.getText();
  }

  /** B-1 · Ações de validação do item recebido estão visíveis. */
  async hasValidarConcluirButton(): Promise<boolean> {
    try {
      await this.driver.wait(
        until.elementLocated(By.xpath('//button[normalize-space(.)="Validar e concluir"]')),
        8000,
      );
      return true;
    } catch {
      return false;
    }
  }

  async hasEncaminharParaAnaliseButton(): Promise<boolean> {
    try {
      await this.driver.wait(
        until.elementLocated(By.xpath('//button[normalize-space(.)="Encaminhar para análise"]')),
        8000,
      );
      return true;
    } catch {
      return false;
    }
  }

  /** B-1 · Inicia a validação positiva (recebido → resolvido) e confirma no modal. */
  async validarConcluir(): Promise<void> {
    await this.driver.findElement(By.xpath('//button[normalize-space(.)="Validar e concluir"]')).click();
    await this.confirmarModal();
  }

  /** B-1 · Encaminha para análise (recebido → excecao), com motivo opcional. */
  async encaminharParaAnalise(motivo?: string): Promise<void> {
    await this.driver.findElement(By.xpath('//button[normalize-space(.)="Encaminhar para análise"]')).click();
    if (motivo) {
      const textarea = await this.driver.wait(
        until.elementLocated(By.css('#motivo-validacao')),
        8000,
      );
      await textarea.sendKeys(motivo);
    }
    await this.confirmarModal();
  }

  /** B-1 · Confirma a ação no modal de confirmação. */
  async confirmarModal(): Promise<void> {
    const confirmar = await this.driver.wait(
      until.elementLocated(By.xpath('//div[contains(@class,"modal")]//button[normalize-space(.)="Confirmar"]')),
      8000,
    );
    await confirmar.click();
    await this.driver.wait(until.elementLocated(By.css('.alert-success')), 8000);
  }
}