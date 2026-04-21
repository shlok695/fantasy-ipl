import { z } from 'zod';

type SessionLike = {
  user?: {
    name?: string | null;
  } | null;
} | null;

type AuctionPlayer = {
  id: string;
  name: string;
  userId: string | null;
  auctionPrice: number | null;
  acquisition?: string | null;
  role?: string | null;
};

type AuctionTeam = {
  id: string;
  name: string;
  budget: number;
  iplTeam?: string | null;
};

type AuctionState = {
  id: string;
  currentPlayerId: string | null;
  highestBid: number;
  highestBidderId: string | null;
  status: string;
  readyTeams: string | null;
};

type AuctionTx = {
  $executeRawUnsafe?: (...args: unknown[]) => Promise<unknown>;
  user: {
    findUnique(args: { where: { id: string } }): Promise<AuctionTeam | null>;
    update(args: {
      where: { id: string };
      data: { budget: number; iplTeam?: string };
    }): Promise<unknown>;
  };
  player: {
    findUnique(args: { where: { id: string } }): Promise<AuctionPlayer | null>;
    update(args: {
      where: { id: string };
      data: { userId: string | null; auctionPrice: number; acquisition: 'Sold' };
    }): Promise<AuctionPlayer>;
  };
  auctionState: {
    findUnique(args: { where: { id: string } }): Promise<AuctionState | null>;
    update(args: {
      where: { id: string };
      data: {
        highestBid: number;
        highestBidderId: string | null;
        status: 'SUMMARY';
        readyTeams: string;
        updatedAt: Date;
      };
    }): Promise<unknown>;
  };
};

type AuctionDeps = {
  getSession: () => Promise<SessionLike>;
  parseJson: () => Promise<unknown>;
  prisma: {
    $transaction<T>(callback: (tx: AuctionTx) => Promise<T>): Promise<T>;
  };
  recordAdminAudit: (
    actor: string,
    action: string,
    details: string,
    tx?: AuctionTx
  ) => Promise<void>;
};

type ErrorDetail = {
  field: string;
  message: string;
};

type ErrorBody = {
  success: false;
  error: string;
  code: string;
  details?: ErrorDetail[];
};

const manualSellSchema = z
  .object({
    playerId: z.string().trim().min(1, 'playerId is required'),
    teamId: z.string().trim().min(1, 'teamId is required'),
    amount: z
      .number()
      .finite('amount must be a finite number')
      .positive('amount must be greater than 0'),
    override: z.boolean().optional().default(false),
  })
  .strict();

class AuctionRouteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[]
  ) {
    super(message);
    this.name = 'AuctionRouteError';
  }
}

function errorResponse(status: number, code: string, message: string, details?: ErrorDetail[]) {
  const body: ErrorBody = {
    success: false,
    error: message,
    code,
    ...(details ? { details } : {}),
  };

  return Response.json(body, { status });
}

function toValidationDetails(error: z.ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
}

function normalizeError(error: unknown) {
  if (error instanceof AuctionRouteError) {
    return errorResponse(error.status, error.code, error.message, error.details);
  }

  if (error instanceof SyntaxError) {
    return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }

  if (error instanceof z.ZodError) {
    return errorResponse(
      400,
      'INVALID_REQUEST_BODY',
      'Request body failed validation',
      toValidationDetails(error)
    );
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return errorResponse(400, 'AUCTION_REQUEST_FAILED', message);
}

export async function handleAuctionPost(deps: AuctionDeps) {
  try {
    const session = await deps.getSession();

    if (session?.user?.name !== 'admin') {
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized');
    }

    const payload = manualSellSchema.parse(await deps.parseJson());

    const result = await deps.prisma.$transaction(async (tx) => {
      const state = await tx.auctionState.findUnique({ where: { id: 'global' } });

      if (!state?.currentPlayerId) {
        throw new AuctionRouteError(409, 'NO_STAGED_PLAYER', 'No player is currently staged');
      }

      if (state.currentPlayerId !== payload.playerId) {
        throw new AuctionRouteError(
          409,
          'PLAYER_NOT_STAGED',
          'Manual sell can only target the currently staged player'
        );
      }

      if (state.status !== 'BIDDING' && !payload.override) {
        throw new AuctionRouteError(
          409,
          'INVALID_AUCTION_PHASE',
          'Manual sell is only allowed while the auction is in BIDDING unless override is enabled'
        );
      }

      const team = await tx.user.findUnique({ where: { id: payload.teamId } });
      const player = await tx.player.findUnique({ where: { id: payload.playerId } });

      if (!team) {
        throw new AuctionRouteError(404, 'TEAM_NOT_FOUND', 'Team not found');
      }

      if (!player) {
        throw new AuctionRouteError(404, 'PLAYER_NOT_FOUND', 'Player not found');
      }

      if (player.userId) {
        throw new AuctionRouteError(409, 'PLAYER_ALREADY_SOLD', 'Player already sold');
      }

      if (team.budget < payload.amount) {
        throw new AuctionRouteError(400, 'INSUFFICIENT_BUDGET', 'Insufficient budget');
      }

      const isTeamAuction = player.role === 'IPL TEAM';

      await tx.user.update({
        where: { id: payload.teamId },
        data: {
          budget: team.budget - payload.amount,
          ...(isTeamAuction ? { iplTeam: player.name } : {}),
        },
      });

      const updatedPlayer = await tx.player.update({
        where: { id: payload.playerId },
        data: {
          userId: isTeamAuction ? null : payload.teamId,
          auctionPrice: payload.amount,
          acquisition: 'Sold',
        },
      });

      await tx.auctionState.update({
        where: { id: 'global' },
        data: {
          highestBid: payload.amount,
          highestBidderId: payload.teamId,
          status: 'SUMMARY',
          readyTeams: '',
          updatedAt: new Date(),
        },
      });

      await deps.recordAdminAudit(
        session.user?.name || 'admin',
        payload.override ? 'MANUAL_SELL_OVERRIDE' : 'MANUAL_SELL',
        `${updatedPlayer.name} -> ${team.name} ${payload.amount}`,
        tx
      );

      return { updatedPlayer, teamName: team.name };
    });

    return Response.json({ success: true, player: result.updatedPlayer });
  } catch (error: unknown) {
    return normalizeError(error);
  }
}
