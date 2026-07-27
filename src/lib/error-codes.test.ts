import { describe, it, expect } from "vitest";

import { AppError, NotFoundError } from "./errors";
import { appErrorCode, APP_ERROR_CODES } from "./error-codes";

describe("appErrorCode (typed to Farol's code set)", () => {
  it("returns the code when it is one of the app's codes", () => {
    expect(appErrorCode(new NotFoundError("Empresa não encontrada", "COMPANY_NOT_FOUND"))).toBe(
      "COMPANY_NOT_FOUND",
    );
    expect(appErrorCode(new AppError("Fonte indisponível", 502, "SOURCE_UNAVAILABLE"))).toBe(
      "SOURCE_UNAVAILABLE",
    );
  });

  it("survives the serverFn boundary (plain object + marker)", () => {
    const wire = { appError: true, status: 404, code: "COMPANY_NOT_FOUND", message: "no" };
    expect(appErrorCode(wire)).toBe("COMPANY_NOT_FOUND");
  });

  it("returns undefined for unknown codes or non-domain errors", () => {
    expect(appErrorCode(new AppError("x", 500, "NOT_A_FAROL_CODE"))).toBeUndefined();
    expect(appErrorCode(new Error("plain"))).toBeUndefined();
    expect(appErrorCode(null)).toBeUndefined();
  });

  it("lists every code the app raises", () => {
    // A code belongs here only when the UI says something different because of
    // it — see the note in error-codes.ts. Bump this count deliberately.
    expect(APP_ERROR_CODES).toContain("DEMO_QUOTA_EXCEEDED");
    expect(APP_ERROR_CODES).toContain("SITE_UNREACHABLE");
    expect(APP_ERROR_CODES.length).toBe(8);
  });
});
