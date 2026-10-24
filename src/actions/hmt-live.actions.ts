import {
  HMT_LIVE_CARD_BRANDS,
  HMT_LIVE_CARD_FUNDINGS,
} from "../types/hmt-live";
import type {
  HmtActionResult,
  HmtCreateLiveCardRequest,
  HmtCreatedLiveCardResponse,
  HmtLiveBalanceResponse,
  HmtLiveCardDetailResponse,
  HmtLiveCardLifecycle,
  HmtLiveCardResponse,
  HmtLiveEntryResponse,
  HmtLivePayerResponse,
  HmtLivePixPaymentResponse,
  HmtPayLivePixRequest,
  HmtUpdateLiveCardRequest,
  HmtWalletMovementRequest,
} from "../types/hmt-live";

export function createHmtActions(options: {
  session: ReturnType<typeof createHmtSession>;
  auth: ReturnType<typeof createHmtAuth>;
  config: ReturnType<typeof createHmtConfig>;
  logger?: Pick<Console, "error" | "warn" | "info">;
}) {
  const { clearHmtAccessToken, clearHmtSession, getHmtAccessToken } =
    options.session;
  const { createHmtOAuthBridgeUrl } = options.auth;
  const logger = options.logger || console;
  const createHmtLiveClient = ({ accessToken }: { accessToken: string }) =>
    client({ accessToken, baseUrl: options.config.getHmtLiveBaseUrl() });
  const authRequired = <T>(): HmtActionResult<T> => ({
    error: {
      code: "hmt_auth_required",
      message: "HMT authentication is required.",
      status: 401,
    },
  });
  const validationError = <T>(message: string): HmtActionResult<T> => ({
    error: {
      code: "invalid_input",
      message,
      status: 400,
    },
  });
  const mapUnknownError = <T>(error: unknown): HmtActionResult<T> => {
    if (error instanceof HmtLiveApiError) {
      return {
        error: {
          code: error.code ?? "hmt_live_error",
          message: error.message,
          status: error.status,
        },
      };
    }

    return {
      error: {
        code: "hmt_unavailable",
        message: "Unable to reach HMT Live.",
      },
    };
  };
  const withHmtClient = async <T>(
    operation: (client: HmtLiveClient) => Promise<T>,
  ): Promise<HmtActionResult<T>> => {
    const accessToken = await getHmtAccessToken();
    if (!accessToken) return authRequired<T>();

    try {
      const data = await operation(createHmtLiveClient({ accessToken }));
      return { data };
    } catch (error) {
      if (error instanceof HmtLiveApiError && error.status === 403) {
        await clearHmtAccessToken();
      }

      return mapUnknownError<T>(error);
    }
  };
  const validateMovement = (
    body: HmtWalletMovementRequest,
  ): HmtActionResult<never> | null => {
    if (!Number.isSafeInteger(body.amountInCents) || body.amountInCents <= 0) {
      return validationError<never>(
        "amountInCents must be a positive integer.",
      );
    }

    if (!body.idempotencyKey?.trim()) {
      return validationError<never>("idempotencyKey is required.");
    }

    return null;
  };
  const validateCardId = (cardId: string): HmtActionResult<never> | null =>
    cardId?.trim() ? null : validationError<never>("cardId is required.");
  const validateCardCreate = (
    body: HmtCreateLiveCardRequest,
  ): HmtActionResult<never> | null => {
    if (
      typeof body?.brand !== "string" ||
      !(HMT_LIVE_CARD_BRANDS as readonly string[]).includes(body.brand)
    ) {
      return validationError<never>("brand must be visa or mastercard.");
    }

    if (
      typeof body?.funding !== "string" ||
      !(HMT_LIVE_CARD_FUNDINGS as readonly string[]).includes(body.funding)
    ) {
      return validationError<never>("funding must be credit or debit.");
    }

    return null;
  };
  const validatePixPayment = (
    body: HmtPayLivePixRequest,
  ): HmtActionResult<never> | null =>
    body?.pixCode?.trim()
      ? null
      : validationError<never>("pixCode is required.");
  const CARD_LIFECYCLES: readonly HmtLiveCardLifecycle[] = [
    "active",
    "blocked",
    "canceled",
  ];
  const validateCardUpdate = (
    body: HmtUpdateLiveCardRequest,
  ): HmtActionResult<never> | null =>
    CARD_LIFECYCLES.includes(body.lifecycle)
      ? null
      : validationError<never>(
          "lifecycle must be active, blocked or canceled.",
        );
  const actionStartHmtOAuth = async ({
    locale,
    returnPath,
  }: {
    locale: string;
    returnPath: string;
  }): Promise<HmtActionResult<{ authorizationUrl: string }>> => {
    try {
      const authorizationUrl = await createHmtOAuthBridgeUrl({
        locale,
        returnPath,
      });
      return { data: { authorizationUrl } };
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to start HMT delegated OAuth authorization",
      );
      return {
        error: {
          code: "hmt_oauth_unavailable",
          message: "Unable to start HMT authentication.",
        },
      };
    }
  };
  const actionGetHmtPayer = async (): Promise<
    HmtActionResult<HmtLivePayerResponse | null>
  > => {
    const accessToken = await getHmtAccessToken();
    if (!accessToken) return authRequired<HmtLivePayerResponse | null>();

    try {
      const client = createHmtLiveClient({ accessToken });
      return { data: await client.getPayer() };
    } catch (error) {
      if (
        error instanceof HmtLiveApiError &&
        error.status === 404 &&
        error.code === "not_found"
      ) {
        return { data: null };
      }

      if (error instanceof HmtLiveApiError && error.status === 403) {
        await clearHmtAccessToken();
      }

      return mapUnknownError<HmtLivePayerResponse | null>(error);
    }
  };
  const actionCreateHmtPayer = async (): Promise<
    HmtActionResult<HmtLivePayerResponse>
  > => withHmtClient((client) => client.createPayer());
  const actionGetHmtBalance = async (): Promise<
    HmtActionResult<HmtLiveBalanceResponse>
  > => withHmtClient((client) => client.getBalance());
  const actionListHmtEntries = async (): Promise<
    HmtActionResult<HmtLiveEntryResponse[]>
  > => withHmtClient((client) => client.listEntries());
  const actionFundHmtWallet = async (
    body: HmtWalletMovementRequest,
  ): Promise<HmtActionResult<HmtLiveBalanceResponse>> => {
    const invalid = validateMovement(body);
    if (invalid) return invalid;

    return withHmtClient((client) =>
      client.fund({
        amountInCents: body.amountInCents,
        idempotencyKey: body.idempotencyKey.trim(),
      }),
    );
  };
  const actionWithdrawHmtWallet = async (
    body: HmtWalletMovementRequest,
  ): Promise<HmtActionResult<HmtLiveBalanceResponse>> => {
    const invalid = validateMovement(body);
    if (invalid) return invalid;

    return withHmtClient((client) =>
      client.withdraw({
        amountInCents: body.amountInCents,
        idempotencyKey: body.idempotencyKey.trim(),
      }),
    );
  };
  const actionPayHmtPix = async (
    body: HmtPayLivePixRequest,
  ): Promise<HmtActionResult<HmtLivePixPaymentResponse>> => {
    const invalid = validatePixPayment(body);
    if (invalid) return invalid;

    return withHmtClient((client) =>
      client.payPix({
        pixCode: body.pixCode.trim(),
      }),
    );
  };
  const actionListHmtCards = async (): Promise<
    HmtActionResult<HmtLiveCardResponse[]>
  > => withHmtClient((client) => client.listCards());
  const actionGetHmtCard = async (
    cardId: string,
  ): Promise<HmtActionResult<HmtLiveCardDetailResponse>> => {
    const invalid = validateCardId(cardId);
    if (invalid) return invalid;

    return withHmtClient((client) => client.getCard(cardId.trim()));
  };
  const actionCreateHmtCard = async (
    body: HmtCreateLiveCardRequest,
  ): Promise<HmtActionResult<HmtCreatedLiveCardResponse>> => {
    const invalid = validateCardCreate(body);
    if (invalid) return invalid;

    return withHmtClient((client) =>
      client.createCard({
        brand: body.brand,
        funding: body.funding,
      }),
    );
  };
  const actionUpdateHmtCard = async (
    cardId: string,
    body: HmtUpdateLiveCardRequest,
  ): Promise<HmtActionResult<HmtLiveCardResponse>> => {
    const invalidCard = validateCardId(cardId);
    if (invalidCard) return invalidCard;

    const invalidBody = validateCardUpdate(body);
    if (invalidBody) return invalidBody;

    return withHmtClient((client) =>
      client.updateCard(cardId.trim(), { lifecycle: body.lifecycle }),
    );
  };
  const actionLogoutHmt = async (): Promise<HmtActionResult<true>> => {
    await clearHmtSession();
    return { data: true };
  };
  return {
    actionStartHmtOAuth,
    actionGetHmtPayer,
    actionCreateHmtPayer,
    actionGetHmtBalance,
    actionListHmtEntries,
    actionFundHmtWallet,
    actionWithdrawHmtWallet,
    actionPayHmtPix,
    actionListHmtCards,
    actionGetHmtCard,
    actionCreateHmtCard,
    actionUpdateHmtCard,
    actionLogoutHmt,
  };
}

import {
  HmtLiveApiError,
  createHmtLiveClient as client,
  type HmtLiveClient,
} from "../server/hmt-live.client";
import type { createHmtConfig } from "../server/hmt-wallet.config";
import type { createHmtSession } from "../server/hmt-live.session";
import type { createHmtAuth } from "../server/hmt-live.auth";
