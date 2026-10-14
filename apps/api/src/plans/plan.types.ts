export type PlanFeatureValue = boolean | number | string | null;

export interface PlanFeatureMap {
  [featureCode: string]: PlanFeatureValue;
}

export interface PlanRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  priceAmount: number;
  currency: string;
  billingInterval: string;
  maxResidences?: number | null;
  maxUsers?: number | null;
  maxStorageBytes?: bigint | number | null;
  features: PlanFeatureMap;
  isPublic: boolean;
  isActive: boolean;
  limits?: PlanLimitRecord[];
}

export interface PlanLimitRecord {
  featureCode: string;
  limitType: string;
  limitValue: number | null;
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  plan: PlanRecord;
}

export type EntitlementMode = 'FREE' | 'PAID' | 'READ_ONLY';

export interface EntitlementResult {
  mode: EntitlementMode;
  canWrite: boolean;
  reason: 'NO_SUBSCRIPTION' | 'ACTIVE_SUBSCRIPTION' | 'EXPIRED_OR_FAILED_PAYMENT';
  plan: PlanRecord | null;
  subscription: SubscriptionRecord | null;
  features: PlanFeatureMap;
  limits: Record<string, number | null>;
}
