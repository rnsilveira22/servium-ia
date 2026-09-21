import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

function encontrarEnv(): string | undefined {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidato = join(dir, '.env');
    if (existsSync(candidato)) return candidato;
    const pai = dirname(dir);
    if (pai === dir) break;
    dir = pai;
  }
  return undefined;
}

const arquivo = encontrarEnv();
if (arquivo) process.loadEnvFile(arquivo);