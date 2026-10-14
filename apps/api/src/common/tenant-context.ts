import { Injectable } from '@nestjs/common';

export const TENANT_ID_HEADER = 'x-tenant-id';

export interface TenantContext {
  tenantId: string;
  userId?: string;
}

@Injectable()
export class TenantContextService {
  private readonly contexts = new WeakMap<object, TenantContext>();

  set(request: object, context: TenantContext): void {
    this.contexts.set(request, context);
  }

  get(request: object): TenantContext | undefined {
    return this.contexts.get(request);
  }

  require(request: object): TenantContext {
    const context = this.get(request);
    if (!context) throw new Error('Tenant context is not available');
    return context;
  }
}
