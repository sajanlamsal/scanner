import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";

/** Returns true if the current request has a valid PIN session cookie */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const val = cookieStore.get(SESSION_COOKIE)?.value;
  return val === process.env.COOKIE_SECRET;
}

/** Check PIN submitted by the user */
export function validatePin(pin: string): boolean {
  const expected = process.env.SCANNER_PIN;
  if (!expected) return false;
  return pin === expected;
}

export { SESSION_COOKIE } from "./constants";
