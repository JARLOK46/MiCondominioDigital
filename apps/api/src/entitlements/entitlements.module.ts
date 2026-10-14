import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlansModule } from '../plans/plans.module';
import { EntitlementsService } from './entitlements.service';

@Module({ imports: [SubscriptionsModule, PlansModule], providers: [EntitlementsService], exports: [EntitlementsService] })
export class EntitlementsModule {}
