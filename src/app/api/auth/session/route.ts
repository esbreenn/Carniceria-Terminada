import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

const COOKIE_NAME = "__session"; // recomendado para Firebase / hosting
const FIVE_DAYS = 60 * 60 * 24 * 5;

export async function POST(req: Request) {
  try {
    // 1) Tomar el idToken desde Authorization: Bearer xxx o desde body { idToken }
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    let idToken = bearer;

    if (!idToken) {
      const body = await req.json().catch(() => null);
      idToken = body?.idToken ?? null;
    }

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 });
    }

    // 2) Verificar token y crear cookie de sesión
    await adminAuth.verifyIdToken(idToken);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS * 1000,
    });

    // 3) Devolver respuesta seteando cookie (NO usar cookies().set)
    const res = NextResponse.json({ ok: true });

    res.cookies.set(COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: FIVE_DAYS,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unauthorized" },
      { status: 401 }
    );
  }
}
