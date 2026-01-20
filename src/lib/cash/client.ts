"use client";

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { firebaseAuth, firebaseDb } from "@/lib/firebase/client";
import type { CashMovement, CreateCashInput } from "@/lib/cash/types";

function requireAuth() {
  const u = firebaseAuth.currentUser;
  if (!u) throw new Error("No autenticado");
  return u;
}

// Crea un movimiento de caja en: shops/{shopId}/cashMovements
export async function createCashMovement(
  shopId: string,
  input: CreateCashInput
) {
  const u = requireAuth();

  if (!shopId) throw new Error("shopId requerido");
  if (!input.category?.trim()) throw new Error("Categoría requerida");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Monto inválido");
  }

  const ref = collection(firebaseDb, "shops", shopId, "cashMovements");

  await addDoc(ref, {
    direction: input.direction,
    method: input.method,
    category: input.category.trim(),
    amountCents: input.amountCents,
    note: input.note?.trim() || null,
    createdAt: Date.now(), // fácil para ordenar sin reglas raras
    createdBy: u.uid,
    // opcional: timestamp server-side (por si lo querés)
    createdAtServer: serverTimestamp(),
  });
}

// Lista movimientos recientes desde: shops/{shopId}/cashMovements
export async function listCashMovements(shopId: string, take = 50) {
  const u = requireAuth();
  void u; // solo para forzar auth; reglas también deben validar shopId

  if (!shopId) throw new Error("shopId requerido");

  const ref = collection(firebaseDb, "shops", shopId, "cashMovements");
  const q = query(ref, orderBy("createdAt", "desc"), limit(take));

  const snap = await getDocs(q);

  const rows: CashMovement[] = snap.docs.map((d) => {
    const data = d.data() as any;

    return {
      id: d.id,
      direction: data.direction,
      method: data.method,
      category: data.category,
      amountCents: data.amountCents,
      note: data.note ?? undefined,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
    };
  });

  return rows;
}
