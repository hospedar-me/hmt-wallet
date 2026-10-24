# @hospedar.me/hmt-wallet

The HMT auxiliary wallet owns its React UI, messages, typography and tokens. It is independent of the booking journey and template appearance. Version 0.1.0 extracts the existing HMT payer, balance, card, Pix, movements and OAuth flows.

Import HmtWalletWidget from /react only through your framework's client-side dynamic loader. Mount only when HMT is enabled and your environment is test or homologation. Pass enabled, environment, locale and operations. Production returns null; your server must omit the loader entirely for real-payment installations so the widget is not downloaded. Do not pass template colors, components, logo or styles.

The widget creates a ShadowRoot and injects its own compiled stylesheet. Drawer, select and dialog portals use the wallet portal container. React and ReactDOM are peer dependencies and are never bundled into the library.

## Server integration

Import createHmtConfig, createHmtSession, createHmtAuth and createHmtActions from /server. Supply explicit environment configuration, a cookie-store adapter, secureCookies and logger. Keep these on the server; wrap operations with your framework's Server Actions. OAuth callback paths remain /api/hmt-wallet/oauth/callback. HTTP-only cookies, state comparison, PKCE and popup-origin/source checks are preserved. The HMT provider client is the existing provider protocol, separate from the Hotel OpenAPI SDK.

## Build and verification

Inside the Docker Compose Node tooling container: npm ci, npm run lint, npm run build, npm test, npm pack. CSS is compiled at build time and embedded inside the widget, without any global CSS import in the template. Only dist and documentation are published. No caches, installations or credentials belong in this package.

## Publishing

Initial ownership of the public npm scope @hospedar.me is required. Configure a trusted publisher for hospedar-me/hmt-wallet, workflow publish.yml, environment npm. Tag v0.1.0 only after that setup. GitHub Actions uses Node24/npm11 and OIDC, without a permanent publishing token: https://docs.npmjs.com/trusted-publishers/. Public installs do not need an npm token. Versions are independent from booking-headless.

The HmtWalletOAuthReturn export owns the popup completion UI and acknowledgement protocol. A template route only provides its locale and existing callback path.
