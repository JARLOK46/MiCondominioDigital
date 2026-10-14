import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE } from '../common/database';
import { SubscriptionRecord } from '../plans/plan.types';

interface SubscriptionsClient {
  subscription: {
    findFirst(args: unknown): Promise<SubscriptionRecord | null>;
  };
}

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(DATABASE) private readonly db: SubscriptionsClient) {}

  /** Always scopes the lookup to the tenant; callers must never supply a global subscription id. */
  findCurrentForTenant(tenantId: string): Promise<SubscriptionRecord | null> {
    return this.db.subscription.findFirst({
      where: { tenantId },
      include: { plan: { include: { limits: true } } },
      orderBy: [{ currentPeriodEnd: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
