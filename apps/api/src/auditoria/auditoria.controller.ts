import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Client } from 'pg';

import { listarEventos, type FiltrosEventos } from '@servium-ia/db';
import { RequireAuth, Roles, type AuthedRequest } from '../auth/auth.guard';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('auditoria')
@UseGuards(RequireAuth)
@Roles('admin')
export class AuditoriaController {
  private pg(req: AuthedRequest): Client {
    return req.pg as Client;
  }

  /**
   * Trilha de auditoria consultável (CA-04). Admin-only; o isolamento de
   * tenant é garantido pelo RLS da conexão (`req.pg` já contextualizada
   * pelo RequireAuth). Validação de entrada aqui evita erros SQL 22P02.
   */
  @Get()
  async listar(@Req() req: AuthedRequest, @Query() query: Record<string, unknown>) {
    const antesDe = this.timestamp(query.antes_de, 'antes_de');
    const antesId = this.uuid(query.antes_id, 'antes_id');
    if ((antesDe === undefined) !== (antesId === undefined)) {
      throw new BadRequestException('antes_de e antes_id são o cursor keyset e devem vir juntos');
    }

    const filtros: FiltrosEventos = {
      entidade: this.texto(query.entidade, 'entidade'),
      acao: this.texto(query.acao, 'acao'),
      entidadeId: this.uuid(query.entidade_id, 'entidade_id'),
      limite: this.limite(query.limite),
      antesDe,
      antesId,
    };

    const { eventos, tem_mais } = await listarEventos(this.pg(req), filtros);
    return { eventos, tem_mais };
  }

  private texto(valor: unknown, campo: string): string | undefined {
    if (valor === undefined) return undefined;
    if (typeof valor !== 'string' || valor.trim() === '') {
      throw new BadRequestException(`${campo} deve ser uma string não vazia`);
    }
    return valor;
  }

  private uuid(valor: unknown, campo: string): string | undefined {
    if (valor === undefined) return undefined;
    if (typeof valor !== 'string' || !UUID_RE.test(valor)) {
      throw new BadRequestException(`${campo} deve ser um UUID válido`);
    }
    return valor;
  }

  private limite(valor: unknown): number | undefined {
    if (valor === undefined) return undefined;
    const n = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : Number.NaN;
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      throw new BadRequestException('limite deve ser um inteiro entre 1 e 200');
    }
    return n;
  }

  private timestamp(valor: unknown, campo: string): string | undefined {
    if (valor === undefined) return undefined;
    if (typeof valor !== 'string' || Number.isNaN(Date.parse(valor))) {
      throw new BadRequestException(`${campo} deve ser um timestamp ISO 8601 válido`);
    }
    return valor;
  }
}