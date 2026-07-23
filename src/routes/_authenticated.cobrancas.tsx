import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fmtBRL, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cobrancas")({
  head: () => ({ meta: [{ title: "Cobranças — RenovaZap" }] }),
  component: Cobrancas,
});

function Cobrancas() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["pagamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*, clientes(nome, telefone)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "pago") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("pagamentos").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["pagamentos"] });
  };

  const variant = (s: string) =>
    s === "pago" ? "default" : s === "pendente" ? "secondary" : s === "expirado" ? "outline" : "destructive";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Cobranças PIX</h1>
        <p className="text-sm text-muted-foreground">Histórico e controle de pagamentos.</p>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>TXID</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhuma cobrança</TableCell></TableRow>
            )}
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.clientes?.nome ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.clientes?.telefone}</div>
                </TableCell>
                <TableCell>{fmtBRL(Number(p.valor))}</TableCell>
                <TableCell className="font-mono text-xs">{p.txid}</TableCell>
                <TableCell className="text-sm">{fmtDateTime(p.created_at)}</TableCell>
                <TableCell><Badge variant={variant(p.status)}>{p.status}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  {p.status !== "pago" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(p.id, "pago")} title="Marcar pago">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  {p.status === "pendente" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(p.id, "cancelado")} title="Cancelar">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}