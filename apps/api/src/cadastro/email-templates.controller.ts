import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Client } from 'pg';

import type { CriarEmailTemplateInput, EmailTemplateDTO } from '@servium-ia/shared-types';
import { RequireAuth, type AuthedRequest } from '../auth/auth.guard';
import { auditar } from './audit';

function texto(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

@Controller('email-templates')
@UseGuards(RequireAuth)
export class EmailTemplatesController {
  private pg(req: AuthedRequest): Client {
    return req.pg as Client;
  }

  private async existeNoTenant(req: AuthedRequest, id: string): Promise<boolean> {
    const { rows } = await this.pg(req).query('SELECT 1 FROM email_templates WHERE id=$1 AND tenant_id=$2', [
      id,
      req.sessao!.tenantId,
    ]);
    return rows.length > 0;
  }

  @Get()
  async listar(@Req() req: AuthedRequest): Promise<EmailTemplateDTO[]> {
    const { rows } = await this.pg(req).query<EmailTemplateDTO>(
      `SELECT id, nome, assunto, corpo, criado_em::text AS criado_em
         FROM email_templates
        ORDER BY nome`
    );
    return rows;
  }

  @Post()
  async criar(@Req() req: AuthedRequest, @Body() body: CriarEmailTemplateInput): Promise<EmailTemplateDTO> {
    if (!texto(body?.nome)) throw new BadRequestException('nome obrigatório');
    if (!texto(body?.assunto)) throw new BadRequestException('assunto obrigatório');
    if (!texto(body?.corpo)) throw new BadRequestException('corpo obrigatório');
    if (!body.corpo.includes('{{token_correlacao}}')) {
      throw new BadRequestException('corpo deve conter o placeholder {{token_correlacao}} (rastreio da resposta)');
    }

    const client = this.pg(req);
    const { rows } = await client.query<EmailTemplateDTO>(
      `INSERT INTO email_templates (tenant_id, nome, assunto, corpo)
       VALUES ($1,$2,$3,$4)
       RETURNING id, nome, assunto, corpo, criado_em::text AS criado_em`,
      [req.sessao!.tenantId, body.nome.trim(), body.assunto.trim(), body.corpo]
    );
    const tpl = rows[0]!;
    await auditar(client, req.sessao!.tenantId, req.sessao!.operadorId, 'email_template', tpl.id, 'criar', {
      nome: tpl.nome,
    });
    return tpl;
  }

  @Put(':id')
  async atualizar(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Partial<CriarEmailTemplateInput>
  ): Promise<EmailTemplateDTO> {
    if (!(await this.existeNoTenant(req, id))) throw new NotFoundException('modelo de e-mail não encontrado');

    const nome = body.nome === undefined ? undefined : texto(body.nome) ? body.nome.trim() : undefined;
    const assunto = body.assunto === undefined ? undefined : texto(body.assunto) ? body.assunto.trim() : undefined;
    const corpo = body.corpo === undefined ? undefined : texto(body.corpo) ? body.corpo : undefined;
    if (nome === undefined && assunto === undefined && corpo === undefined) {
      throw new BadRequestException('nada a atualizar');
    }
    if (corpo !== undefined && !corpo.includes('{{token_correlacao}}')) {
      throw new BadRequestException('corpo deve conter o placeholder {{token_correlacao}} (rastreio da resposta)');
    }

    const client = this.pg(req);
    const { rows } = await client.query<EmailTemplateDTO>(
      `UPDATE email_templates
          SET nome = COALESCE($2, nome),
              assunto = COALESCE($3, assunto),
              corpo = COALESCE($4, corpo)
        WHERE id=$1 AND tenant_id=$5
        RETURNING id, nome, assunto, corpo, criado_em::text AS criado_em`,
      [id, nome ?? null, assunto ?? null, corpo ?? null, req.sessao!.tenantId]
    );
    await auditar(client, req.sessao!.tenantId, req.sessao!.operadorId, 'email_template', id, 'atualizar', {
      campos: Object.keys(body).filter((k) => body[k as keyof Partial<CriarEmailTemplateInput>] !== undefined),
    });
    return rows[0]!;
  }

  @Delete(':id')
  async excluir(@Req() req: AuthedRequest, @Param('id') id: string): Promise<{ ok: boolean }> {
    if (!(await this.existeNoTenant(req, id))) throw new NotFoundException('modelo de e-mail não encontrado');

    const client = this.pg(req);
    const { rows } = await client.query(`DELETE FROM email_templates WHERE id=$1 AND tenant_id=$2 RETURNING id`, [
      id,
      req.sessao!.tenantId,
    ]);
    if (rows.length === 0) throw new NotFoundException('modelo de e-mail não encontrado');
    await auditar(client, req.sessao!.tenantId, req.sessao!.operadorId, 'email_template', id, 'excluir', {});
    return { ok: true };
  }
}