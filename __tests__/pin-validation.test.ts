/**
 * Tests for PIN validation logic.
 * Uses an isolated module with a mocked environment.
 */

describe("validatePin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns true when PIN matches env var", async () => {
    process.env.SCANNER_PIN = "9876";
    const { validatePin } = await import("@/lib/auth/pin");
    expect(validatePin("9876")).toBe(true);
  });

  it("returns false when PIN does not match", async () => {
    process.env.SCANNER_PIN = "9876";
    const { validatePin } = await import("@/lib/auth/pin");
    expect(validatePin("0000")).toBe(false);
  });

  it("returns false when SCANNER_PIN env var is not set", async () => {
    delete process.env.SCANNER_PIN;
    const { validatePin } = await import("@/lib/auth/pin");
    expect(validatePin("1234")).toBe(false);
  });

  it("is case-sensitive / exact match only", async () => {
    process.env.SCANNER_PIN = "AbCd";
    const { validatePin } = await import("@/lib/auth/pin");
    expect(validatePin("abcd")).toBe(false);
    expect(validatePin("AbCd")).toBe(true);
  });
});
