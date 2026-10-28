import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly dataSource: DataSource,
    private readonly health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.health.check(key);
    try {
      await this.dataSource.query('SELECT 1');
      return indicator.up();
    } catch {
      return indicator.down({ message: 'Database unreachable' });
    }
  }
}
