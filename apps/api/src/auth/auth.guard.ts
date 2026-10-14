import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { headers?: Record<string, string> }>();
    const header = request.headers?.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token is required');
    request.user = this.auth.verifyAccessToken(header.slice(7));
    return true;
  }
}
