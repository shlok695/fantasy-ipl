import assert from 'node:assert/strict';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const { handleAuctionPost } = jiti('./auctionRouteCore.ts');

function createTx(overrides = {}) {
  const events = [];
  const tx = {
    $executeRawUnsafe: async () => {
      events.push(['audit']);
    },
    auctionState: {
      findUnique: async () => ({
        id: 'global',
        currentPlayerId: 'player-1',
        highestBid: 5,
        highestBidderId: 'team-bidder',
        status: 'BIDDING',
        readyTeams: 'team-a,team-b',
      }),
      update: async (args) => {
        events.push(['auctionState.update', args]);
        return { id: 'global' };
      },
    },
    user: {
      findUnique: async ({ where }) => ({
        id: where.id,
        name: where.id === 'team-1' ? 'Team One' : 'Other Team',
        budget: 100,
      }),
      update: async (args) => {
        events.push(['user.update', args]);
        return {};
      },
    },
    player: {
      findUnique: async ({ where }) => ({
        id: where.id,
        name: 'Staged Player',
        userId: null,
        auctionPrice: null,
        acquisition: null,
        role: 'Batter',
      }),
      update: async (args) => {
        events.push(['player.update', args]);
        return {
          id: args.where.id,
          name: 'Staged Player',
          userId: args.data.userId,
          auctionPrice: args.data.auctionPrice,
          acquisition: args.data.acquisition,
        };
      },
    },
    ...overrides,
  };

  return { tx, events };
}

async function testUnauthorizedGuard() {
  let parsedBody = false;
  let transactionStarted = false;
  let auditRecorded = false;

  const response = await handleAuctionPost({
    getSession: async () => ({
      user: {
        name: 'mumbai-indians',
      },
    }),
    parseJson: async () => {
      parsedBody = true;
      return {
        playerId: 'player-1',
        teamId: 'team-1',
        amount: 10,
      };
    },
    prisma: {
      $transaction: async () => {
        transactionStarted = true;
        throw new Error('transaction should not run for non-admin requests');
      },
    },
    recordAdminAudit: async () => {
      auditRecorded = true;
    },
  });

  assert.equal(response.status, 401);
  assert.equal(parsedBody, false);
  assert.equal(transactionStarted, false);
  assert.equal(auditRecorded, false);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'Unauthorized',
    code: 'UNAUTHORIZED',
  });
}

async function testInvalidPhase() {
  const { tx } = createTx({
    auctionState: {
      findUnique: async () => ({
        id: 'global',
        currentPlayerId: 'player-1',
        highestBid: 5,
        highestBidderId: 'team-bidder',
        status: 'SUMMARY',
        readyTeams: '',
      }),
      update: async () => {
        throw new Error('auction state should not update on invalid phase');
      },
    },
  });

  const response = await handleAuctionPost({
    getSession: async () => ({ user: { name: 'admin' } }),
    parseJson: async () => ({
      playerId: 'player-1',
      teamId: 'team-1',
      amount: 12,
    }),
    prisma: {
      $transaction: async (callback) => callback(tx),
    },
    recordAdminAudit: async () => {
      throw new Error('audit should not run on invalid phase');
    },
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'Manual sell is only allowed while the auction is in BIDDING unless override is enabled',
    code: 'INVALID_AUCTION_PHASE',
  });
}

async function testWrongPlayer() {
  const { tx } = createTx();

  const response = await handleAuctionPost({
    getSession: async () => ({ user: { name: 'admin' } }),
    parseJson: async () => ({
      playerId: 'player-2',
      teamId: 'team-1',
      amount: 12,
    }),
    prisma: {
      $transaction: async (callback) => callback(tx),
    },
    recordAdminAudit: async () => {
      throw new Error('audit should not run for wrong player');
    },
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'Manual sell can only target the currently staged player',
    code: 'PLAYER_NOT_STAGED',
  });
}

async function testSuccess() {
  const { tx, events } = createTx();

  const response = await handleAuctionPost({
    getSession: async () => ({ user: { name: 'admin' } }),
    parseJson: async () => ({
      playerId: 'player-1',
      teamId: 'team-1',
      amount: 18.5,
    }),
    prisma: {
      $transaction: async (callback) => callback(tx),
    },
    recordAdminAudit: async (actor, action, details, currentTx) => {
      events.push(['recordAdminAudit', { actor, action, details, sameTx: currentTx === tx }]);
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    player: {
      id: 'player-1',
      name: 'Staged Player',
      userId: 'team-1',
      auctionPrice: 18.5,
      acquisition: 'Sold',
    },
  });

  assert.deepEqual(events, [
    [
      'user.update',
      {
        where: { id: 'team-1' },
        data: { budget: 81.5 },
      },
    ],
    [
      'player.update',
      {
        where: { id: 'player-1' },
        data: {
          userId: 'team-1',
          auctionPrice: 18.5,
          acquisition: 'Sold',
        },
      },
    ],
    [
      'auctionState.update',
      {
        where: { id: 'global' },
        data: {
          highestBid: 18.5,
          highestBidderId: 'team-1',
          status: 'SUMMARY',
          readyTeams: '',
          updatedAt: events[2]?.[1]?.data?.updatedAt,
        },
      },
    ],
    [
      'recordAdminAudit',
      {
        actor: 'admin',
        action: 'MANUAL_SELL',
        details: 'Staged Player -> Team One 18.5',
        sameTx: true,
      },
    ],
  ]);

  assert.ok(events[2][1].data.updatedAt instanceof Date);
}

async function main() {
  await testUnauthorizedGuard();
  await testInvalidPhase();
  await testWrongPlayer();
  await testSuccess();
  console.log('auction route regression passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
