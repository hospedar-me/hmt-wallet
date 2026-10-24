import { describe, expect, it } from "vitest";

import { buildHmtWalletOAuthCallbackUrl } from "./hmt-wallet.oauth";

describe("buildHmtWalletOAuthCallbackUrl", () => {
  it("derives the HMT callback from the Booking Engine public origin", () => {
    expect(buildHmtWalletOAuthCallbackUrl("https://booking.example")).toBe(
      "https://booking.example/api/hmt-wallet/oauth/callback",
    );
    expect(buildHmtWalletOAuthCallbackUrl("https://booking.example/")).toBe(
      "https://booking.example/api/hmt-wallet/oauth/callback",
    );
  });

  it("drops path, query and fragment from the configured public base", () => {
    expect(
      buildHmtWalletOAuthCallbackUrl(
        "https://booking.example/pt/booking?foo=bar#section",
      ),
    ).toBe("https://booking.example/api/hmt-wallet/oauth/callback");
  });

  it("rejects non HTTP origins", () => {
    expect(() => buildHmtWalletOAuthCallbackUrl("javascript:alert(1)")).toThrow(
      /HTTP or HTTPS/,
    );
  });
});
