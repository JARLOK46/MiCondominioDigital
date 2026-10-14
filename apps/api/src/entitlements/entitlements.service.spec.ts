import { describe, expect, it, vi } from 'vitest';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlansService } from '../plans/plans.service';

const plan = {
  id: 'plan-free',
  code: 'free',
  name: 'Free Demo',
  description: 'demo',
  priceAmount: 0,
  currency: 'COP',
  billingInterval: 'MONTHLY',
  maxResidences: 5,
  maxUsers: 3,
  maxStorageBytes: null,
  features: { basic_dashboard: true },
  isPublic: true,
  isActive: true,
  limits: [],
};

function subscription(status: string, priceAmount = 0) {
  return {
    id: 'sub-1',
    tenantId: 'tenant-1',
    status,
    currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
    currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
    cancelAtPeriodEnd: false,
    plan: { ...plan, priceAmount, code: priceAmount ? 'professional' : 'free' },
  };
}

describe('EntitlementsService', () => {
  it('returns a limited free mode when there is no subscription', async () => {
    const subscriptions = { findCurrentForTenant: vi.fn().mockResolvedValue(null) } as unknown as SubscriptionsService;
    const plans = { getFreePlan: vi.fn().mockResolvedValue(plan) } as unknown as PlansService;
    const service = new EntitlementsService(subscriptions, plans);

    await expect(service.evaluate('tenant-1')).resolves.toMatchObject({
      mode: 'FREE',
      canWrite: true,
      reason: 'NO_SUBSCRIPTION',
    });
    expect(subscriptions.findCurrentForTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('keeps an active free subscription in limited write mode', async () => {
    const subscriptions = { findCurrentForTenant: vi.fn().mockResolvedValue(subscription('ACTIVE')) } as unknown as SubscriptionsService;
    const plans = { getFreePlan: vi.fn() } as unknown as PlansService;
    const service = new EntitlementsService(subscriptions, plans);

    await expect(service.evaluate('tenant-1', new Date('2026-01-15T00:00:00Z'))).resolves.toMatchObject({
      mode: 'FREE',
      canWrite: true,
      reason: 'ACTIVE_SUBSCRIPTION',
    });
  });

  it('returns paid write access only for an active paid subscription in period', async () => {
    const subscriptions = { findCurrentForTenant: vi.fn().mockResolvedValue(subscription('ACTIVE', 10000)) } as unknown as SubscriptionsService;
    const plans = { getFreePlan: vi.fn() } as unknown as PlansService;
    const service = new EntitlementsService(subscriptions, plans);

    await expect(service.evaluate('tenant-1', new Date('2026-01-15T00:00:00Z'))).resolves.toMatchObject({
      mode: 'PAID',
      canWrite: true,
    });
  });

  it('returns read-only access after a paid subscription expires', async () => {
    const subscriptions = { findCurrentForTenant: vi.fn().mockResolvedValue(subscription('EXPIRED', 10000)) } as unknown as SubscriptionsService;
    const plans = { getFreePlan: vi.fn() } as unknown as PlansService;
    const service = new EntitlementsService(subscriptions, plans);

    await expect(service.evaluate('tenant-1', new Date('2026-02-02T00:00:00Z'))).resolves.toMatchObject({
      mode: 'READ_ONLY',
      canWrite: false,
      reason: 'EXPIRED_OR_FAILED_PAYMENT',
    });
  });
});
