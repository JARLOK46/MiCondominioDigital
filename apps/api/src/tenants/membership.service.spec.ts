import { describe, expect, it, vi } from 'vitest';
import { MembershipService } from './membership.service';

function membershipDb() {
  return {
    membership: {
      findFirst: vi.fn().mockResolvedValue({
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: { code: 'OWNER', permissions: [] },
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as any;
}

describe('MembershipService tenant isolation', () => {
  it('requires both user and tenant when resolving active membership', async () => {
    const db = membershipDb();
    const service = new MembershipService(db);

    await service.requireActiveMembership('user-1', 'tenant-1');

    expect(db.membership.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', tenantId: 'tenant-1', status: 'ACTIVE' },
    }));
  });

  it('lists only active memberships for the requested user', async () => {
    const db = membershipDb();
    const service = new MembershipService(db);

    await service.listForUser('user-1');

    expect(db.membership.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', status: 'ACTIVE' },
    }));
  });
});
