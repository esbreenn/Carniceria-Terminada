import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";

export type DashboardSeriesDoc = {
  month: string;            // "YYYY-MM"
  labels: string[];         // ["01"...]
  dailySalesCents: number[]; // length = days in month
  dailyNetCents?: number[];  // opcional
  updatedAt?: number;
};

export async function getDashboardSeries(shopId: string, monthKey: string) {
  const ref = doc(firebaseDb, `shops/${shopId}/dashboard_series/${monthKey}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as DashboardSeriesDoc;
}
