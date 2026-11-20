import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly db: DataSource) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health(@Res({ passthrough: true }) res: Response) {
    let database: 'up' | 'down' = 'up';
    try {
      await this.db.query('SELECT 1');
    } catch {
      database = 'down';
    }

    const status = database === 'up' ? 'ok' : 'degraded';
    res.status(status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status, api: 'up', database };

  }
}
