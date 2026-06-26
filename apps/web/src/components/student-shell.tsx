"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, CreditCard, Dumbbell, Home, LogOut, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { api, clearSession, getStoredUser, type SessionUser } from "@/lib/api";
import { appConfig } from "@/lib/app-config";

const links = [
  { href: "/student/dashboard", label: "Início", icon: Home },
  { href: "/student/financial", label: "Financeiro", icon: CreditCard },
  { href: "/student/assessments", label: "Avaliações", icon: Activity, feature: "assessments" },
  { href: "/student/workouts", label: "Treinos", icon: Dumbbell, feature: "workouts" }
];

type PlanAccess = {
  allowAssessments: boolean;
  allowWorkouts: boolean;
};

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [planAccess, setPlanAccess] = useState<PlanAccess | null>(null);
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
    api<{ planAccess: PlanAccess }>("/student/dashboard")
      .then((payload) => setPlanAccess(payload.planAccess))
      .catch(() => setPlanAccess({ allowAssessments: false, allowWorkouts: false }));
  }, [router]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const navigation = (
    <nav className="flex flex-col gap-1 md:flex-row">
      {links.filter((link) => {
        if (link.feature === "assessments") return planAccess?.allowAssessments ?? false;
        if (link.feature === "workouts") return planAccess?.allowWorkouts ?? false;
        return true;
      }).map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            className={`flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
              active ? "bg-brand text-white shadow-sm shadow-orange-950/20" : "text-stone-300 hover:bg-white/10 hover:text-white"
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
      <div className="app-admin-main flex min-h-screen items-center justify-center text-sm font-medium text-muted">
        Carregando área do aluno...
      </div>
    );
  }

  return (
    <div className="app-admin-main min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[#ded7cf] bg-[#fffdfa]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/student/dashboard" className="flex items-center gap-3">
            <BrandLogo compact />
            <div>
              <p className="text-sm font-semibold text-white">{appConfig.studentSubtitle}</p>
              <p className="text-xs text-stone-400">{user?.name ?? "Aluno"}</p>
            </div>
          </Link>

          <div className="hidden md:block">{navigation}</div>

          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md p-2 text-stone-300 hover:bg-white/10 md:hidden" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <button type="button" onClick={logout} className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-stone-300 hover:bg-white/10 hover:text-white md:flex">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/30" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
          <aside className="relative ml-auto h-full w-80 max-w-[86vw] border-l border-black bg-[#14110f] p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Menu do aluno</p>
              <button type="button" className="rounded-md p-2 text-stone-300 hover:bg-white/10" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {navigation}
            <button type="button" onClick={logout} className="mt-4 flex h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-semibold text-stone-300 hover:bg-white/10 hover:text-white">
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
