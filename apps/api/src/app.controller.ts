import { Controller, Get } from '@nestjs/common';
import { SERVICE_NAME, SERVICE_VERSION, ServiceInfo } from '@servium-ia/shared-types';

@Controller()
export class AppController {
  @Get()
  getServiceInfo(): ServiceInfo {
    return { name: SERVICE_NAME, version: SERVICE_VERSION };
  }
}
