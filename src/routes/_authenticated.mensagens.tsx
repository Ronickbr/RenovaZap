import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/mensagens")({
  head: () => ({ meta: [{ title: "Mensagens — RenovaZap" }] }),
  component: Mensagens,
});

function Mensagens() {
  const { data = [] } = useQuery({
    queryKey: ["mensagens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select("*, clientes(nome, telefone)")
        .order("enviado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const variant = (s: string) =>
    s === "enviado" || s === "entregue" || s === "lido" ? "default" : s === "pendente" ? "secondary" : "destructive";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mensagens WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Histórico de envios automáticos e manuais.</p>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Conteúdo</TableHead>
              <TableHead>Enviado em</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem</TableCell></TableRow>
            )}
            {data.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">{m.clientes?.nome ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{m.clientes?.telefone}</div>
                </TableCell>
                <TableCell><Badge variant="outline">{m.tipo}</Badge></TableCell>
                <TableCell className="max-w-md truncate text-sm">{m.conteudo}</TableCell>
                <TableCell className="text-sm">{fmtDateTime(m.enviado_em)}</TableCell>
                <TableCell><Badge variant={variant(m.status)}>{m.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}