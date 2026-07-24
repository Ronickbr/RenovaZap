import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtBRL, fmtDate, diasAte } from "@/lib/format";
import { Users, AlertTriangle, CheckCircle2, Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — RenovaZap" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [{ count: totalClientes }, { count: ativos }, { count: vencidos }, pagamentosPend] =
        await Promise.all([
          supabase.from("clientes").select("*", { count: "exact", head: true }),
          supabase.from("clientes").select("*", { count: "exact", head: true }).eq("status", "ativo"),
          supabase.from("clientes").select("*", { count: "exact", head: true }).lt("expiracao", new Date().toISOString().slice(0, 10)),
          supabase.from("pagamentos").select("valor").eq("status", "pendente"),
        ]);
      const pendValor = (pagamentosPend.data ?? []).reduce((s: number, p: any) => s + Number(p.valor), 0);
      return {
        totalClientes: totalClientes ?? 0,
        ativos: ativos ?? 0,
        vencidos: vencidos ?? 0,
        pendValor,
      };
    },
  });

  const { data: proximos } = useQuery({
    queryKey: ["proximos-vencer"],
    queryFn: async () => {
      const in14 = new Date();
      in14.setDate(in14.getDate() + 14);
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .lte("expiracao", in14.toISOString().slice(0, 10))
        .order("expiracao", { ascending: true })
        .limit(10);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Total de clientes", value: stats?.totalClientes ?? 0, icon: Users, tone: "primary" },
    { label: "Ativos", value: stats?.ativos ?? 0, icon: CheckCircle2, tone: "success" },
    { label: "Vencidos", value: stats?.vencidos ?? 0, icon: AlertTriangle, tone: "destructive" },
    { label: "PIX pendentes", value: fmtBRL(stats?.pendValor ?? 0), icon: Receipt, tone: "warning" },
  ] as const;

  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
  } as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral do sistema de renovações.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="group relative overflow-hidden border-border/60 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass[c.tone]}`}>
                <c.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-bold tracking-tight">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-xl">Próximos vencimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {!proximos?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente próximo do vencimento.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {proximos.map((c: any) => {
                const d = diasAte(c.expiracao);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                        {(c.nome?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.nome}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.telefone} · {c.plano}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">{fmtDate(c.expiracao)}</div>
                      <div className={`text-xs font-medium ${d < 0 ? "text-destructive" : d <= 3 ? "text-warning" : "text-muted-foreground"}`}>
                        {d < 0 ? `vencido há ${Math.abs(d)}d` : d === 0 ? "vence hoje" : `em ${d}d`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}