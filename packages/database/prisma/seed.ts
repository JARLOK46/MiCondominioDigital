import { PrismaClient, PlanInterval } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
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
