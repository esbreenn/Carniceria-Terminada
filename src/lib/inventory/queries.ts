import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import type { Product } from "@/lib/inventory/types";

export async function listLowStockProducts(shopId: string): Promise<Product[]> {
  // trae productos con stockQty <= lowStockAlertQty no se puede directo (no hay campo calculado),
  // así que traemos ordenado y filtramos en cliente por ahora (MVP).
  const col = collection(firebaseDb, `shops/${shopId}/products`);
  const q = query(col, orderBy("stockQty", "asc"), orderBy("name", "asc"));
  const snap = await getDocs(q);

  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
  return all
    .map((p) => ({
      id: p.id,
      name: String(p.name ?? ""),
      unit: (p.unit === "unit" ? "unit" : "kg"),
      salePriceCents: Number(p.salePriceCents ?? 0),
      stockQty: Number(p.stockQty ?? 0),
      lowStockAlertQty: Number(p.lowStockAlertQty ?? 0),
      createdAt: Number(p.createdAt ?? Date.now()),
      updatedAt: Number(p.updatedAt ?? Date.now()),
    }))
    .filter((p) => p.stockQty <= p.lowStockAlertQty);
}
