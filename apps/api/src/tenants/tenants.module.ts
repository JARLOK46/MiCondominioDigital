import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { RbacGuard } from './rbac.guard';
import { TenantContextService } from '../common/tenant-context';
import { TenantContextMiddleware } from './tenant-context.middleware';

@Module({ providers: [MembershipService, RbacGuard, TenantContextService, TenantContextMiddleware], exports: [MembershipService, RbacGuard, TenantContextService] })
export class TenantsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).exclude(
      { path: 'auth/login', method: RequestMethod.POST },
      { path: 'auth/refresh', method: RequestMethod.POST },
    ).forRoutes('*');
  }
}
