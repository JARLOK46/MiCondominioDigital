import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { DatabaseClient, OptionalDatabase } from '../common/database';
import { AuthClaims } from './auth.types';
import { MembershipService } from '../tenants/membership.service';

const scrypt = promisify(nodeScrypt);
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @OptionalDatabase() private readonly db?: DatabaseClient,
    private readonly memberships?: MembershipService,
  ) {}

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

function sign(value: string): string { return createHmac('sha256', process.env.JWT_SECRET ?? 'development-only-secret').update(value).digest('base64url'); }
function hashToken(value: string): string { return createHmac('sha256', process.env.REFRESH_TOKEN_SECRET ?? process.env.JWT_SECRET ?? 'development-only-secret').update(value).digest('hex'); }
function safeEqual(a: string, b: string): boolean { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }
export async function hashPassword(password: string): Promise<string> { const salt = randomBytes(16).toString('hex'); const key = (await scrypt(password, salt, 64)) as Buffer; return `scrypt:${salt}:${key.toString('hex')}`; }
async function verifyPassword(password: string, encoded: string): Promise<boolean> { const [, salt, expected] = encoded.split(':'); if (!salt || !expected) return false; const key = (await scrypt(password, salt, 64)) as Buffer; return safeEqual(key.toString('hex'), expected); }
