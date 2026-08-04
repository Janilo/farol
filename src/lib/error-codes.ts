// Farol's domain error codes — the app-specific layer on top of the shared,
// canonical errors.ts. The base AppError + a string-typed appErrorCode live in
// errors.ts; here we pin the *closed set* of codes this app raises and narrow
// appErrorCode to it, so UI code can switch on the code type-safely.
//
// A code earns a place here only when the UI says something different because
// of it. "Upstream is down" and "you asked for a company that doesn't exist"
// are different sentences to the visitor; two internal fetch failures are not.

import { appErrorCode as baseAppErrorCode } from "./errors";

export const APP_ERROR_CODES = [
  "INVALID_CNPJ", // 14 digits didn't check out — never left the browser
  "COMPANY_NOT_FOUND", // valid CNPJ, no record at the source
  // "NAME_NO_MATCH" lived here until 03/Aug/2026 and was never raised: there is
  // no name search to come back empty (see enrichment.server.ts). It failed the
  // rule stated above — a code earns a place only when the UI says something
  // different because of it — and an unreachable code is a promise in the type.
  "SOURCE_RATE_LIMITED", // upstream (Brasil API / cnpj.ws) throttled us
  "SOURCE_UNAVAILABLE", // upstream down or malformed response
  "SITE_UNREACHABLE", // target company site refused/timed out — dossier still renders
  "DEMO_QUOTA_EXCEEDED", // open-demo rate limit hit; invite to sign up
  "FORBIDDEN_PENDING_APPROVAL", // logged in, but account not approved yet
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

/** The domain code from any thrown value, narrowed to Farol's code set. */
export function appErrorCode(err: unknown): AppErrorCode | undefined {
  const code = baseAppErrorCode(err);
  return code && (APP_ERROR_CODES as readonly string[]).includes(code)
    ? (code as AppErrorCode)
    : undefined;
}
