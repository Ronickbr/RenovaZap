# Plano: Correção dos 3 webhooks públicos

Objetivo: bloquear chamadas não autenticadas em `/api/public/*` antes de qualquer escrita no banco, sem quebrar os fluxos atuais (InfinitePay → PIX, cron n8n de vencimentos, Evolution/n8n → respostas WhatsApp).

## 1. Webhook PIX — verificação HMAC (Crítico)

Arquivo: `src/routes/api/public/webhook-pix.ts`

- Ler o corpo bruto com `await request.text()` antes de fazer `JSON.parse` (a assinatura é sobre bytes originais).
- Calcular `HMAC-SHA256(rawBody, INFINITEPAY_WEBHOOK_SECRET)` e comparar com o header enviado pelo InfinitePay (`x-signature` / `x-infinitepay-signature`) usando `crypto.timingSafeEqual`.
- Se ausente ou inválida → retornar `401` sem tocar no banco.
- Só depois: parse do JSON, lookup do pagamento, marcar `pago`, renovar `data_expiracao` do cliente.
- Manter idempotência: se pagamento já está `pago`, responder `200` sem reprocessar.

## 2. Cron de vencimentos — segredo compartilhado (Aviso)

Arquivo: `src/routes/api/public/cron-vencimentos.ts`

- Exigir header `x-cron-secret` igual a `process.env.CRON_SECRET`.
- Comparação com `timingSafeEqual`. Sem match → `401`.
- Atualizar o workflow n8n (`renovazap-n8n-workflows_v2.json`) para enviar o header no node HTTP que chama `/cron-vencimentos`.

## 3. Webhook WhatsApp inbound — token compartilhado (Aviso)

Arquivo: `src/routes/api/public/webhook-whatsapp.ts`

- Exigir header `Authorization: Bearer <N8N_WEBHOOK_SECRET>` (ou `x-webhook-token`).
- Validar dentro do handler com `timingSafeEqual`; falha → `401` antes de gravar `respondido=true`.
- Atualizar o node "Encaminhar para RenovaZap" no workflow n8n para enviar o header.

## Segredos a criar

Via `add_secret` (form seguro para o usuário colar valores):
- `INFINITEPAY_WEBHOOK_SECRET` — o usuário copia do painel InfinitePay ao configurar o webhook.
- `CRON_SECRET` — gerado pelo usuário (ou via `generate_secret` se ele preferir que a Lovable gere; nesse caso ele copia o valor para o n8n).
- `N8N_WEBHOOK_SECRET` — mesmo padrão do `CRON_SECRET`, compartilhado com o n8n.

## Ajustes no workflow n8n (v3)

Regenerar `renovazap-n8n-workflows_v3.json` com:
- Header `x-cron-secret` no HTTP node que chama `/cron-vencimentos`.
- Header `Authorization: Bearer …` no HTTP node que chama `/webhook-whatsapp`.
- Documentar as novas variáveis n8n (`RENOVAZAP_CRON_SECRET`, `RENOVAZAP_INBOUND_SECRET`).

## Documentação

Atualizar `RenovaZap_MVP.md`:
- Passo para configurar o secret do InfinitePay no painel deles e colar o mesmo valor via `add_secret`.
- Passo para definir `CRON_SECRET` / `N8N_WEBHOOK_SECRET` no n8n.
- Nota de que chamadas sem os headers agora retornam `401` (esperado).

## Ordem de execução

1. Criar os 3 secrets.
2. Aplicar as verificações nos 3 handlers.
3. Gerar workflow n8n v3 com os headers.
4. Atualizar o MVP.md.
5. Marcar os 3 findings como corrigidos via `manage_security_finding`.

Confirma para eu executar?
