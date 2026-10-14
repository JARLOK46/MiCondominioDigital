/**
 * Integration boundary for email delivery. Implement this in the application layer
 * (mailer/provider) and register it under TOKEN_DELIVERY. Raw tokens are passed only
 * to this boundary and are never returned by HTTP handlers or persisted in plaintext.
 */
export interface TokenDelivery {
  sendEmailVerification(input: { email: string; token: string; expiresAt: Date }): Promise<void>;
  sendPasswordReset(input: { email: string; token: string; expiresAt: Date }): Promise<void>;
}

export const TOKEN_DELIVERY = Symbol('TOKEN_DELIVERY');

/**
 * Development-only delivery implementation. It deliberately does not expose
 * tokens over HTTP; applications can replace this provider with a mail adapter.
 */
export class DevelopmentTokenDelivery implements TokenDelivery {
  async sendEmailVerification(input: { email: string; token: string; expiresAt: Date }): Promise<void> {
    // Keep the integration usable locally without sending real mail.
    console.info(`[auth development] verification email queued for ${input.email}`);
  }

  async sendPasswordReset(input: { email: string; token: string; expiresAt: Date }): Promise<void> {
    console.info(`[auth development] password reset email queued for ${input.email}`);
  }
}

/** Production must replace this with a configured mail provider. */
export class ProductionTokenDelivery implements TokenDelivery {
  private unavailable(): Promise<void> {
    return Promise.reject(new Error('A production token delivery provider is required'));
  }

  sendEmailVerification(_input: { email: string; token: string; expiresAt: Date }): Promise<void> {
    return this.unavailable();
  }

  sendPasswordReset(_input: { email: string; token: string; expiresAt: Date }): Promise<void> {
    return this.unavailable();
  }
}

export function createDefaultTokenDelivery(): TokenDelivery {
  if (process.env.NODE_ENV === 'production') return new ProductionTokenDelivery();
  return new DevelopmentTokenDelivery();
}
