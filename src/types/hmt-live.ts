export type HmtLiveErrorResponse = {
  code: string;
  message: string;
};

export type HmtLivePayerResponse = {
  providerAccountId: string;
  status: string;
  createdAt: string;
};

export type HmtLiveBalanceResponse = {
  pendingInCents: number;
  availableInCents: number;
};

export type HmtLiveEntryResponse = {
  id: string;
  entryType: string;
  balanceBucket: string;
  amountInCents: number;
  paymentIntentId: string | null;
  receivableId: string | null;
  refundId: string | null;
  createdAt: string;
};

export type HmtWalletMovementRequest = {
  amountInCents: number;
  idempotencyKey: string;
};

export const HMT_LIVE_CARD_BRANDS = ["visa", "mastercard"] as const;
export type HmtLiveCardBrand = (typeof HMT_LIVE_CARD_BRANDS)[number];

export const HMT_LIVE_CARD_FUNDINGS = ["credit", "debit"] as const;
export type HmtLiveCardFunding = (typeof HMT_LIVE_CARD_FUNDINGS)[number];

/**
 * The backend still publishes these fields as strings, but its current
 * implementation accepts only the values above. Keep the frontend closed over
 * that known contract until explicit enums are published by the API.
 */
export type HmtCreateLiveCardRequest = {
  brand: HmtLiveCardBrand;
  funding: HmtLiveCardFunding;
};

export type HmtPayLivePixRequest = {
  pixCode: string;
};

export type HmtLivePixPaymentResponse = {
  id: string;
  providerAccountId: string;
  flowKind: string;
  status: string;
  amountInCents: number;
  externalReference: string;
  failureReason: string | null;
  createdAt: string;
};

export type HmtLiveCardLifecycle = "active" | "blocked" | "canceled";

/**
 * Returned only when a card is created. The HMT backend marks this response
 * as `Cache-Control: no-store` because it contains the generated PAN and CVC.
 */
export type HmtCreatedLiveCardResponse = {
  id: string;
  number: string;
  expirationMonth: number;
  expirationYear: number;
  securityCode: string;
  brand: HmtLiveCardBrand;
  funding: HmtLiveCardFunding;
  lifecycle: HmtLiveCardLifecycle;
};

export type HmtLiveCardResponse = {
  id: string;
  brand: HmtLiveCardBrand;
  funding: HmtLiveCardFunding;
  last4: string;
  expirationMonth: number;
  expirationYear: number;
  lifecycle: HmtLiveCardLifecycle;
  createdAt: string;
};

export type HmtLiveCardDetailResponse = HmtLiveCardResponse & {
  /**
   * Synthetic test card secrets. They are null for legacy cards created before
   * the HMT provider started persisting them for authenticated reveal.
   */
  number: string | null;
  securityCode: string | null;
};

export type HmtUpdateLiveCardRequest = {
  lifecycle: HmtLiveCardLifecycle;
};

export type HmtOAuthAuthorizationServerMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
};

export type HmtCreateOAuthAuthorizationRequest = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
};

export type HmtOAuthAuthorizationResponse = {
  redirectUrl: string;
  expiresAt: string;
};

export type HmtOAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type HmtOAuthTransaction = {
  state: string;
  codeVerifier: string;
  locale: string;
  returnPath: string;
};

export type HmtActionError = {
  code: string;
  message: string;
  status?: number;
};

export type HmtActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: HmtActionError };
