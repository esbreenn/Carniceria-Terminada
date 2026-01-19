import { firebaseAuth } from "@/lib/firebase/client";
import type { CreateCashInput } from "@/lib/cash/types";

export async function createCashMovement(input: CreateCashInput) {
  const u = firebaseAuth.currentUser;
  if (!u) throw new Error("No autenticado");

  const token = await u.getIdToken();

  const res = await fetch("/api/cash/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "No se pudo crear el movimiento");
  }

  return res.json();
}
