import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // Hidden test account
  const testPassword = await bcrypt.hash('Mk3@c4URPV', 12);
  await prisma.user.upsert({
    where: { email: 'abacus-400362f2@example.com' },
    update: {},
    create: {
      email: 'abacus-400362f2@example.com',
      name: 'Test Admin',
      hashedPassword: testPassword,
    },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
