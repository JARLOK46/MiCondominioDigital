export interface AuthUser {
  id: string;
  email: string;
  status: string;
}

export interface AuthClaims {
  sub: string;
  email: string;
  tenantId?: string;
  roles?: string[];
  permissions?: string[];
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest {
  user?: AuthClaims;
  tenantId?: string;
}
