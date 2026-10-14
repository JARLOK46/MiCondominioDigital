import { Injectable, UnauthorizedException } from '@nestjs/common';
interface RequestLike {
  header(name: string): string | undefined;
  tenantId?: string;
}
interface ResponseLike {}
type NextFunction = () => void;
import { TENANT_ID_HEADER, TenantContextService } from '../common/tenant-context';

@Injectable()
export class TenantContextMiddleware {
  constructor(private readonly context: TenantContextService) {}

  use(request: RequestLike, _response: ResponseLike, next: NextFunction): void {
    const tenantId = request.header(TENANT_ID_HEADER);
    if (!tenantId) throw new UnauthorizedException('Tenant context is required');
    this.context.set(request, { tenantId });
    request.tenantId = tenantId;
    next();
  }
}
