// Usage: node reset_password.js "Franchise Name" "NewPassword123"

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Please provide a team name and new password.");
    console.log('Example: node reset_password.js "Shlok Knight Rider" "newpass"');
    process.exit(1);
  }

  const teamName = args[0];
  const newPassword = args[1];

  try {
    const user = await prisma.user.findUnique({
      where: { name: teamName }
    });

    if (!user) {
      console.error(`Error: Franchise '${teamName}' not found in the database.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { name: teamName },
      data: { password: hashedPassword }
    });

    console.log(`Success! Password for '${teamName}' has been reset to: ${newPassword}`);
  } catch (error) {
    console.error("An error occurred during password reset:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
