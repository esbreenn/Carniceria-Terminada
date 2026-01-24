"use client";

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

import { firebaseAuth, firebaseDb } from "@/lib/firebase/client";
import type {
  CashMovement,
  CreateCashInput,
  CreateCashShiftInput,
  CloseCashShiftInput,
  CashShift,
} from "@/lib/cash/types";

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

// Crea un turno de caja en: shops/{shopId}/cashShifts
export async function createCashShift(
  shopId: string,
  input: CreateCashShiftInput
) {
  const u = requireAuth();

  if (!shopId) throw new Error("shopId requerido");
  const cashierName = input.cashierName.trim();
  if (!cashierName) throw new Error("Nombre del cajero requerido");
  if (!Number.isInteger(input.openingCashCents) || input.openingCashCents < 0) {
    throw new Error("Caja inicial inválida");
  }
  if (input.openingCashCents > MAX_AMOUNT_CENTS) {
    throw new Error("Caja inicial excede el máximo permitido");
  }

  const ref = collection(firebaseDb, "shops", shopId, "cashShifts");
  const openedAt = input.openedAt ?? Date.now();

  await addDoc(ref, {
    cashierName,
    status: "open",
    openingCashCents: input.openingCashCents,
    openedAt,
    note: input.note?.trim() || null,
    createdAt: Date.now(),
    createdBy: u.uid,
    createdAtServer: serverTimestamp(),
  });
}

// Cierra un turno de caja: shops/{shopId}/cashShifts/{shiftId}
export async function closeCashShift(
  shopId: string,
  shiftId: string,
  input: CloseCashShiftInput
) {
  const u = requireAuth();

  if (!shopId) throw new Error("shopId requerido");
  if (!shiftId) throw new Error("turno requerido");
  if (!Number.isInteger(input.closingCashCents) || input.closingCashCents < 0) {
    throw new Error("Caja final inválida");
  }
  if (!Number.isInteger(input.differenceCents)) {
    throw new Error("Diferencia inválida");
  }
  if (input.closingCashCents > MAX_AMOUNT_CENTS) {
    throw new Error("Caja final excede el máximo permitido");
  }

  const ref = doc(firebaseDb, "shops", shopId, "cashShifts", shiftId);
  const closedAt = input.closedAt ?? Date.now();

  await updateDoc(ref, {
    status: "closed",
    closingCashCents: input.closingCashCents,
    differenceCents: input.differenceCents,
    closedAt,
    note: input.note?.trim() || null,
    closedBy: u.uid,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
}

// Lista turnos recientes desde: shops/{shopId}/cashShifts
export async function listCashShifts(shopId: string, take = 20) {
  const u = requireAuth();
  void u;

  if (!shopId) throw new Error("shopId requerido");

  const ref = collection(firebaseDb, "shops", shopId, "cashShifts");
  const q = query(ref, orderBy("openedAt", "desc"), limit(take));

  const snap = await getDocs(q);

  const rows: CashShift[] = snap.docs.map((d) => {
    const data = d.data() as any;

    return {
      id: d.id,
      cashierName: data.cashierName,
      status: data.status,
      openingCashCents: data.openingCashCents,
      closingCashCents: data.closingCashCents ?? undefined,
      differenceCents: data.differenceCents ?? undefined,
      openedAt: data.openedAt,
      closedAt: data.closedAt ?? undefined,
      note: data.note ?? undefined,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      closedBy: data.closedBy ?? undefined,
    };
  });

  return rows.sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0));
}
