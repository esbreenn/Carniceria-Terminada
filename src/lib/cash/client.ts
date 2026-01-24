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

const MAX_AMOUNT_CENTS = 100_000_000;

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

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
  const normalizedCategory = normalizeCategory(input.category);
  if (!normalizedCategory) throw new Error("Categoría requerida");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Monto inválido");
  }
  if (input.amountCents > MAX_AMOUNT_CENTS) {
    throw new Error("Monto excede el máximo permitido");
  }

  const ref = collection(firebaseDb, "shops", shopId, "cashMovements");
  const occurredAt = input.occurredAt ?? Date.now();

  await addDoc(ref, {
    direction: input.direction,
    method: input.method,
    category: normalizedCategory,
    amountCents: input.amountCents,
    note: input.note?.trim() || null,
    occurredAt,
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
      occurredAt: data.occurredAt,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
    };
  });

  return rows.sort((a, b) => {
    const aKey = a.occurredAt ?? a.createdAt ?? 0;
    const bKey = b.occurredAt ?? b.createdAt ?? 0;
    return bKey - aKey;
  });
}
