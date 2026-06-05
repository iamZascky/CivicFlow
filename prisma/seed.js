
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const citizenPassword = await bcrypt.hash('citizen123', 10);

  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@civicflow.com' } });
  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: 'admin@civicflow.com',
        name: 'Admin User',
        password: adminPassword,
        role: 'ADMIN',
      },
    });
  }

  const existingCitizen = await prisma.user.findUnique({ where: { email: 'citizen@example.com' } });
  if (!existingCitizen) {
    const citizen = await prisma.user.create({
      data: {
        email: 'citizen@example.com',
        name: 'John Citizen',
        password: citizenPassword,
        role: 'CITIZEN',
      },
    });
  }

  console.log("Seeded database with default users");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
