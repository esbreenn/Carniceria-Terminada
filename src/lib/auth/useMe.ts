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

        const idToken = await u.getIdToken();

        const res = await fetch("/api/users/ensure", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!res.ok) throw new Error("No se pudo asegurar el usuario");

        const data = (await res.json()) as Me;
        setMe(data);
      } catch {
        setMe(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { me, loading };
}
