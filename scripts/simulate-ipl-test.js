const {
  applySimulation,
  buildSimulationPayload,
  createSimulationBatchId,
  disconnectPrisma,
  parseArgs,
} = require("./lib/simulation");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const batchId = args.batchId || createSimulationBatchId();
  const payload = await buildSimulationPayload(batchId);
  await applySimulation(payload, args.dryRun);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });

