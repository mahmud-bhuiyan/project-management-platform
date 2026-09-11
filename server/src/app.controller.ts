import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    description: 'Service health status',
    schema: {
      example: {
        data: {
          status: 'ok',
        },
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
