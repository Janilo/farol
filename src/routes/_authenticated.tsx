import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, LogOut, ShieldCheck } from "lucide-react";
import { FarolWordmark } from "@/components/brand/FarolWordmark";
import { getAccessState } from "@/lib/access";

export const Route = createFileRoute("/_authenticated")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    const access = await getAccessState(data.user);
    if (!access.canAccess) {
      throw redirect({ to: "/aguardando-aprovacao" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      // Só full_name: o Farol não tem `department` (a rubrica não é escopada
      // por área). Pedir a coluna aqui erraria contra o schema.
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", u.user.id)
        .maybeSingle();
      setName(p?.full_name || u.user.email || "");
      const access = await getAccessState(u.user);
      setIsAdmin(access.isAdmin);
    })();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const navItems = [
    { to: "/app", label: "Dossiê", icon: Search },
    ...(isAdmin ? [{ to: "/app", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <Link
          to="/"
          className="p-6 border-b border-border flex flex-col gap-1"
          aria-label="Farol — início"
        >
          <FarolWordmark height={28} />
          <a
            href="https://pereirasaraiva.com"
            target="_blank"
            rel="noopener noreferrer"
            className="eyebrow mt-1"
          >
            por J P Saraiva
          </a>
        </Link>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((it) => (
            <Link
              key={it.label}
              to={it.to}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              inactiveProps={{ className: "hover:bg-secondary" }}
              className="flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-[0.12em] font-semibold transition-colors"
            >
              <it.icon className="w-4 h-4" />
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground uppercase tracking-[0.12em]"
          >
            <LogOut className="w-3 h-3" /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
