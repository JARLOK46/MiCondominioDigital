import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseClient, OptionalDatabase } from '../common/database';

@Injectable()
export class MembershipService {
  constructor(@OptionalDatabase() private readonly db?: DatabaseClient) {}

  async requireActiveMembership(userId: string, tenantId: string): Promise<any> {
    if (!this.db) throw new Error('Database provider is not configured');
    const membership = await this.db.membership.findFirst({
      where: { userId, tenantId, status: 'ACTIVE' },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!membership) throw new ForbiddenException('User is not an active member of this tenant');
    return membership;
  }

  async listForUser(userId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database provider is not configured');
    return this.db.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { tenant: true, role: true },
    });
  }
}
