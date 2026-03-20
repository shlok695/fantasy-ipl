const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const IPL_TEAMS = [
  'CSK', 'DC', 'GT', 'KKR', 'LSG', 'MI', 'PBKS', 'RR', 'RCB', 'SRH'
];

async function seedTeams() {
  console.log("Cleaning and Seeding IPL Teams for auction...");
  
  // Delete existing team records if any
  await prisma.player.deleteMany({
    where: { role: "IPL TEAM" }
  });

  for (const teamName of IPL_TEAMS) {
    await prisma.player.create({
      data: {
        name: teamName,
        role: "IPL TEAM",
        basePrice: "2.0",
        iplTeam: teamName,
        type: "Special",
        country: "India"
      }
    });
  }
  
  console.log("Seeded 10 IPL Teams as auctionable entities.");
}

seedTeams()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
