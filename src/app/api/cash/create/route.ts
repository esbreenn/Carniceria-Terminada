import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

type PaymentMethod = "cash" | "transfer" | "debit" | "credit" | "mp";
type Direction = "in" | "out";

function formatKeysAR(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");

  return { dayKey: `${yyyy}-${mm}-${dd}`, monthKey: `${yyyy}-${mm}` };
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json().catch(() => null);
    const direction = body?.direction as Direction;
    const method = body?.method as PaymentMethod;
    const category = String(body?.category || "").trim();
    const amountCents = Number(body?.amountCents);
    const note = String(body?.note || "").trim();

    if (!["in", "out"].includes(direction))
      return NextResponse.json({ error: "direction inválida" }, { status: 400 });

    if (!["cash", "transfer", "debit", "credit", "mp"].includes(method))
      return NextResponse.json({ error: "method inválido" }, { status: 400 });

    if (!category) return NextResponse.json({ error: "category requerido" }, { status: 400 });

    if (!Number.isInteger(amountCents) || amountCents <= 0)
      return NextResponse.json({ error: "amountCents inválido" }, { status: 400 });

    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) return NextResponse.json({ error: "UserDoc missing" }, { status: 401 });

    const { shopId } = userSnap.data() as { shopId: string };

    const now = new Date();
    const { dayKey, monthKey } = formatKeysAR(now);

    const shopRef = adminDb.collection("shops").doc(shopId);
    const cashCol = shopRef.collection("cash_movements");
    const dailyRef = shopRef.collection("daily_summaries").doc(dayKey);
    const monthlyRef = shopRef.collection("monthly_summaries").doc(monthKey);

    const sign = direction === "in" ? 1 : -1;

    const result = await adminDb.runTransaction(async (tx) => {
      const cashRef = cashCol.doc();

      tx.set(cashRef, {
        createdAt: now.getTime(),
        type: "manual",
        direction,
        method,
        category,
        note: note || null,
        amountCents,
        createdBy: uid,
      });

      // neto siempre firmado
      const incNet = FieldValue.increment(sign * amountCents);

      const dailyPatch: any = {
        day: dayKey,
        updatedAt: now.getTime(),
        cashNetCents: incNet,
        // compat vieja (firmado)
        cashByMethod: { [method]: FieldValue.increment(sign * amountCents) },
        cashByCategory: { [category]: FieldValue.increment(sign * amountCents) },
      };

      const monthlyPatch: any = {
        month: monthKey,
        updatedAt: now.getTime(),
        cashNetCents: incNet,
        cashByMethod: { [method]: FieldValue.increment(sign * amountCents) },
        cashByCategory: { [category]: FieldValue.increment(sign * amountCents) },
      };

      // ✅ nuevo: separar in/out
      if (direction === "in") {
        dailyPatch.cashInCents = FieldValue.increment(amountCents);
        dailyPatch.cashInByMethod = { [method]: FieldValue.increment(amountCents) };

        monthlyPatch.cashInCents = FieldValue.increment(amountCents);
        monthlyPatch.cashInByMethod = { [method]: FieldValue.increment(amountCents) };
      } else {
        dailyPatch.cashOutCents = FieldValue.increment(amountCents);
        dailyPatch.cashOutByMethod = { [method]: FieldValue.increment(amountCents) };

        monthlyPatch.cashOutCents = FieldValue.increment(amountCents);
        monthlyPatch.cashOutByMethod = { [method]: FieldValue.increment(amountCents) };
      }

      tx.set(dailyRef, dailyPatch, { merge: true });
      tx.set(monthlyRef, monthlyPatch, { merge: true });

      return { id: cashRef.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 400 });
  }
}
