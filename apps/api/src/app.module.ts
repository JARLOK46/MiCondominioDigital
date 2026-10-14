import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { DATABASE } from './common/database';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [DatabaseModule, AuthModule, TenantsModule],
  providers: [{ provide: DATABASE, useExisting: DatabaseService }],
  controllers: [HealthController],
})
export class AppModule {}
