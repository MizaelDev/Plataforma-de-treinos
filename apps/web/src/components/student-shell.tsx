"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, CreditCard, Dumbbell, Home, LogOut, Menu, X } from "lucide-react";
import { clearSession, getStoredUser, type SessionUser } from "@/lib/api";
import { appConfig } from "@/lib/app-config";

const links = [
  { href: "/student/dashboard", label: "Inicio", icon: Home },
  { href: "/student/financial", label: "Financeiro", icon: CreditCard },
  { href: "/student/assessments", label: "Avaliacoes", icon: Activity },
  { href: "/student/workouts", label: "Treinos", icon: Dumbbell }
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.replace("/login");
      return;
    }

    if (storedUser.role !== "ALUNO") {
      router.replace("/");
      return;
    }

    setUser(storedUser);
    setAuthChecked(true);
  }, [router]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const navigation = (
    <nav className="flex flex-col gap-1 md:flex-row">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            className={`flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
              active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
            }`}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5] text-sm font-medium text-muted">
        Carregando area do aluno...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5]">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/student/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-900 text-sm font-bold text-white">{appConfig.initials}</div>
            <div>
              <p className="text-sm font-semibold text-ink">{appConfig.studentSubtitle}</p>
              <p className="text-xs text-muted">{user?.name ?? "Aluno"}</p>
            </div>
          </Link>

          <div className="hidden md:block">{navigation}</div>

          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <button type="button" onClick={logout} className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 md:flex">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/30" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
          <aside className="relative ml-auto h-full w-80 max-w-[86vw] bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Menu do aluno</p>
              <button type="button" className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {navigation}
            <button type="button" onClick={logout} className="mt-4 flex h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
