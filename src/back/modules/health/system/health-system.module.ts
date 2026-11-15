import { Module } from '@nestjs/common';

import { HealthSystemService } from './health-system.service';

@Module({
  providers: [HealthSystemService],
  exports: [HealthSystemService],
})
export class HealthSystemModule {}
