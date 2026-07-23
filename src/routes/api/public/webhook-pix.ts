import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhook-pix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload: any = await request.json().catch(() => ({}));
          const txid: string | undefined = payload.txid ?? payload.pix?.[0]?.txid ?? payload.transaction_id;
          if (!txid) {
            return new Response(JSON.stringify({ error: "missing txid" }), { status: 400, headers: { "content-type": "application/json" } });
          }

          const { data: pag } = await supabaseAdmin
            .from("pagamentos")
            .select("id, cliente_id, valor")
            .eq("txid", txid)
            .maybeSingle();
          if (!pag) return new Response(JSON.stringify({ error: "pagamento not found" }), { status: 404, headers: { "content-type": "application/json" } });

          await supabaseAdmin.from("pagamentos").update({ status: "pago", paid_at: new Date().toISOString() }).eq("id", pag.id);

          // renova expiração +30 dias
          const { data: cli } = await supabaseAdmin.from("clientes").select("expiracao, plano").eq("id", pag.cliente_id).maybeSingle();
          const base = cli?.expiracao && new Date(cli.expiracao) > new Date() ? new Date(cli.expiracao) : new Date();
          const dias = cli?.plano === "anual" ? 365 : cli?.plano === "trimestral" ? 90 : 30;
          base.setDate(base.getDate() + dias);
          await supabaseAdmin.from("clientes").update({ expiracao: base.toISOString().slice(0, 10), status: "ativo" }).eq("id", pag.cliente_id);

          await supabaseAdmin.from("auditoria").insert({ acao: "pagamento_confirmado", entidade: "pagamento", entidade_id: pag.id, detalhes: { txid } });

          return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? "erro" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});