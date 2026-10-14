import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../auth/auth.decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import { MembershipService } from './membership.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly memberships: MembershipService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (!requiredPermissions.length && !requiredRoles.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.sub || !request.tenantId) throw new ForbiddenException('Authenticated tenant context is required');
    const membership = await this.memberships.requireActiveMembership(request.user.sub, request.tenantId);
    const roleCode = membership.role?.code;
    const permissions = membership.role?.permissions?.map((item: any) => item.permission?.code ?? item.permissionCode) ?? [];
    if (requiredRoles.length && !requiredRoles.includes(roleCode)) throw new ForbiddenException('Insufficient role');
    if (requiredPermissions.some((permission) => !permissions.includes(permission))) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
