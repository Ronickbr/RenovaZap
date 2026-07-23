import { createFileRoute } from "@tanstack/react-router";

function render(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}

export const Route = createFileRoute("/api/public/cron-vencimentos")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: cfg } = await supabaseAdmin.from("configuracoes").select("dias_aviso, valor_mensal, valor_anual").limit(1).maybeSingle();
          const diasAviso: number[] = cfg?.dias_aviso ?? [7, 3, 1];
          const valorMensal = Number(cfg?.valor_mensal ?? 0);
          const valorAnual = Number(cfg?.valor_anual ?? 0);

          const { data: templates } = await supabaseAdmin.from("templates").select("*").eq("ativo", true);
          const tplByGatilho = new Map<string, any>();
          for (const t of templates ?? []) tplByGatilho.set(t.gatilho, t);

          const { data: clientes } = await supabaseAdmin.from("clientes").select("*").eq("status", "ativo");
          let enviados = 0;
          const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

          for (const c of clientes ?? []) {
            const exp = new Date(c.expiracao); exp.setHours(0, 0, 0, 0);
            const diff = Math.round((exp.getTime() - hoje.getTime()) / 86400000);
            let gatilho: string | null = null;
            if (diff < 0) gatilho = "vencido";
            else if (diasAviso.includes(diff)) gatilho = `aviso_${diff}d`;
            if (!gatilho) continue;
            const tpl = tplByGatilho.get(gatilho);
            if (!tpl) continue;

            const obs: string = c.observacoes ?? "";
            const conta = obs.match(/Conta:\s*([^\|]+)/i)?.[1]?.trim() ?? "";
            const pacote = obs.match(/Pacote:\s*([^\|]+)/i)?.[1]?.trim() ?? "";
            const valorEfetivo = Number(c.valor) > 0
              ? Number(c.valor)
              : (c.plano === "anual" ? valorAnual : valorMensal);

            const conteudo = render(tpl.mensagem, {
              nome: c.nome,
              valor: valorEfetivo.toFixed(2),
              expiracao: c.expiracao,
              dias: diff,
              conta,
              pacote,
            });

            await supabaseAdmin.from("mensagens").insert({
              cliente_id: c.id,
              conteudo,
              tipo: gatilho,
              status: "enviado",
            });
            if (diff < 0) await supabaseAdmin.from("clientes").update({ status: "vencido" }).eq("id", c.id);
            enviados++;
          }

          return new Response(JSON.stringify({ ok: true, enviados }), { headers: { "content-type": "application/json" } });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? "erro" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});