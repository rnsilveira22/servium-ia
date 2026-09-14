import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Suites de integração compartilham jobs_fila/banco real: execução serial
    // de arquivos evita que um worker/rodarJobs reivindique jobs de outro tenant.
    fileParallelism: false,
    // Artefatos compilados por `npm run build` (dist/) não são testes-fonte.
    exclude: ['**/dist/**'],
    // Nest depende de metadados de decorator que se perdem quando as
    // dependências ficam externalizadas no transform do vitest.
    server: {
      deps: {
        inline: [/@nestjs/, 'reflect-metadata', '@node-rs/argon2'],
      },
    },
  },
});
