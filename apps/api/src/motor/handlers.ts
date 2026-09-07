/**
 * SRV-15 · Handlers da fila para o motor do ciclo (consomem infra SRV-8).
 * Todo acesso a dados via conexão contextualizada por tenant (padrão RUNBOOK §8);
 * auditoria em toda ação (CA-04); idempotência por chave determinística (CA-05).
 */
import type { Client } from 'pg';

import { enqueue, type Job } from '@servium-ia/db';
import {
  LIMITES_PADRAO,
  chaveCobranca,
  decidirAcao,
  podeTransicionar,
  type EstadoItem,
  type LimitesConfig,
} from './engine';
import type { CommunicationChannel } from './channel';

export interface MotorDeps {
  channel: CommunicationChannel;
  remetentePadrao?: string;
  /** Identidade de serviço do Funcionário Digital (PRM-P0.3-C). */
  serviceId?: string;
}

type Handler = (job: Job, ctx: Client) => Promise<void>;

/**
 * PRM-P0.3-C · Registra evento de auditoria. Quando um `serviceId` é fornecido
 * (job originado no worker/runtime em nome do Funcionário Digital), o evento
 * é atribuído a `actor_type='servico'` + `actor_id=serviceId`, distinguindo do
 * `sistema` (infra). Sem `serviceId`, mantém `actor_type='sistema'` (default).
 */
