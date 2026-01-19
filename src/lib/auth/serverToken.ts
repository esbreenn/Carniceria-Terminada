import { headers } from "next/headers";

export async function getBearerTokenFromRequest(): Promise<string | null> {
  const h = await headers();
  const auth = h.get("authorization");
  if (!auth) return null;

  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) return null;

  return token;
}
