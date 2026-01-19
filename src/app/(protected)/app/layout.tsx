"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/sales", label: "Ventas" },
  { href: "/app/cash", label: "Caja" },
  { href: "/app/inventory", label: "Inventario" },
  { href: "/app/reports", label: "Reportes" },
  { href: "/app/settings", label: "Configuración" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
              🥩
            </div>
            <div>
              <p className="text-sm font-semibold leading-4">CARNICERÍA PANEL</p>
              <p className="text-xs text-zinc-400">Fase 1 — Auth mock</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl bg-zinc-900/40 p-3 ring-1 ring-zinc-800">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-zinc-100 text-zinc-950"
                      : "text-zinc-200 hover:bg-zinc-800/60",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-xl bg-zinc-950/40 p-3 text-xs text-zinc-400 ring-1 ring-zinc-800">
            <p className="font-medium text-zinc-200">Reglas clave</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Dinero = centavos (int)</li>
              <li>Ventas ≠ Caja (separadas)</li>
              <li>Multi-shop: shops/{`{shopId}`}/...</li>
            </ul>
          </div>
        </aside>

        <main className="rounded-2xl bg-zinc-900/20 p-5 ring-1 ring-zinc-800">
          {children}
        </main>
      </div>
    </div>
  );
}
