export const SESSION_COOKIE_NAME = "cp_session";

export function isAuthedCookieValue(v: string | undefined) {
  return v === "1";
}
