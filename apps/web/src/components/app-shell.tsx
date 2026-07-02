"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BarChart3, BookOpen, ClipboardList, CreditCard, Dumbbell, LogOut, Menu, PanelLeftClose, Settings, UserPlus, Users, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { clearSession, getStoredUser, type SessionUser } from "@/lib/api";
import { appConfig } from "@/lib/app-config";

const navigationGroups = [
  {
    title: "Principal",
    links: [
      { href: "/", label: "Dashboard", icon: BarChart3 },
      { href: "/enrollments", label: "Nova Matrícula", icon: UserPlus },
      { href: "/students", label: "Alunos", icon: Users }
    ]
  },
  {
    title: "Financeiro",
    links: [
      { href: "/plans", label: "Planos", icon: Dumbbell },
      { href: "/invoices", label: "Mensalidades", icon: CreditCard },
      { href: "/settings", label: "Configurações", icon: Settings }
    ]
  },
  {
    title: "Treinamento",
    links: [
      { href: "/assessments", label: "Avaliações", icon: Activity },
      { href: "/workouts", label: "Treinos", icon: ClipboardList },
      { href: "/exercises", label: "Biblioteca", icon: BookOpen }
    ]
  }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.replace("/login");
      return;
    }

    if (storedUser?.role === "ALUNO") {
      router.replace("/student/dashboard");
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
    <nav className="space-y-6">
      {navigationGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">{group.title}</p>
          <div className="space-y-1">
            {group.links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-brand text-white shadow-sm shadow-orange-950/30"
                      : "text-stone-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#efeeeb] text-sm font-medium text-muted">
        Carregando painel...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efeeeb]">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-orange-500/10 bg-[#100d0b] px-5 py-5 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo />
          <div>
            <p className="text-base font-semibold text-white">{appConfig.name}</p>
            <p className="text-xs text-stone-400">{appConfig.adminSubtitle}</p>
          </div>
        </div>
        {navigation}
        <button
          type="button"
          onClick={logout}
          className="absolute bottom-5 left-5 flex h-10 w-[calc(100%-2.5rem)] items-center gap-3 rounded-md px-3 text-sm font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-80 max-w-[85vw] border-r border-orange-500/10 bg-[#100d0b] p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandLogo compact />
                <div>
                  <p className="text-base font-semibold text-white">{appConfig.name}</p>
                  <p className="text-xs text-stone-400">Painel</p>
                </div>
              </div>
              <button type="button" aria-label="Fechar menu" className="rounded-md p-2 text-stone-300 hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}

      <main className="app-admin-main min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[#ded7cf] bg-[#fffdfa]/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button type="button" aria-label="Abrir menu" className="rounded-md p-2 text-gray-600 hover:bg-gray-50 lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 text-sm font-semibold text-stone-200 lg:flex">
              <PanelLeftClose className="h-4 w-4 text-brand" />
              Painel administrativo
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-ink">{user?.name ?? "Usuário"}</p>
                <p className="text-xs text-muted">{user?.role ?? "ADMIN"}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14110f] text-xs font-bold text-white ring-2 ring-orange-200">
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
