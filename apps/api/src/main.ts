import './common/load-env';
import 'reflect-metadata';
import { buildApp } from './app.factory';
async function bootstrap(): Promise<void> {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