async function auditar(
  ctx: Client,
  tenantId: string,
  entidade: string,
  entidadeId: string,
  acao: string,
  detalhes: Record<string, unknown> = {},
  serviceId?: string
): Promise<void> {
  await ctx.query(
    `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      tenantId,
      serviceId ? 'servico' : 'sistema',
      serviceId ?? null,
      entidade,
      entidadeId,
      acao,
      JSON.stringify(detalhes),
    ]
  );
}

function limitesDe(raw: unknown): LimitesConfig {
  return { ...LIMITES_PADRAO, ...(typeof raw === 'object' && raw ? raw : {}) } as LimitesConfig;
}

/** CA-01 · ativação: materializa itens do checklist no ciclo (idempotente). */
export const ativarCiclo =
  (serviceId?: string): Handler =>
  async (job, ctx) => {
    const cicloId = String(job.payload.ciclo_id);
    const { rows: alvo } = await ctx.query<{ template_id: string | null }>(
      `SELECT o.template_id FROM ciclos c JOIN obrigacoes o ON o.id = c.obrigacao_id WHERE c.id=$1 AND c.estado='aberto'`,
      [cicloId]
    );
    if (!alvo[0]) return; // ciclo inexistente/encerrado ⇒ nada a fazer
    if (!alvo[0].template_id) {
      await auditar(ctx, job.tenant_id, 'ciclo', cicloId, 'ativacao_sem_template', {}, serviceId);
      return;
    }
    // guarda de idempotência: itens já existentes não são recriados
    const { rowCount: existentes } = await ctx.query('SELECT 1 FROM itens_ciclo WHERE ciclo_id=$1 LIMIT 1', [cicloId]);
    if (existentes) return;
    await ctx.query('BEGIN');
    try {
      await ctx.query(
        `INSERT INTO itens_ciclo (tenant_id, ciclo_id, item_template_id)
         SELECT $1,$2,id FROM itens_template WHERE tenant_id=$1 AND template_id=$3 ORDER BY ordem`,
        [job.tenant_id, cicloId, alvo[0].template_id]
      );
      await auditar(ctx, job.tenant_id, 'ciclo', cicloId, 'ativar', {}, serviceId);
      // auto-encadeia a varredura DENTRO da transação: ação+evento+efeito como unidade (sem job órfão)
      await enqueue(ctx, { tipo: 'ciclo.tick', payload: { ciclo_id: cicloId }, idempotencyKey: `tick:${cicloId}:pos-ativar` });
      await ctx.query('COMMIT');
    } catch (err) {
      await ctx.query('ROLLBACK');
      throw err;
    }
  };

/**
 * CA-02/CA-03/CA-06 · decisão + execução de cobrança de UM item.
 * Retry TÉCNICO = falha do job (fila SRV-8); retry SOCIAL = rodada nova
 * decidida pelo motor — contagens separadas conforme OPERATIONAL_FLOW.
 */
export const cobrarItem =
  (deps: MotorDeps): Handler =>
  async (job, ctx) => {
    const itemId = String(job.payload.item_ciclo_id);
    const { rows: dados } = await ctx.query<{
      id: string;
      estado: EstadoItem;
      tentativas: number;
      ultima_cobranca_em: Date | null;
      config: unknown;
      email: string | null;
      descricao: string;
      cliente_nome: string;
    }>(
      `SELECT i.id, i.estado, i.tentativas,
              (SELECT MAX(m.criado_em) FROM mensagens_comunicacao m WHERE m.item_ciclo_id=i.id AND m.direcao='envio') AS ultima_cobranca_em,
              c.config, cli.email, it.descricao, cli.nome AS cliente_nome
         FROM itens_ciclo i
         JOIN ciclos c   ON c.id = i.ciclo_id
         JOIN obrigacoes o ON o.id = c.obrigacao_id
         LEFT JOIN itens_template it ON it.id = i.item_template_id
         JOIN clientes cli ON cli.id = o.cliente_id
        WHERE i.id=$1 AND c.estado='aberto'`,
      [itemId]
    );
    const item = dados[0];
    if (!item || !item.email) return;

    const cfg = limitesDe(item.config);
    const decisao = decidirAcao(
      { estado: item.estado, tentativas: item.tentativas, ultima_cobranca_em: item.ultima_cobranca_em },
      cfg,
      new Date()
    );

    if (decisao.acao === 'nada' || decisao.acao === 'aguardar') {
      await auditar(ctx, job.tenant_id, 'item_ciclo', itemId, 'decisao', { acao: decisao.acao, motivo: decisao.motivo }, deps.serviceId);
      return;
    }

    if (decisao.acao === 'escalar') {
      // transição automática aguardando→excecao (limite social esgotado)
      if (!podeTransicionar(item.estado, 'excecao')) return;
      await ctx.query('BEGIN');
      try {
        const { rows } = await ctx.query(
          `UPDATE itens_ciclo SET estado='excecao', atualizado_em=now()
            WHERE id=$1 AND estado=$2 RETURNING id`,
          [itemId, item.estado]
        );
        if (rows.length === 0) {
          await ctx.query('ROLLBACK');
          return; // perdeu corrida ⇒ outro worker tratou
        }
        await ctx.query(
          `INSERT INTO excecoes (tenant_id, item_ciclo_id, tipo, motivo, contexto)
           VALUES ($1,$2,'escalada_limite',$3,$4)`,
          [job.tenant_id, itemId, decisao.motivo, JSON.stringify({ tentativas: item.tentativas })]
        );
        await auditar(ctx, job.tenant_id, 'item_ciclo', itemId, 'escalar', { motivo: decisao.motivo }, deps.serviceId);
        await ctx.query('COMMIT');
      } catch (err) {
        await ctx.query('ROLLBACK');
        throw err;
      }
      return;
    }

    // ação = cobrar (CA-05: chave determinística por rodada social)
    const chave = chaveCobranca(itemId, item.tentativas + 1);
    const dupe = await ctx.query('SELECT 1 FROM mensagens_comunicacao WHERE tenant_id=$1 AND idempotency_key=$2', [
      job.tenant_id,
      chave,
    ]);
    if (dupe.rowCount) return; // já cobrado nesta rodada ⇒ tick repetido não duplica

    // PRM-P0.1-E · token de correlação codificando o item e a rodada: quando o
    // cliente responder citando o "Identificador", o runtime vincula a resposta.
    const tokenCorrelacao = `t:${itemId}:r${item.tentativas + 1}`;

    const resultado = await deps.channel.enviar({
      destinatario: item.email,
      assunto: `Pendência documental: ${item.descricao}`,
      corpo: `Olá ${item.cliente_nome}, precisamos de: ${item.descricao}.\n\nIdentificador: ${tokenCorrelacao}`,
      idempotencyKey: chave,
      tokenCorrelacao,
    });

    if (!resultado.ok) {
      // falha TÉCNICA transitória ⇒ propaga p/ fila (backoff SRV-8), sem tocar cliente
      throw new Error(`canal falhou: ${resultado.erro}`);
    }

    // Para canal síncrono (FakeChannel / pilot): envio + registro = atômico ⇒ vai direto aguardando.
    // Canal assíncrono real (#18) passaria por cobrado → aguardando em dois steps.
    if (!podeTransicionar(item.estado, "aguardando")) return;
    const novoEstado = "aguardando";
    await ctx.query('BEGIN');
    try {
      const upd = await ctx.query(
        `UPDATE itens_ciclo SET estado=$2, tentativas=tentativas+1, atualizado_em=now()
          WHERE id=$1 AND estado=$3 RETURNING id`,
        [itemId, novoEstado, item.estado]
      );
      if (upd.rowCount === 0) {
        await ctx.query('ROLLBACK');
        return;
      }
      await ctx.query(
        `INSERT INTO mensagens_comunicacao
           (tenant_id, item_ciclo_id, direcao, canal, destinatario, remetente, message_id, idempotency_key, token_correlacao, status)
         VALUES ($1,$2,'envio','email',$3,$4,$5,$6,$7,'enviado')`,
        [
          job.tenant_id,
          itemId,
          item.email,
          deps.remetentePadrao ?? 'assistente@servium.local',
          resultado.messageId ?? null,
          chave,
          tokenCorrelacao,
        ]
      );
      await auditar(ctx, job.tenant_id, 'item_ciclo', itemId, 'cobrar', { rodada: item.tentativas + 1 }, deps.serviceId);
      await ctx.query('COMMIT');
    } catch (err) {
      await ctx.query('ROLLBACK');
      throw err;
    }
  };

/** Varredura periódica (CA-05): enfileira cobranças elegíveis — chaves determinísticas. */
export const tickCiclos = (serviceId?: string): Handler => async (job, ctx) => {
  void job;
  const { rows: elegiveis } = await ctx.query<{ id: string; estado: EstadoItem; tentativas: number; config: unknown }>(
    `SELECT i.id, i.estado, i.tentativas, c.config
       FROM itens_ciclo i JOIN ciclos c ON c.id=i.ciclo_id
      WHERE c.estado='aberto' AND i.estado IN ('pendente','aguardando')`
  );
  const agora = new Date();
  let agendou = false;
  for (const item of elegiveis) {
    const d = decidirAcao(
      { estado: item.estado, tentativas: item.tentativas, ultima_cobranca_em: null },
      limitesDe(item.config),
      agora
    );
    if (d.acao === 'cobrar' || d.acao === 'escalar') {
      // idempotência dupla: chave por rodada + dedup de jobs ativos
      await enqueue(ctx, {
        tipo: 'item.cobrar',
        payload: { item_ciclo_id: item.id },
        idempotencyKey: `tick:${item.id}:r${item.tentativas + 1}`,
      });
      agendou = true;
    }
  }
  // varredura sem elegíveis ⇒ se o tick é de um ciclo específico, tenta encerrar (CA-06)
  if (!agendou && typeof job.payload.ciclo_id === 'string') {
    await ctx.query('BEGIN');
    try {
      const { rowCount } = await ctx.query(
        `UPDATE ciclos SET estado='encerrado', encerrado_em=now()
          WHERE id=$1 AND estado='aberto'
            AND NOT EXISTS (
              SELECT 1 FROM itens_ciclo WHERE ciclo_id=$1 AND estado NOT IN ('resolvido','cancelado','excecao'))`,
        [job.payload.ciclo_id]
      );
      if (rowCount) await auditar(ctx, job.tenant_id, 'ciclo', job.payload.ciclo_id, 'encerrar', {}, serviceId);
      await ctx.query('COMMIT');
    } catch (err) {
      await ctx.query('ROLLBACK');
      throw err;
    }
  }
};

/** CA-06 · encerramento: todos os itens em estado final ⇒ ciclo encerrado. */
export const encerrarCiclo =
  (serviceId?: string): Handler =>
  async (job, ctx) => {
    const cicloId = String(job.payload.ciclo_id);
    const { rows } = await ctx.query<{ abertos: string }>(
      `SELECT count(*) FILTER (WHERE estado NOT IN ('resolvido','cancelado','excecao'))::text AS abertos
         FROM itens_ciclo WHERE ciclo_id=$1`,
      [cicloId]
    );
    if (rows[0]?.abertos !== '0') return;
    await ctx.query('BEGIN');
    try {
      const upd = await ctx.query(
        `UPDATE ciclos SET estado='encerrado', encerrado_em=now()
          WHERE id=$1 AND estado='aberto' RETURNING id`,
        [cicloId]
      );
      if (upd.rowCount) await auditar(ctx, job.tenant_id, 'ciclo', cicloId, 'encerrar', {}, serviceId);
      await ctx.query('COMMIT');
    } catch (err) {
      await ctx.query('ROLLBACK');
      throw err;
    }
  };

export function registrarMotorHandlers(deps: MotorDeps): Map<string, Handler> {
  return new Map([
    ['ciclo.ativar', ativarCiclo(deps.serviceId)],
    ['item.cobrar', cobrarItem(deps)],
    ['ciclo.tick', tickCiclos(deps.serviceId)],
    ['ciclo.encerrar', encerrarCiclo(deps.serviceId)],
  ]);
}
