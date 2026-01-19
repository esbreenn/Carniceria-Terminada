"use client";

import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

export type Me = {
  uid: string;
  email: string | null;
  shopId: string;
  role: "owner" | "employee";
};

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged(async (u) => {
      try {
        if (!u) {
          setMe(null);
          setLoading(false);
          return;
        }

        // 🔐 Obtener token de Firebase
        const token = await u.getIdToken();

        // 📡 Llamada al backend con Authorization
        const res = await fetch("/api/users/ensure", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("No se pudo asegurar el usuario");

        const data = (await res.json()) as Me;
        setMe(data);
      } catch (e) {
        console.error("useMe error:", e);
        setMe(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { me, loading };
}
