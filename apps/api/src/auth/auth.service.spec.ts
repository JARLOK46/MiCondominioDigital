import { describe, expect, it } from 'vitest';
import { AuthService, hashPassword } from './auth.service';
import { TokenDelivery, createDefaultTokenDelivery, DevelopmentTokenDelivery, ProductionTokenDelivery } from './token-delivery';

const service = new AuthService(undefined, undefined);

describe('AuthService security flows', () => {
  it('hashes passwords with bcrypt and a unique salt', async () => {
    const first = await hashPassword('correct horse battery staple');
    const second = await hashPassword('correct horse battery staple');
    expect(first).toMatch(/^\$2[aby]\$12\$/);
    expect(second).not.toBe(first);
  });

  it('provides development delivery while failing closed in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    expect(createDefaultTokenDelivery()).toBeInstanceOf(DevelopmentTokenDelivery);
    process.env.NODE_ENV = 'production';
    expect(createDefaultTokenDelivery()).toBeInstanceOf(ProductionTokenDelivery);
    await expect(createDefaultTokenDelivery().sendEmailVerification({ email: 'a@example.com', token: 'token', expiresAt: new Date() })).rejects.toThrow('production token delivery provider is required');
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });

  it('does not expose raw recovery tokens in generic account recovery responses', async () => {
    const db = {
      user: { findUnique: async () => undefined },
    } as any;
    const recovery = new AuthService(db, undefined);
    await expect(recovery.forgotPassword('unknown@example.com')).resolves.toEqual({
      message: 'If an account matches, instructions have been sent.',
    });
  });

  it('requires the database integration for registration', async () => {
    await expect(service.register({ email: 'a@example.com', password: 'secret', firstName: 'A', lastName: 'B', tenantName: 'Tenant' })).rejects.toThrow('Database provider is not configured');
  });

  it('requires a token delivery provider instead of returning verification tokens', async () => {
    const db = { user: { findUnique: async () => undefined } } as any;
    await expect(new AuthService(db, undefined).register({ email: 'a@example.com', password: 'secret', firstName: 'A', lastName: 'B', tenantName: 'Tenant' })).rejects.toThrow('Token delivery provider is not configured');
  });

  it('delivers raw verification tokens only through the delivery boundary', async () => {
    const delivered: string[] = [];
    const delivery: TokenDelivery = {
      sendEmailVerification: async ({ token }) => { delivered.push(token); },
      sendPasswordReset: async () => undefined,
    };
    const db = {
      user: { findUnique: async () => undefined, create: async () => ({ id: 'user-1' }) },
      tenant: { create: async () => ({ id: 'tenant-1' }) },
      role: { findFirst: async (args: any) => { expect(args.where).toEqual({ tenantId: null, code: 'OWNER', isSystem: true }); return { id: 'role-1' }; } },
      membership: { create: async () => ({}) },
      emailVerificationToken: { create: async () => ({}) },
    } as any;
    const response = await new AuthService(db, undefined, delivery).register({ email: 'a@example.com', password: 'secret', firstName: 'A', lastName: 'B', tenantName: 'Tenant' });
    expect(response).not.toHaveProperty('token');
    expect(delivered[0]).toBeTruthy();
  });
});
