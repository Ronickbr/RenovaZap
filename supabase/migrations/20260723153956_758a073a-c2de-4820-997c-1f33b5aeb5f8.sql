
-- Roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-promote first user to admin, others to 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ CLIENTES ============
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  plano TEXT NOT NULL DEFAULT 'mensal',
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  expiracao DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage clientes" ON public.clientes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_clientes_expiracao ON public.clientes(expiracao);
CREATE INDEX idx_clientes_status ON public.clientes(status);

-- ============ PAGAMENTOS ============
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  pix_id TEXT,
  txid TEXT,
  qrcode TEXT,
  copiaecola TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pagamentos" ON public.pagamentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_pagamentos_cliente ON public.pagamentos(cliente_id);
CREATE INDEX idx_pagamentos_status ON public.pagamentos(status);

-- ============ MENSAGENS ============
CREATE TABLE public.mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enviada',
  respondido BOOLEAN NOT NULL DEFAULT false,
  resposta TEXT,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens TO authenticated;
GRANT ALL ON public.mensagens TO service_role;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mensagens" ON public.mensagens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_mensagens_cliente ON public.mensagens(cliente_id);

-- ============ TEMPLATES ============
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  gatilho TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage templates" ON public.templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONFIGURACOES (singleton) ============
CREATE TABLE public.configuracoes (
  id INT PRIMARY KEY DEFAULT 1,
  dias_aviso INT[] NOT NULL DEFAULT ARRAY[7,3,1,0,-1,-3],
  provedor_whatsapp TEXT NOT NULL DEFAULT 'evolution',
  provedor_pix TEXT NOT NULL DEFAULT 'mercadopago',
  valor_mensal NUMERIC(10,2) NOT NULL DEFAULT 49.90,
  valor_anual NUMERIC(10,2) NOT NULL DEFAULT 499.00,
  tempo_expiracao_pix INT NOT NULL DEFAULT 3600,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage configuracoes" ON public.configuracoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.configuracoes (id) VALUES (1);

-- ============ AUDITORIA ============
CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id TEXT,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view auditoria" ON public.auditoria FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth insert auditoria" ON public.auditoria FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Seed templates
INSERT INTO public.templates (nome, gatilho, mensagem, ativo) VALUES
  ('Aviso 7 dias', 'vencimento_7d', 'Olá {{nome}}! Sua assinatura {{plano}} vence em {{dias}} dias ({{vencimento}}). Renove por R$ {{valor}} para continuar aproveitando.', true),
  ('Aviso 3 dias', 'vencimento_3d', 'Oi {{nome}}, faltam apenas {{dias}} dias para o vencimento da sua assinatura. Responda SIM para gerar seu PIX de renovação.', true),
  ('Aviso 1 dia', 'vencimento_1d', '{{nome}}, sua assinatura vence amanhã! Responda SIM e enviamos o PIX na hora.', true),
  ('No vencimento', 'vencimento_hoje', '{{nome}}, sua assinatura vence hoje. Responda SIM para renovar agora.', true),
  ('1 dia depois', 'vencido_1d', '{{nome}}, sua assinatura venceu ontem. Renove agora e não perca o acesso!', true),
  ('PIX gerado', 'pix_gerado', 'Aqui está seu PIX de R$ {{valor}}: use o código copia e cola ou o QR Code enviado. Válido por 1 hora.', true),
  ('Pagamento confirmado', 'pagamento_ok', 'Pagamento confirmado! Sua assinatura {{plano}} foi renovada até {{vencimento}}. Obrigado, {{nome}}!', true);
