ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS infinitepay_handle text;
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS link_pagamento text;
UPDATE public.configuracoes SET provedor_pix = 'infinitepay' WHERE id = 1 AND provedor_pix = 'mercadopago';
ALTER TABLE public.configuracoes ALTER COLUMN provedor_pix SET DEFAULT 'infinitepay';