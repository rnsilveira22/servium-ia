import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Client } from 'pg';

import type {
  ChecklistTemplateDTO,
  ClienteDTO,
  CriarChecklistTemplateInput,
  CriarClienteInput,
  CriarObrigacaoInput,
  ObrigacaoDTO,
  TipoEsperado,
} from '@servium-ia/shared-types';
import { RequireAuth, type AuthedRequest } from '../auth/auth.guard';
import { validarEmail } from '../common/email-validation';

const TIPOS: readonly string[] = ['documento', 'informacao', 'assinatura'];

function texto(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

import { auditar } from './audit';

@Controller()
@UseGuards(RequireAuth)
export class CadastroController {
  // req.pg é conexão APP com tenant já contextualizado pelo guard (padrão SRV-7/§8)
  private pg(req: AuthedRequest): Client {
    return req.pg as Client;
  }

  @Post('clientes')
  async criarCliente(@Req() req: AuthedRequest, @Body() body: CriarClienteInput): Promise<ClienteDTO> {
    if (!texto(body?.nome)) throw new BadRequestException('nome obrigatório');
    // DD-08 · e-mail obrigatório + validado (anti-CRLF) para NOVOS clientes.
    const email = validarEmail(body?.email);
    if (!email.ok) throw new BadRequestException(email.motivo);
    const client = this.pg(req);
    const { rows } = await client.query<ClienteDTO>(
      `INSERT INTO clientes (tenant_id, nome, identificacao, email)
       VALUES ($1,$2,$3,$4)
       RETURNING id, nome, identificacao, email, criado_em`,
      [req.sessao!.tenantId, body.nome.trim(), body.identificacao?.trim() ?? null, body.email.trim()]
    );
    const cliente = rows[0];
    if (!cliente) throw new Error('insert sem retorno');
    await auditar(client, req.sessao!.tenantId, req.sessao!.operadorId, 'cliente', cliente.id, 'criar', {
      nome: cliente.nome,
    });
    return cliente;
  }

  @Get('clientes')
  async listarClientes(@Req() req: AuthedRequest): Promise<ClienteDTO[]> {
    const { rows } = await this.pg(req).query<ClienteDTO>(
      'SELECT id, nome, identificacao, email, criado_em FROM clientes ORDER BY criado_em DESC'
    );
    return rows;
  }

  @Post('obrigacoes')
  async criarObrigacao(@Req() req: AuthedRequest, @Body() body: CriarObrigacaoInput): Promise<ObrigacaoDTO> {
    if (!texto(body?.cliente_id) || !texto(body?.descricao)) {
      throw new BadRequestException('cliente_id e descricao obrigatórios');
    }
    const client = this.pg(req);
    // FK ignora RLS da tabela referenciada ⇒ existência do cliente no MESMO
    // tenant precisa ser verificada explicitamente dentro do contexto atual.
    const dono = await client.query('SELECT 1 FROM clientes WHERE id=$1', [body.cliente_id]);
    if (dono.rowCount === 0) throw new BadRequestException('cliente não encontrado neste tenant');

    // M1-OPS-01 · quando template_id vier, ele precisa existir NESTE tenant.
    // A FK de obrigacoes.template_id ignora RLS, então a validação de
    // pertencimento é explícita aqui (nunca confiar apenas na UI).
    let templateId: string | null = null;
    if (body.template_id !== undefined && body.template_id !== null && texto(body.template_id)) {
      const tpl = await client.query('SELECT 1 FROM checklist_templates WHERE id=$1', [body.template_id]);
      if (tpl.rowCount === 0) {
        throw new NotFoundException('template não encontrado neste tenant — verifique o checklist selecionado');
      }
      templateId = body.template_id;
    }

    const { rows } = await client.query<ObrigacaoDTO>(
      `INSERT INTO obrigacoes (tenant_id, cliente_id, descricao, prazo, template_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, cliente_id, descricao, prazo::text, template_id, criado_em`,
      [req.sessao!.tenantId, body.cliente_id, body.descricao.trim(), body.prazo ?? null, templateId]
    );
    const obrigacao = rows[0];
    if (!obrigacao) throw new Error('insert sem retorno');
    await auditar(client, req.sessao!.tenantId, req.sessao!.operadorId, 'obrigacao', obrigacao.id, 'criar', {
      descricao: obrigacao.descricao,
      template_id: obrigacao.template_id,
    });
    let templateNome: string | null = null;
    if (obrigacao.template_id) {
      const t = await client.query<{ nome: string }>('SELECT nome FROM checklist_templates WHERE id=$1', [obrigacao.template_id]);
      templateNome = t.rows[0]?.nome ?? null;
    }
    return { ...obrigacao, template_nome: templateNome };
  }

  @Get('obrigacoes')
  async listarObrigacoes(@Req() req: AuthedRequest): Promise<ObrigacaoDTO[]> {
    const { rows } = await this.pg(req).query<ObrigacaoDTO>(
      `SELECT o.id, o.cliente_id, o.descricao, o.prazo::text AS prazo, o.template_id, t.nome AS template_nome, o.criado_em
         FROM obrigacoes o
         LEFT JOIN checklist_templates t ON t.id = o.template_id
        ORDER BY o.criado_em DESC`
    );
    return rows;
  }

  @Post('checklist-templates')
  async criarTemplate(
    @Req() req: AuthedRequest,
    @Body() body: CriarChecklistTemplateInput
  ): Promise<ChecklistTemplateDTO> {
    if (!texto(body?.nome)) throw new BadRequestException('nome obrigatório');
    if (!Array.isArray(body.itens) || body.itens.length === 0) {
      throw new BadRequestException('itens não pode ser vazio');
    }
    for (const item of body.itens) {
      if (!texto(item?.descricao)) throw new BadRequestException('item.descricao obrigatório');
      if (item.tipo_esperado !== undefined && !TIPOS.includes(item.tipo_esperado)) {
        throw new BadRequestException(`tipo_esperado deve ser um de ${TIPOS.join(', ')}`);
      }
      if (item.tamanho_max_bytes !== undefined && (typeof item.tamanho_max_bytes !== 'number' || item.tamanho_max_bytes <= 0)) {
        throw new BadRequestException('tamanho_max_bytes deve ser positivo');
      }
    }
    const canal = body.canal === undefined ? 'email' : body.canal;
    if (!texto(canal)) throw new BadRequestException('canal inválido');

    const client = this.pg(req);
    const tenantId = req.sessao!.tenantId;
    // Modelo de e-mail padrão — precisa existir NESTE tenant (RLS não cobre FK).
    let emailTemplateId: string | null = null;
    if (body.email_template_id !== undefined && body.email_template_id !== null && texto(body.email_template_id)) {
      const m = await client.query('SELECT 1 FROM email_templates WHERE id=$1', [body.email_template_id]);
      if (m.rowCount === 0) {
        throw new BadRequestException('modelo de e-mail não encontrado neste tenant');
      }
      emailTemplateId = body.email_template_id;
    }
    // Atômico: template + itens em UMA transação; erro em qualquer item desfaz tudo
    await client.query('BEGIN');
    try {
      const tpl = (
        await client.query<{ id: string; nome: string; canal: string; email_template_id: string | null }>(
          `INSERT INTO checklist_templates (tenant_id, nome, canal, email_template_id)
           VALUES ($1,$2,$3,$4) RETURNING id, nome, canal, email_template_id`,
          [tenantId, body.nome.trim(), canal, emailTemplateId]
        )
      ).rows[0];
      if (!tpl) throw new Error('insert sem retorno');
      const itens: NonNullable<ChecklistTemplateDTO['itens'][number]>[] = [];
      for (const [i, item] of body.itens.entries()) {
        const inserido = (
          await client.query<{
              id: string;
              descricao: string;
              tipo_esperado: TipoEsperado;
              tamanho_max_bytes: number | null;
              ordem: number;
            }>(
              `INSERT INTO itens_template (tenant_id, template_id, descricao, tipo_esperado, tamanho_max_bytes, ordem)
               VALUES ($1,$2,$3,$4,$5,$6)
               RETURNING id, descricao, tipo_esperado, tamanho_max_bytes, ordem`,
              [
                tenantId,
                tpl.id,
                item.descricao.trim(),
                item.tipo_esperado ?? 'documento',
                item.tamanho_max_bytes ?? null,
                item.ordem ?? i + 1,
              ]
            )
          ).rows[0];
        if (!inserido) throw new Error('insert sem retorno');
        itens.push(inserido);
      }
      let emailTemplateNome: string | null = null;
      if (tpl.email_template_id) {
        const m = await client.query<{ nome: string }>('SELECT nome FROM email_templates WHERE id=$1', [tpl.email_template_id]);
        emailTemplateNome = m.rows[0]?.nome ?? null;
      }
      await client.query('COMMIT');
      await auditar(client, tenantId, req.sessao!.operadorId, 'checklist_template', tpl.id, 'criar', {
        nome: tpl.nome,
        itens: itens.length,
        email_template_id: tpl.email_template_id,
      });
      return { ...tpl, email_template_nome: emailTemplateNome, itens };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  @Put('checklist-templates/:id/vincular-email-template')
  async vincularEmailTemplate(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { email_template_id?: string | null }
  ): Promise<ChecklistTemplateDTO> {
    const client = this.pg(req);
    const tenantId = req.sessao!.tenantId;

    const existe = await client.query('SELECT 1 FROM checklist_templates WHERE id=$1', [id]);
    if (existe.rowCount === 0) throw new NotFoundException('checklist não encontrado');

    let emailTemplateId: string | null = null;
    if (body?.email_template_id !== undefined && body.email_template_id !== null && texto(body.email_template_id)) {
      const m = await client.query('SELECT 1 FROM email_templates WHERE id=$1', [body.email_template_id]);
      if (m.rowCount === 0) throw new BadRequestException('modelo de e-mail não encontrado neste tenant');
      emailTemplateId = body.email_template_id;
    }

    await client.query(
      'UPDATE checklist_templates SET email_template_id=$2 WHERE id=$1',
      [id, emailTemplateId]
    );
    await auditar(client, tenantId, req.sessao!.operadorId, 'checklist_template', id, 'vincular_email_template', {
      email_template_id: emailTemplateId,
    });

    const { rows: tpls } = await client.query<{
      id: string;
      nome: string;
      canal: string;
      email_template_id: string | null;
      email_template_nome: string | null;
    }>(
      `SELECT t.id, t.nome, t.canal, t.email_template_id, e.nome AS email_template_nome
         FROM checklist_templates t
         LEFT JOIN email_templates e ON e.id = t.email_template_id
        WHERE t.id=$1`,
      [id]
    );
    const tpl = tpls[0];
    if (!tpl) throw new NotFoundException('checklist não encontrado');
    const itens = (
      await client.query<{ id: string; descricao: string; tipo_esperado: TipoEsperado; tamanho_max_bytes: number | null; ordem: number }>(
        'SELECT id, descricao, tipo_esperado, tamanho_max_bytes, ordem FROM itens_template WHERE template_id=$1 ORDER BY ordem',
        [id]
      )
    ).rows;
    return { ...tpl, itens };
  }

  @Get('checklist-templates')
  async listarTemplates(@Req() req: AuthedRequest): Promise<ChecklistTemplateDTO[]> {
    const client = this.pg(req);
    const templates = (
      await client.query<{ id: string; nome: string; canal: string; email_template_id: string | null; email_template_nome: string | null }>(
        `SELECT t.id, t.nome, t.canal, t.email_template_id, e.nome AS email_template_nome
           FROM checklist_templates t
           LEFT JOIN email_templates e ON e.id = t.email_template_id
          ORDER BY t.criado_em DESC`
      )
    ).rows;
    const itens = (
      await client.query<{
        template_id: string;
        id: string;
        descricao: string;
        tipo_esperado: TipoEsperado;
        tamanho_max_bytes: number | null;
        ordem: number;
      }>('SELECT template_id, id, descricao, tipo_esperado, tamanho_max_bytes, ordem FROM itens_template ORDER BY ordem')
    ).rows;
    return templates.map((t) => ({
      ...t,
      itens: itens.filter((i) => i.template_id === t.id).map((i) => ({ id: i.id, descricao: i.descricao, tipo_esperado: i.tipo_esperado, tamanho_max_bytes: i.tamanho_max_bytes, ordem: i.ordem })),
    }));
  }
}
