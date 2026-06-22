"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, CreditCard, Dumbbell, LogOut, Menu, PanelLeftClose, Users, X } from "lucide-react";
import { clearSession, getStoredUser, type SessionUser } from "@/lib/api";

const links = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/students", label: "Alunos", icon: Users },
  { href: "/plans", label: "Planos", icon: Dumbbell },
  { href: "/invoices", label: "Mensalidades", icon: CreditCard }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const navigation = (
    <nav className="space-y-1">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
              active ? "bg-teal-50 text-brand ring-1 ring-teal-100" : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
            }`}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f6f7f8]">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-gray-200 bg-white px-5 py-5 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">AP</div>
          <div>
            <p className="text-base font-semibold text-ink">Academia Platform</p>
            <p className="text-xs text-muted">Gestao administrativa</p>
          </div>
        </div>
        {navigation}
        <button
          type="button"
          onClick={logout}
          className="absolute bottom-5 left-5 flex h-10 w-[calc(100%-2.5rem)] items-center gap-3 rounded-md px-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-950"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-80 max-w-[85vw] border-r border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">AP</div>
                <div>
                  <p className="text-base font-semibold text-ink">Academia Platform</p>
                  <p className="text-xs text-muted">Painel</p>
                </div>
              </div>
              <button type="button" aria-label="Fechar menu" className="rounded-md p-2 text-gray-500 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button type="button" aria-label="Abrir menu" className="rounded-md p-2 text-gray-600 hover:bg-gray-50 lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 text-sm font-semibold text-gray-700 lg:flex">
              <PanelLeftClose className="h-4 w-4 text-muted" />
              Painel administrativo
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-ink">{user?.name ?? "Usuario"}</p>
                <p className="text-xs text-muted">{user?.role ?? "ADMIN"}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                {(user?.name ?? "U").slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
