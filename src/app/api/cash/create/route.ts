import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { PaymentMethod } from "@/lib/sales/types";
import { FieldValue } from "firebase-admin/firestore";

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

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json().catch(() => null);
    if (!body?.items || !body?.paymentMethod) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const paymentMethod = body.paymentMethod as PaymentMethod;
    const items = body.items as Array<
      | { productId: string; mode: "kg"; qtyKg: number }
      | { productId: string; mode: "amount"; amountCents: number }
    >;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items inválidos" }, { status: 400 });
    }

    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "UserDoc missing" }, { status: 401 });
    }

    const user = userSnap.data() as { shopId: string; role: string };
    const shopId = user.shopId;

    const now = new Date();
    const { dayKey, monthKey } = formatKeysAR(now);

    const shopRef = adminDb.collection("shops").doc(shopId);
    const salesCol = shopRef.collection("sales");
    const cashCol = shopRef.collection("cash_movements");
    const dailyRef = shopRef.collection("daily_summaries").doc(dayKey);
    const monthlyRef = shopRef.collection("monthly_summaries").doc(monthKey);

    const result = await adminDb.runTransaction(async (tx) => {
      const itemsSummary: Array<{
        productId: string;
        productName: string;
        qtyKg: number;
        pricePerKgCents: number;
        totalCents: number;
        newStock: number;
      }> = [];
      let totalCents = 0;
      let totalQtyKg = 0;

      for (const item of items) {
        const productRef = shopRef.collection("products").doc(item.productId);
        const prodSnap = await tx.get(productRef);
        if (!prodSnap.exists) throw new Error("Producto no existe");

        const p = prodSnap.data() as {
          name: string;
          unit: "kg" | "unit";
          salePriceCents: number;
          stockQty: number;
        };

        if (p.unit !== "kg") throw new Error("En MVP ventas solo para productos por KG");

        const pricePerKgCents = p.salePriceCents;

        let qtyKg: number;
        let itemTotalCents: number;

        if (item.mode === "kg") {
          qtyKg = Number(item.qtyKg);
          if (!Number.isFinite(qtyKg) || qtyKg <= 0) throw new Error("qtyKg inválido");
          itemTotalCents = Math.round(qtyKg * pricePerKgCents);
        } else {
          const amountCents = Number(item.amountCents);
          if (!Number.isInteger(amountCents) || amountCents <= 0)
            throw new Error("amountCents inválido");

          itemTotalCents = amountCents;
          qtyKg = Number((amountCents / pricePerKgCents).toFixed(3));
          if (!Number.isFinite(qtyKg) || qtyKg <= 0) throw new Error("Cálculo qtyKg inválido");
        }

        const newStock = Number((p.stockQty - qtyKg).toFixed(3));
        if (newStock < -0.0001) throw new Error("Stock insuficiente");

        tx.update(productRef, { stockQty: newStock });

        itemsSummary.push({
          productId: item.productId,
          productName: p.name,
          qtyKg,
          pricePerKgCents,
          totalCents: itemTotalCents,
          newStock,
        });
        totalCents += itemTotalCents;
        totalQtyKg += qtyKg;
      }

      const saleRef = salesCol.doc();
      tx.set(saleRef, {
        createdAt: now.getTime(),
        createdBy: uid,
        shopId,
        paymentMethod,
        items: itemsSummary.map(({ newStock: _newStock, ...rest }) => rest),
        totalQtyKg,
        totalCents,
      });

      const cashRef = cashCol.doc();
      tx.set(cashRef, {
        createdAt: now.getTime(),
        type: "sale",
        direction: "in",
        method: paymentMethod,
        amountCents: totalCents,
        saleId: saleRef.id,
        createdBy: uid,
      });

      // ✅ summaries: ventas
      tx.set(
        dailyRef,
        {
          day: dayKey,
          updatedAt: now.getTime(),
          salesCount: FieldValue.increment(1),
          salesTotalCents: FieldValue.increment(totalCents),
          // compat (por si ya venías usando "byMethod")
          byMethod: { [paymentMethod]: FieldValue.increment(totalCents) },
          // nuevo (más claro)
          salesByMethod: { [paymentMethod]: FieldValue.increment(totalCents) },
        },
        { merge: true }
      );

      tx.set(
        monthlyRef,
        {
          month: monthKey,
          updatedAt: now.getTime(),
          salesCount: FieldValue.increment(1),
          salesTotalCents: FieldValue.increment(totalCents),
          byMethod: { [paymentMethod]: FieldValue.increment(totalCents) },
          salesByMethod: { [paymentMethod]: FieldValue.increment(totalCents) },
        },
        { merge: true }
      );

      // ✅ summaries: caja (ventas también son ingreso)
      tx.set(
        dailyRef,
        {
          cashInCents: FieldValue.increment(totalCents),
          cashNetCents: FieldValue.increment(totalCents),
          cashInByMethod: { [paymentMethod]: FieldValue.increment(totalCents) },
        },
        { merge: true }
      );

      tx.set(
        monthlyRef,
        {
          cashInCents: FieldValue.increment(totalCents),
          cashNetCents: FieldValue.increment(totalCents),
          cashInByMethod: { [paymentMethod]: FieldValue.increment(totalCents) },
        },
        { merge: true }
      );

      return { saleId: saleRef.id, totalCents, totalQtyKg, items: itemsSummary };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 400 });
  }
}
