import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import type { Product } from "@/lib/inventory/types";

export function defaultProduct() {
  return {
    name: "",
    unit: "kg" as const,
    salePriceCents: 0,
    stockQty: 0,
    lowStockAlertQty: 0,
  };
}

export async function listProducts(shopId: string): Promise<Product[]> {
  const col = collection(firebaseDb, "shops", shopId, "products");
  const q = query(col, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: data.name ?? "",
      unit: data.unit ?? "kg",
      salePriceCents: Number(data.salePriceCents ?? 0),
      stockQty: Number(data.stockQty ?? 0),
      lowStockAlertQty: Number(data.lowStockAlertQty ?? 0),
      createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : undefined,
      updatedAt: data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : undefined,
    } satisfies Product;
  });
}

export async function createProduct(
  shopId: string,
  data: Omit<Product, "id" | "createdAt" | "updatedAt">
) {
  const col = collection(firebaseDb, "shops", shopId, "products");
  return addDoc(col, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProduct(
  shopId: string,
  productId: string,
  data: Partial<Omit<Product, "id">>
) {
  const ref = doc(firebaseDb, "shops", shopId, "products", productId);
  return updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function removeProduct(shopId: string, productId: string) {
  const ref = doc(firebaseDb, "shops", shopId, "products", productId);
  return deleteDoc(ref);
}
