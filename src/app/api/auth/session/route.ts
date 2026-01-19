import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

const COOKIE_NAME = "__session"; // en Vercel/Firebase suele usarse este

export async function POST(req: Request) {
  try {
    // 1) Token desde Authorization
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    // 2) Token desde body
    let bodyToken: string | null = null;
    try {
      const body = await req.json();
      bodyToken = body?.idToken ?? null;
    } catch {
      // si no hay json, no pasa nada
    }

    const idToken = bearer || bodyToken;

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 });
    }

    // Verifica token
    await adminAuth.verifyIdToken(idToken);

    // Crea session cookie (5 días)
    const expiresIn = 5 * 24 * 60 * 60 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Set cookie httpOnly
    cookies().set(COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unauthorized" },
      { status: 401 }
    );
  }
}
