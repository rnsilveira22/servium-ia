import { Controller, Get } from '@nestjs/common';
import { Client } from 'pg';
import { APP_URL } from '@servium-ia/db';
import { getCounts } from './metrics.service';

@Controller('health')
export class HealthController {
  @Get()
  async check(): Promise<{ status: string; db: boolean; timestamp: string }> {
    let db = false;
    const client = new Client({ connectionString: APP_URL });
    try {
      await client.connect();
      await client.query('SELECT 1');
      db = true;
    } catch {
      db = false;
    } finally {
      void client.end();
    }
    return { status: 'ok', db, timestamp: new Date().toISOString() };
  }
}

@Controller()
export class MetricsController {
  @Get('metrics')
  getMetrics(): Record<string, number> {
    return getCounts();
  }
}
