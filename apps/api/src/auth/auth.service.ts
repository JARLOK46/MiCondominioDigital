import { Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { DatabaseClient, OptionalDatabase } from '../common/database';
import { AuthClaims } from './auth.types';
import { MembershipService } from '../tenants/membership.service';
import { TOKEN_DELIVERY, TokenDelivery } from './token-delivery';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const RECOVERY_RESPONSE = { message: 'If an account matches, instructions have been sent.' };

@Injectable()
export class AuthService {
  constructor(
    @OptionalDatabase() private readonly db?: DatabaseClient,
    private readonly memberships?: MembershipService,
    @Optional() @Inject(TOKEN_DELIVERY) private readonly tokenDelivery?: TokenDelivery,
  ) {}

  async register(input: { email: string; password: string; firstName: string; lastName: string; tenantName: string }): Promise<{ userId: string; message: string }> {
    if (!this.db) throw new Error('Database provider is not configured');
    if (!this.tokenDelivery) throw new Error('Token delivery provider is not configured');
    const email = input.email.trim().toLowerCase();
    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Unable to create account');
    const passwordHash = await hashPassword(input.password);
    const create = async (db: DatabaseClient) => {
      const tenant = await db.tenant.create({ data: { name: input.tenantName.trim() } });
      const user = await db.user.create({ data: { email, passwordHash, firstName: input.firstName.trim(), lastName: input.lastName.trim(), status: 'PENDING' } });
      // System roles are tenant-independent. The OWNER code is the seeded role;
      // tenantId: null prevents accidentally assigning another tenant's custom role.
      const role = await db.role.findFirst({ where: { tenantId: null, code: 'OWNER', isSystem: true } });
      if (!role) throw new Error('Owner role is not configured');
      await db.membership.create({ data: { tenantId: tenant.id, userId: user.id, roleId: role.id, status: 'ACTIVE', joinedAt: new Date() } });
      const rawToken = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
      await db.emailVerificationToken.create({ data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt } });
      return { user, rawToken, expiresAt };
    };
    const result = this.db.$transaction ? await this.db.$transaction(create) : await create(this.db);
    if (!this.tokenDelivery) throw new Error('Token delivery provider is not configured');
    await this.tokenDelivery.sendEmailVerification({ email, token: result.rawToken, expiresAt: result.expiresAt });
    return { userId: result.user.id, message: 'Account created. Check your email to verify your account.' };
  }

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    if (!this.db) throw new Error('Database provider is not configured');
    const token = await this.db.emailVerificationToken.findFirst({ where: { tokenHash: hashToken(rawToken), usedAt: null }, include: { user: true } });
    if (!token || new Date(token.expiresAt) <= new Date()) throw new UnauthorizedException('Invalid or expired verification token');
    await this.db.emailVerificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
    await this.db.user.update({ where: { id: token.userId }, data: { status: 'ACTIVE', emailVerifiedAt: new Date() } });
    return { message: 'Email verified successfully.' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    if (!this.db) throw new Error('Database provider is not configured');
    const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user && user.status !== 'DELETED') {
      const rawToken = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      await this.db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt } });
      // Raw token crosses only the delivery boundary; it is never returned by the API.
      if (this.tokenDelivery) await this.tokenDelivery.sendPasswordReset({ email: user.email, token: rawToken, expiresAt });
    }
    return RECOVERY_RESPONSE;
  }

  async resetPassword(rawToken: string, password: string): Promise<{ message: string }> {
    if (!this.db) throw new Error('Database provider is not configured');
    const token = await this.db.passwordResetToken.findFirst({ where: { tokenHash: hashToken(rawToken), usedAt: null }, include: { user: true } });
    if (!token || new Date(token.expiresAt) <= new Date() || token.user.status === 'DELETED') throw new UnauthorizedException('Invalid or expired password reset token');
    const passwordHash = await hashPassword(password);
    await this.db.user.update({ where: { id: token.userId }, data: { passwordHash } });
    await this.db.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
    return { message: 'Password reset successfully.' };
  }

  async login(email: string, password: string, tenantId?: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!this.db) throw new Error('Database provider is not configured');
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.status !== 'ACTIVE' || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const claims = await this.claimsFor(user, tenantId);
    return this.issue(user.id, claims);
  }

  async refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!this.db) throw new Error('Database provider is not configured');
    const tokenHash = hashToken(rawToken);
    const stored = await this.db.refreshToken.findFirst({ where: { tokenHash }, include: { user: true } });
    if (!stored || stored.revokedAt || new Date(stored.expiresAt) <= new Date() || stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.db.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const claims = await this.claimsFor(stored.user);
    return this.issue(stored.userId, claims);
  }

  verifyAccessToken(token: string): AuthClaims {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature || !safeEqual(signature, sign(encoded))) throw new UnauthorizedException('Invalid access token');
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as AuthClaims;
    if (claims.exp <= Math.floor(Date.now() / 1000)) throw new UnauthorizedException('Access token expired');
    return claims;
  }

  private async claimsFor(user: any, tenantId?: string): Promise<AuthClaims> {
    const memberships = this.memberships ? await this.memberships.listForUser(user.id) : [];
    const membership = tenantId ? memberships.find((item) => item.tenantId === tenantId) : memberships[0];
    if (tenantId && !membership) throw new UnauthorizedException('User is not a member of this tenant');
    const role = membership?.role;
    const permissions = role?.permissions?.map((item: any) => item.permission?.code ?? item.permissionCode).filter(Boolean) ?? [];
    return { sub: user.id, email: user.email, tenantId: membership?.tenantId, roles: role ? [role.code] : [], permissions, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS };
  }

  private async issue(userId: string, claims: AuthClaims): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.db!.refreshToken.create({ data: { userId, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) } });
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return { accessToken: `${payload}.${sign(payload)}`, refreshToken };
  }
}

function configuredSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error(`${name} is required in production`);
  return `development-only-${name.toLowerCase()}`;
}
function sign(value: string): string { return createHmac('sha256', configuredSecret('JWT_ACCESS_SECRET')).update(value).digest('base64url'); }
function hashToken(value: string): string { return createHmac('sha256', configuredSecret('JWT_REFRESH_SECRET')).update(value).digest('hex'); }
function safeEqual(a: string, b: string): boolean { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  if (!encoded.startsWith('$2')) return false;
  return bcrypt.compare(password, encoded);
}
