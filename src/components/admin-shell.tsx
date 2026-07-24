import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Receipt,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  MessageCircle,
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/cobrancas", label: "Cobranças", icon: Receipt },
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/templates", label: "Templates", icon: FileText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border/60 bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <MessageCircle className="h-4 w-4" />
          </div>
          <span className="font-display text-lg tracking-tight">RenovaZap</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-primary" />
                )}
                <n.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
              {(user?.email?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <Button variant="outline" size="sm" className="w-full border-border/60" onClick={handleSignOut}>
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1">
        <div className="border-b border-border/60 bg-card/60 px-5 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <MessageCircle className="h-3.5 w-3.5" />
              </div>
              <span className="font-display tracking-tight">RenovaZap</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  pathname === n.to
                    ? "bg-gradient-primary text-primary-foreground shadow-soft"
                    : "bg-accent/60 text-muted-foreground"
                }`}
              >
                <n.icon className="h-3 w-3" />
                {n.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
