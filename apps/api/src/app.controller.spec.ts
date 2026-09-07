import { describe, expect, it } from 'vitest';
import { SERVICE_NAME } from '@servium-ia/shared-types';
import { AppController } from './app.controller';

describe('AppController', () => {
  it('retorna identificação técnica do serviço', () => {
    const controller = new AppController();
    expect(controller.getServiceInfo()).toEqual({
      name: SERVICE_NAME,
      version: expect.any(String),
    });
  });
});
