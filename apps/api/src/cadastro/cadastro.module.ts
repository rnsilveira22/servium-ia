import { Module } from '@nestjs/common';

import { CadastroController } from './cadastro.controller';
import { CiclosController } from './ciclos.controller';
import { ConfiguracoesController } from './configuracoes.controller';
import { ResumoDiarioController } from './resumo-diario.controller';

@Module({
  controllers: [CadastroController, CiclosController, ConfiguracoesController, ResumoDiarioController],
})
export class CadastroModule {}
