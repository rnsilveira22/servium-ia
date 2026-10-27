import { describe, expect, it } from 'vitest';

import { LIMITE_LISTA, montarResumo } from '../src/cadastro/resumo-diario';
import { horaNoFuso } from '../src/common/fuso';
import type { ResumoCliente } from '../src/cadastro/semaforo';

const HOJE = '2026-10-27';
const ATIVIDADE = { cobrancas_24h: 3, respostas_24h: 1 };

function c(parcial: Partial<ResumoCliente>): ResumoCliente {
  return {
    cliente_id: 'id',
    cliente: 'Acme SA',
    ciclos_abertos: 1,
    itens: 3,
    resolvidos: 1,
    pendentes: 2,
    excecoes: 0,
    prazo_proximo: '2026-11-30',
    semaforo: 'verde',
    dias_para_prazo: 34,
    motivo: 'faltam 2 itens; prazo em 34 dias',
    ...parcial,
  };
}

describe('montarResumo', () => {
  it('lista vermelhos antes dos amarelos, com motivo, e conta no assunto', () => {
    const r = montarResumo({
      hoje: HOJE,
      atividade: ATIVIDADE,
      painel: [
        c({ cliente: 'Cliente V', semaforo: 'vermelho', motivo: '1 exceção aguardando sua decisão' }),
        c({ cliente: 'Cliente A', semaforo: 'amarelo', motivo: 'faltam 2 itens; prazo em 5 dias' }),
        c({ cliente: 'Cliente Verde', semaforo: 'verde' }),
      ],
    });
    expect(r.precisaAtencao).toBe(true);
    expect(r.assunto).toBe('Servium IA — resumo de 27/10: 2 clientes precisam de atenção');
    expect(r.corpo.indexOf('Precisam de você hoje (1)')).toBeLessThan(r.corpo.indexOf('Para acompanhar (1)'));
    expect(r.corpo).toContain('• Cliente V — 1 exceção aguardando sua decisão');
    expect(r.corpo).toContain('• Cliente A — faltam 2 itens; prazo em 5 dias');
    expect(r.corpo).not.toContain('Cliente Verde —'); // verde não polui o resumo
  });

  it('singular no assunto quando só um cliente precisa de atenção', () => {
    const r = montarResumo({ hoje: HOJE, atividade: ATIVIDADE, painel: [c({ semaforo: 'vermelho' })] });
    expect(r.assunto).toContain('1 cliente precisa de atenção');
  });

  it('tudo em dia: assunto e corpo próprios, sem seções de atenção', () => {
    const r = montarResumo({ hoje: HOJE, atividade: ATIVIDADE, painel: [c({}), c({ cliente: 'Outro' })] });
    expect(r.precisaAtencao).toBe(false);
    expect(r.assunto).toBe('Servium IA — resumo de 27/10: tudo em dia');
    expect(r.corpo).toContain('Tudo em dia: 2 clientes sem pendência urgente.');
    expect(r.corpo).not.toContain('Precisam de você');
  });

  it('sem ciclos abertos', () => {
    const r = montarResumo({ hoje: HOJE, atividade: ATIVIDADE, painel: [] });
    expect(r.corpo).toContain('Nenhum ciclo aberto no momento.');
  });

  it('inclui atividade das últimas 24 h com concordância', () => {
    const um = montarResumo({ hoje: HOJE, atividade: { cobrancas_24h: 1, respostas_24h: 1 }, painel: [] });
    expect(um.corpo).toContain('1 cobrança enviada e 1 resposta de cliente recebida');
    const varios = montarResumo({ hoje: HOJE, atividade: { cobrancas_24h: 0, respostas_24h: 4 }, painel: [] });
    expect(varios.corpo).toContain('0 cobranças enviadas e 4 respostas de clientes recebidas');
  });

  it('trunca listas longas e informa quantos ficaram de fora', () => {
    const muitos = Array.from({ length: LIMITE_LISTA + 3 }, (_, i) => c({ cliente: `Cli ${i}`, semaforo: 'vermelho' }));
    const r = montarResumo({ hoje: HOJE, atividade: ATIVIDADE, painel: muitos });
    expect(r.corpo).toContain(`Precisam de você hoje (${LIMITE_LISTA + 3})`);
    expect(r.corpo).toContain('…e mais 3');
    expect(r.corpo).not.toContain(`Cli ${LIMITE_LISTA} —`);
  });

  it('deixa claro que é mensagem ao responsável e usa o dia da semana em português', () => {
    const r = montarResumo({ hoje: HOJE, atividade: ATIVIDADE, painel: [] });
    expect(r.corpo).toContain('terça-feira, 27/10/2026');
    expect(r.corpo).toContain('Nenhum cliente recebe este resumo');
  });
});

describe('horaNoFuso', () => {
  it('converte para o horário de Brasília (UTC-3)', () => {
    expect(horaNoFuso(new Date('2026-10-27T11:00:00Z'))).toBe(8);
    expect(horaNoFuso(new Date('2026-10-27T02:59:00Z'))).toBe(23); // ainda dia 26 em BRT
    expect(horaNoFuso(new Date('2026-10-27T03:00:00Z'))).toBe(0); // meia-noite: 0, nunca 24
  });
});
