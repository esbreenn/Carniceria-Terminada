import type { CreateSaleInput } from "@/lib/sales/types";
import { firebaseAuth } from "@/lib/firebase/client";

export async function createSale(input: CreateSaleInput) {
  const u = firebaseAuth.currentUser;
  if (!u) throw new Error("No autenticado");

  const token = await u.getIdToken();

  const res = await fetch("/api/sales/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "No se pudo crear la venta");
  }

  return res.json();
}
