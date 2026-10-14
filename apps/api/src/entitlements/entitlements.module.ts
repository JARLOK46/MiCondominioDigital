import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EntitlementsService } from './entitlements.service';

@Module({ imports: [SubscriptionsModule], providers: [EntitlementsService], exports: [EntitlementsService] })
export class EntitlementsModule {}
