import { PrismaClient, PlanInterval } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const ownerRole = await prisma.role.findFirst({ where: { tenantId: null, code: 'OWNER' } });
  const role = ownerRole ?? await prisma.role.create({
    data: { name: 'Condominium owner', code: 'OWNER', isSystem: true },
  });
  const permission = await prisma.permission.upsert({
    where: { code: 'tenant.manage' },
    update: {},
    create: { code: 'tenant.manage', description: 'Manage the condominium tenant' },
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
    update: {},
    create: { roleId: role.id, permissionId: permission.id },
  });

  await prisma.plan.upsert({
    where: { code: 'free' },
    update: {},
    create: {
      code: 'free',
      name: 'Free Demo',
      description: 'Limited demo access for small condominiums.',
      priceAmount: 0,
      currency: 'COP',
      billingInterval: PlanInterval.MONTHLY,
      maxResidences: 5,
      maxUsers: 3,
      features: {
        basic_dashboard: true,
        residence_management: true,
        resident_management: true,
        visit_registration: true,
        resident_messaging: false,
        admin_ai_chat: false,
        vehicle_plate_detection: false,
        advanced_exports: false
      }
    }
  });
}

main()
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
