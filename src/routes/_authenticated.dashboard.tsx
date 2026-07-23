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
    { label: "Total de clientes", value: stats?.totalClientes ?? 0, icon: Users },
    { label: "Ativos", value: stats?.ativos ?? 0, icon: CheckCircle2 },
    { label: "Vencidos", value: stats?.vencidos ?? 0, icon: AlertTriangle },
    { label: "PIX pendentes", value: fmtBRL(stats?.pendValor ?? 0), icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema de renovações.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximos vencimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {!proximos?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente próximo do vencimento.</p>
          ) : (
            <div className="divide-y">
              {proximos.map((c: any) => {
                const d = diasAte(c.expiracao);
                return (
                  <div key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">{c.telefone} · {c.plano}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div>{fmtDate(c.expiracao)}</div>
                      <div className={d < 0 ? "text-destructive" : d <= 3 ? "text-orange-500" : "text-muted-foreground"}>
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