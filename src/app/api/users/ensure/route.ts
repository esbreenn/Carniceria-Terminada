import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const userRef = adminDb.collection("users").doc(uid);
    const snap = await userRef.get();

    // Si no existe userDoc, lo creamos con un shopId inicial
    if (!snap.exists) {
      const shopRef = adminDb.collection("shops").doc(); // nuevo shop
      const shopId = shopRef.id;

      await shopRef.set({
        createdAt: Date.now(),
        name: "Mi Carnicería",
      });

      await userRef.set({
        uid,
        email: decoded.email ?? null,
        shopId,
        role: "owner",
        createdAt: Date.now(),
      });
    }

    const user = (await userRef.get()).data()!;

    return NextResponse.json({
      uid: user.uid,
      email: user.email ?? null,
      shopId: user.shopId,
      role: user.role,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unauthorized" },
      { status: 401 }
    );
  }
}
