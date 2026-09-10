import { Module } from '@nestjs/common';

import { CadastroController } from './cadastro.controller';
import { CiclosController } from './ciclos.controller';
import { ConfiguracoesController } from './configuracoes.controller';

@Module({
  controllers: [CadastroController, CiclosController, ConfiguracoesController],
})
export class CadastroModule {}
