import { EntitlementMode, PlanFeatureMap } from '../plans/plan.types';

export interface DesktopBootstrapInput {
  tenantId: string;
  userId: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
}

export interface DesktopBootstrapDto {
  tenantId: string;
  userId: string;
  mode: EntitlementMode;
  canWrite: boolean;
  reason: string;
  plan: {
    code: string;
    name: string;
    features: PlanFeatureMap;
  } | null;
  limits: Record<string, number | null>;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}
