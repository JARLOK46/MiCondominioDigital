import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE } from '../common/database';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { DesktopBootstrapDto, DesktopBootstrapInput } from './desktop-bootstrap.dto';

interface DesktopClient {
  desktopSession: {
    create(args: unknown): Promise<unknown>;
  };
}

@Injectable()
export class DesktopBootstrapService {
  constructor(
    private readonly entitlements: EntitlementsService,
    @Inject(DATABASE) private readonly db: DesktopClient,
  ) {}

  async bootstrap(input: DesktopBootstrapInput): Promise<DesktopBootstrapDto> {
    const entitlement = await this.entitlements.evaluate(input.tenantId);
    await this.db.desktopSession.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        deviceName: input.deviceName,
        platform: input.platform,
        appVersion: input.appVersion,
        lastSeenAt: new Date(),
      },
    });

    return {
      tenantId: input.tenantId,
      userId: input.userId,
      mode: entitlement.mode,
      canWrite: entitlement.canWrite,
      reason: entitlement.reason,
      plan: entitlement.plan
        ? { code: entitlement.plan.code, name: entitlement.plan.name, features: entitlement.features }
        : null,
      limits: entitlement.limits,
      subscription: entitlement.subscription
        ? {
            status: entitlement.subscription.status,
            currentPeriodEnd: new Date(entitlement.subscription.currentPeriodEnd).toISOString(),
            cancelAtPeriodEnd: entitlement.subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }
}
