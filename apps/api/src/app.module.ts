import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { DATABASE } from './common/database';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { DesktopModule } from './desktop/desktop.module';

@Module({
  imports: [DatabaseModule, AuthModule, TenantsModule, PlansModule, SubscriptionsModule, EntitlementsModule, DesktopModule],
  providers: [{ provide: DATABASE, useExisting: DatabaseService }],
  controllers: [HealthController],
})
export class AppModule {}
