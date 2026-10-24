const logger = console;

import type {
  HmtCreateLiveCardRequest,
  HmtCreatedLiveCardResponse,
  HmtLiveBalanceResponse,
  HmtLiveCardDetailResponse,
  HmtLiveCardResponse,
  HmtLiveEntryResponse,
  HmtLiveErrorResponse,
  HmtLivePayerResponse,
  HmtLivePixPaymentResponse,
  HmtPayLivePixRequest,
  HmtUpdateLiveCardRequest,
  HmtWalletMovementRequest,
} from "../types/hmt-live";

type HmtLiveClientOptions = {
  accessToken: string;
  baseUrl: string;
  fetcher?: typeof fetch;
};

type HmtLiveRequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

const isHmtErrorResponse = (value: unknown): value is HmtLiveErrorResponse => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<HmtLiveErrorResponse>;
  return (
    typeof candidate.code === "string" && typeof candidate.message === "string"
  );
};

const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

export class HmtLiveApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, payload?: HmtLiveErrorResponse) {
    super(
      payload?.message ?? `HMT Live API request failed with status ${status}.`,
    );
    this.name = "HmtLiveApiError";
    this.status = status;
    this.code = payload?.code ?? null;
  }
}

export const createHmtLiveClient = ({
  accessToken,
  baseUrl,
  fetcher = fetch,
}: HmtLiveClientOptions) => {
  const token = accessToken.trim();
  const origin = baseUrl.trim().replace(/\/+$/, "");

  if (!token) {
    throw new Error("HMT Live access token is required.");
  }

  if (!origin) {
    throw new Error("HMT Live base URL is required.");
  }

  const request = async <T>(
    path: string,
    { method = "GET", body }: HmtLiveRequestOptions = {},
  ): Promise<T> => {
    const hasBody = body !== undefined;
    let response: Response;

    try {
      response = await fetcher(`${origin}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...(hasBody ? { "Content-Type": "application/json" } : {}),
        },
        body: hasBody ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          baseUrl: origin,
          path,
          method,
        },
        "[HMT Live] request failed before receiving response",
      );
      throw error;
    }

    const payload = await readJson(response);

    if (!response.ok) {
      logger.error(
        {
          baseUrl: origin,
          path,
          method,
          status: response.status,
          statusText: response.statusText,
          errorCode: isHmtErrorResponse(payload) ? payload.code : null,
        },
        "[HMT Live] request returned non-success status",
      );

      throw new HmtLiveApiError(
        response.status,
        isHmtErrorResponse(payload) ? payload : undefined,
      );
    }

    return payload as T;
  };

  return {
    getPayer: () => request<HmtLivePayerResponse>("/v1/me/payer"),

    createPayer: () =>
      request<HmtLivePayerResponse>("/v1/me/payer", {
        method: "POST",
      }),

    getBalance: () => request<HmtLiveBalanceResponse>("/v1/me/payer/balance"),

    listEntries: () => request<HmtLiveEntryResponse[]>("/v1/me/payer/entries"),

    fund: (body: HmtWalletMovementRequest) =>
      request<HmtLiveBalanceResponse>("/v1/me/payer/fund", {
        method: "POST",
        body,
      }),

    withdraw: (body: HmtWalletMovementRequest) =>
      request<HmtLiveBalanceResponse>("/v1/me/payer/withdraw", {
        method: "POST",
        body,
      }),

    payPix: (body: HmtPayLivePixRequest) =>
      request<HmtLivePixPaymentResponse>("/v1/me/payer/pix/pay", {
        method: "POST",
        body,
      }),

    listCards: () => request<HmtLiveCardResponse[]>("/v1/me/payer/cards"),

    getCard: (cardId: string) =>
      request<HmtLiveCardDetailResponse>(
        `/v1/me/payer/cards/${encodeURIComponent(cardId)}`,
      ),

    createCard: (body: HmtCreateLiveCardRequest) =>
      request<HmtCreatedLiveCardResponse>("/v1/me/payer/cards", {
        method: "POST",
        body,
      }),

    updateCard: (cardId: string, body: HmtUpdateLiveCardRequest) =>
      request<HmtLiveCardResponse>(
        `/v1/me/payer/cards/${encodeURIComponent(cardId)}`,
        {
          method: "PATCH",
          body,
        },
      ),
  };
};

export type HmtLiveClient = ReturnType<typeof createHmtLiveClient>;
