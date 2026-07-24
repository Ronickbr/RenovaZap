ALTER TABLE public.configuracoes 
  ADD COLUMN IF NOT EXISTS evolution_url text,
  ADD COLUMN IF NOT EXISTS evolution_api_key text,
  ADD COLUMN IF NOT EXISTS evolution_instance text,
  ADD COLUMN IF NOT EXISTS n8n_webhook_url text;