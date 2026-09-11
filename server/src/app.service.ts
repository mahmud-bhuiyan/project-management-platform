import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'flowdesk-server',
      timestamp: new Date().toISOString(),
    };
  }
}
