const {
  clearSimulation,
  disconnectPrisma,
  parseArgs,
} = require("./lib/simulation");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await clearSimulation(args.batchId, args.dryRun);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });

