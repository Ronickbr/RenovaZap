import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = { clienteId: string };

export const gerarCobrancaInfinitepay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data?.clienteId || typeof data.clienteId !== "string") {
      throw new Error("clienteId inválido");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: cliente, error: cErr } = await supabase
      .from("clientes")
      .select("id, nome, email, telefone, plano, valor")
      .eq("id", data.clienteId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cliente) throw new Error("Cliente não encontrado");

    const { data: cfg, error: cfgErr } = await supabase
      .from("configuracoes")
      .select("infinitepay_handle, valor_mensal, valor_anual")
      .eq("id", 1)
      .maybeSingle();
    if (cfgErr) throw new Error(cfgErr.message);
    const handle = cfg?.infinitepay_handle?.trim();
    if (!handle) {
      throw new Error("Configure sua InfiniteTag (handle) em Configurações antes de gerar cobranças.");
    }

    const valorNumero =
      Number(cliente.valor) > 0
        ? Number(cliente.valor)
        : cliente.plano === "anual"
          ? Number(cfg?.valor_anual ?? 0)
          : Number(cfg?.valor_mensal ?? 0);
    if (!valorNumero || valorNumero <= 0) {
      throw new Error("Valor do cliente ou padrão do plano inválido.");
    }

    const priceCents = Math.round(valorNumero * 100);
    const order_nsu = `renovazap-${cliente.id.slice(0, 8)}-${Date.now()}`;

    const origin = process.env.PUBLIC_APP_URL ?? "";
    const payload: Record<string, unknown> = {
      handle,
      order_nsu,
      items: [
        {
          quantity: 1,
          price: priceCents,
          description: `Renovação ${cliente.plano} — ${cliente.nome}`,
        },
      ],
      customer: {
        name: cliente.nome,
        ...(cliente.email ? { email: cliente.email } : {}),
        ...(cliente.telefone ? { phone_number: cliente.telefone } : {}),
      },
    };
    if (origin) {
      payload.redirect_url = `${origin}/cobrancas`;
      payload.webhook_url = `${origin}/api/public/webhook-pix`;
    }

    const res = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      console.error("[infinitepay] erro ao criar link", res.status, bodyText);
      throw new Error(`InfinitePay retornou ${res.status}. Verifique sua handle.`);
    }
    let body: any = {};
    try {
      body = JSON.parse(bodyText);
    } catch {
      throw new Error("Resposta inválida da InfinitePay");
    }
    const link: string | undefined = body?.url ?? body?.link ?? body?.checkout_url;
    if (!link) {
      throw new Error("Link de pagamento não retornado pela InfinitePay");
    }

    const { data: pag, error: pErr } = await supabase
      .from("pagamentos")
      .insert({
        cliente_id: cliente.id,
        valor: valorNumero,
        status: "pendente",
        txid: order_nsu,
        pix_id: order_nsu,
        link_pagamento: link,
      })
      .select("id")
      .single();
    if (pErr) throw new Error(pErr.message);

    return { url: link, order_nsu, pagamentoId: pag.id };
  });