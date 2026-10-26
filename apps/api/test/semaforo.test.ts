import { describe, expect, it } from 'vitest';

import {
  classificar,
  diasEntre,
  hojeNoFuso,
  montarPainel,
  type ResumoClienteBruto,
} from '../src/cadastro/semaforo';

const HOJE = '2026-10-26';

function cliente(parcial: Partial<ResumoClienteBruto> = {}): ResumoClienteBruto {
  return {
    cliente_id: 'c-1',
    cliente: 'Acme SA',
    ciclos_abertos: 1,
    itens: 4,
    resolvidos: 2,
    pendentes: 2,
    excecoes: 0,
    prazo_proximo: '2026-11-20',
    ...parcial,
  };
}

describe('diasEntre', () => {
  it('calcula diferença em dias, inclusive atravessando mês e negativa', () => {
    expect(diasEntre('2026-10-26', '2026-10-26')).toBe(0);
    expect(diasEntre('2026-10-26', '2026-11-02')).toBe(7);
    expect(diasEntre('2026-10-26', '2026-10-23')).toBe(-3);
  });
});

describe('hojeNoFuso', () => {
  it('usa o fuso de São Paulo (23h30 de 26/10 em BRT ainda é dia 26)', () => {
    // 2026-10-27T02:30Z = 26/10 23:30 em America/Sao_Paulo (UTC-3)
    expect(hojeNoFuso(new Date('2026-10-27T02:30:00Z'))).toBe('2026-10-26');
  });
});

describe('classificar', () => {
  it('vermelho quando há exceção aberta, mesmo com prazo folgado', () => {
    const r = classificar(cliente({ excecoes: 1, pendentes: 0 }), HOJE);
    expect(r.semaforo).toBe('vermelho');
    expect(r.motivo).toContain('1 exceção aguardando');
  });

  it('vermelho quando faltam itens e o prazo vence em até 2 dias', () => {
    const r = classificar(cliente({ prazo_proximo: '2026-10-28' }), HOJE);
    expect(r.semaforo).toBe('vermelho');
    expect(r.dias_para_prazo).toBe(2);
    expect(r.motivo).toBe('faltam 2 itens; prazo em 2 dias');
  });

  it('vermelho quando o prazo já venceu e ainda há pendência', () => {
    const r = classificar(cliente({ prazo_proximo: '2026-10-24', pendentes: 1 }), HOJE);
    expect(r.semaforo).toBe('vermelho');
    expect(r.motivo).toBe('faltam 1 item; prazo vencido há 2 dias');
  });

  it('amarelo quando faltam itens e o prazo vence entre 3 e 7 dias', () => {
    const r = classificar(cliente({ prazo_proximo: '2026-11-02' }), HOJE);
    expect(r.semaforo).toBe('amarelo');
  });

  it('verde quando há pendência mas o prazo é confortável', () => {
    const r = classificar(cliente({ prazo_proximo: '2026-11-10' }), HOJE);
    expect(r.semaforo).toBe('verde');
    expect(r.motivo).toBe('faltam 2 itens; prazo em 15 dias');
  });

  it('verde quando há pendência sem prazo definido', () => {
    const r = classificar(cliente({ prazo_proximo: null }), HOJE);
    expect(r.semaforo).toBe('verde');
    expect(r.dias_para_prazo).toBeNull();
    expect(r.motivo).toContain('sem prazo definido');
  });

  it('verde "tudo em dia" quando nada está pendente', () => {
    const r = classificar(
      cliente({ pendentes: 0, excecoes: 0, resolvidos: 4, prazo_proximo: null }),
      HOJE
    );
    expect(r.semaforo).toBe('verde');
    expect(r.motivo).toBe('Tudo em dia');
  });
});

describe('montarPainel', () => {
  it('ordena vermelho, amarelo, verde e, dentro da cor, o prazo mais próximo primeiro', () => {
    const painel = montarPainel(
      [
        cliente({ cliente_id: '1', cliente: 'Verde', prazo_proximo: '2026-12-01' }),
        cliente({ cliente_id: '2', cliente: 'Amarelo', prazo_proximo: '2026-11-01' }),
        cliente({ cliente_id: '3', cliente: 'Vermelho B', excecoes: 1, prazo_proximo: '2026-10-30' }),
        cliente({ cliente_id: '4', cliente: 'Vermelho A', excecoes: 1, prazo_proximo: '2026-10-27' }),
      ],
      HOJE
    );
    expect(painel.map((p) => p.cliente)).toEqual(['Vermelho A', 'Vermelho B', 'Amarelo', 'Verde']);
  });
});
