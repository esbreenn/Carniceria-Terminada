import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import type { Product } from "@/lib/inventory/types";
import { assertValidProductInput } from "@/lib/inventory/validate";

export function defaultProduct(): Omit<Product, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "",
    unit: "kg",
    salePriceCents: 0,
    stockQty: 0,
    lowStockAlertQty: 0,
  };
}

function productsCol(shopId: string) {
  return collection(firebaseDb, `shops/${shopId}/products`);
}

export async function listProducts(shopId: string): Promise<Product[]> {
  const q = query(productsCol(shopId), orderBy("name", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: String(data.name ?? ""),
      unit: (data.unit === "unit" ? "unit" : "kg") as any,
      salePriceCents: Number(data.salePriceCents ?? 0),
      stockQty: Number(data.stockQty ?? 0),
      lowStockAlertQty: Number(data.lowStockAlertQty ?? 0),
      createdAt: Number(data.createdAt ?? Date.now()),
      updatedAt: Number(data.updatedAt ?? Date.now()),
    };
  });
}

export async function createProduct(
  shopId: string,
  input: Omit<Product, "id" | "createdAt" | "updatedAt">
) {
  const now = Date.now();

  const normalized = {
    name: input.name.trim(),
    unit: input.unit,
    salePriceCents: Number(input.salePriceCents) || 0,
    stockQty: Number(input.stockQty) || 0,
    lowStockAlertQty: Number(input.lowStockAlertQty) || 0,
  };

  assertValidProductInput(normalized);

  const ref = doc(productsCol(shopId));
  await setDoc(ref, { ...normalized, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function updateProduct(
  shopId: string,
  id: string,
  patch: Partial<Omit<Product, "id">>
) {
  const ref = doc(firebaseDb, `shops/${shopId}/products/${id}`);

  const normalized: any = {};
  if (patch.name !== undefined) normalized.name = String(patch.name).trim();
  if (patch.unit !== undefined) normalized.unit = patch.unit;
  if (patch.salePriceCents !== undefined)
    normalized.salePriceCents = Number(patch.salePriceCents) || 0;
  if (patch.stockQty !== undefined) normalized.stockQty = Number(patch.stockQty) || 0;
  if (patch.lowStockAlertQty !== undefined)
    normalized.lowStockAlertQty = Number(patch.lowStockAlertQty) || 0;

  // Validamos con defaults para no romper
  assertValidProductInput({
    name: normalized.name ?? "tmp",
    unit: normalized.unit ?? "kg",
    salePriceCents: normalized.salePriceCents ?? 0,
    stockQty: normalized.stockQty ?? 0,
    lowStockAlertQty: normalized.lowStockAlertQty ?? 0,
  });

  await updateDoc(ref, { ...normalized, updatedAt: Date.now() });
}

export async function deleteProduct(shopId: string, id: string) {
  const ref = doc(firebaseDb, `shops/${shopId}/products/${id}`);
  await deleteDoc(ref);
}
