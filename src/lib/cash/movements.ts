import { collection, addDoc, getDocs, orderBy, query } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import type { CashMovement } from "./types";

export function cashRef(shopId: string) {
  return collection(firebaseDb, "shops", shopId, "cash");
}

export async function addCashMovement(shopId: string, data: CashMovement) {
  await addDoc(cashRef(shopId), data);
}

export async function listCash(shopId: string) {
  const q = query(cashRef(shopId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as CashMovement[];
}
