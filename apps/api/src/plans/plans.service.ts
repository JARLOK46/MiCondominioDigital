import { Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE } from '../common/database';
import { Inject } from '@nestjs/common';
import { PlanRecord } from './plan.types';

interface PlansClient {
  plan: {
    findMany(args: unknown): Promise<PlanRecord[]>;
    findUnique(args: unknown): Promise<PlanRecord | null>;
  };
}

@Injectable()
export class PlansService {
  constructor(@Inject(DATABASE) private readonly db: PlansClient) {}

  listPublic(): Promise<PlanRecord[]> {
    return this.db.plan.findMany({
      where: { isPublic: true, isActive: true },
      include: { limits: true },
      orderBy: [{ priceAmount: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getActiveByCode(code: string): Promise<PlanRecord> {
    const plan = await this.db.plan.findUnique({
      where: { code },
      include: { limits: true },
    });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
    return plan;
  }
}
