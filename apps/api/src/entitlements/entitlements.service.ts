import { Injectable } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlansService } from '../plans/plans.service';
import { EntitlementResult, PlanFeatureMap, PlanRecord, SubscriptionRecord } from '../plans/plan.types';

const PAID_STATUSES = new Set(['ACTIVE', 'TRIALING']);
const FAILED_STATUSES = new Set(['PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED']);

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly plans: PlansService,
  ) {}

  async evaluate(tenantId: string, now = new Date()): Promise<EntitlementResult> {
    const subscription = await this.subscriptions.findCurrentForTenant(tenantId);
    if (!subscription) return this.freeResult(null, await this.plans.getFreePlan());

    const plan = subscription.plan;
    const inPeriod = new Date(subscription.currentPeriodStart) <= now && now < new Date(subscription.currentPeriodEnd);
    const paid = PAID_STATUSES.has(subscription.status) && inPeriod && plan.priceAmount > 0;
    if (paid) {
      return this.result('PAID', true, 'ACTIVE_SUBSCRIPTION', plan, subscription);
    }

    // A configured zero-price plan is still the free mode. Any failed, cancelled,
    // or out-of-period paid subscription is read-only, never client-authorized.
    if (plan.priceAmount === 0 && PAID_STATUSES.has(subscription.status) && inPeriod) {
      return this.result('FREE', true, 'ACTIVE_SUBSCRIPTION', plan, subscription);
    }
    return this.result('READ_ONLY', false, 'EXPIRED_OR_FAILED_PAYMENT', plan, subscription);
  }

  private freeResult(subscription: SubscriptionRecord | null, plan: PlanRecord | null): EntitlementResult {
    if (!plan) {
      return { mode: 'FREE', canWrite: true, reason: 'NO_SUBSCRIPTION', plan: null, subscription, features: {}, limits: {} };
    }
    const features = isFeatureMap(plan.features) ? plan.features : {};
    return {
      mode: 'FREE', canWrite: true, reason: 'NO_SUBSCRIPTION', plan, subscription,
      features, limits: limitsFor(plan),
    };
  }

  private result(
    mode: EntitlementResult['mode'],
    canWrite: boolean,
    reason: EntitlementResult['reason'],
    plan: PlanRecord,
    subscription: SubscriptionRecord,
  ): EntitlementResult {
    const features = isFeatureMap(plan.features) ? plan.features : {};
    return { mode, canWrite, reason, plan, subscription, features, limits: limitsFor(plan) };
  }
}

function limitsFor(plan: PlanRecord): Record<string, number | null> {
  const limits: Record<string, number | null> = {};
  for (const limit of plan.limits ?? []) limits[limit.featureCode] = limit.limitValue;
  if (plan.maxResidences !== undefined) limits.residences = plan.maxResidences ?? null;
  if (plan.maxUsers !== undefined) limits.users = plan.maxUsers ?? null;
  if (plan.maxStorageBytes !== undefined && plan.maxStorageBytes !== null) {
    limits.storageBytes = typeof plan.maxStorageBytes === 'bigint' ? Number(plan.maxStorageBytes) : plan.maxStorageBytes;
  }
  return limits;
}

function isFeatureMap(value: unknown): value is PlanFeatureMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
