import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhook-whatsapp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload: any = await request.json().catch(() => ({}));
          const telefone: string | undefined = payload.from ?? payload.phone ?? payload.telefone;
          const texto: string | undefined = payload.text ?? payload.message ?? payload.body;
          if (!telefone) return new Response(JSON.stringify({ error: "missing phone" }), { status: 400, headers: { "content-type": "application/json" } });

          const { data: cli } = await supabaseAdmin.from("clientes").select("id").eq("telefone", telefone).maybeSingle();
          if (!cli) return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { "content-type": "application/json" } });

          const { data: msg } = await supabaseAdmin
            .from("mensagens")
            .select("id")
            .eq("cliente_id", cli.id)
            .order("enviado_em", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (msg) {
            await supabaseAdmin.from("mensagens").update({ respondido: true, resposta: texto ?? "" }).eq("id", msg.id);
          }

          return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? "erro" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});