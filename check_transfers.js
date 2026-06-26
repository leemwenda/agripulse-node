const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const transfers = await prisma.ownershipTransfer.findMany({
    select: {
      id: true,
      transferCode: true,
      status: true,
      toEmail: true,
      fromFarmId: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(transfers, null, 2));
  await prisma.$disconnect();
})();
