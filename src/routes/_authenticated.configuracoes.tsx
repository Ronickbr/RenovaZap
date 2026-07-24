import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { configSchema, firstIssue } from "@/lib/schemas";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — RenovaZap" }] }),
  component: Configuracoes,
});

type Config = {
  id: number;
  provedor_pix: string;
  provedor_whatsapp: string;
  valor_mensal: number;
  valor_anual: number;
  tempo_expiracao_pix: number;
  dias_aviso: number[];
  infinitepay_handle: string | null;
  evolution_url: string | null;
  evolution_api_key: string | null;
  evolution_instance: string | null;
  n8n_webhook_url: string | null;
};

function Configuracoes() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Config | null;
    },
  });

  const [form, setForm] = useState<Config | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  if (!form) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = configSchema.safeParse({
      provedor_pix: form.provedor_pix,
      provedor_whatsapp: form.provedor_whatsapp,
      valor_mensal: form.valor_mensal,
      valor_anual: form.valor_anual,
      tempo_expiracao_pix: form.tempo_expiracao_pix,
      dias_aviso: form.dias_aviso,
      infinitepay_handle: form.infinitepay_handle ?? "",
      evolution_url: form.evolution_url ?? "",
      evolution_api_key: form.evolution_api_key ?? "",
      evolution_instance: form.evolution_instance ?? "",
      n8n_webhook_url: form.n8n_webhook_url ?? "",
    });
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error));
      return;
    }
    setSaving(true);
    const d = parsed.data;
    const { error } = await supabase.from("configuracoes").update({
      provedor_pix: d.provedor_pix,
      provedor_whatsapp: d.provedor_whatsapp,
      valor_mensal: d.valor_mensal,
      valor_anual: d.valor_anual,
      tempo_expiracao_pix: d.tempo_expiracao_pix,
      dias_aviso: d.dias_aviso,
      infinitepay_handle: d.infinitepay_handle || null,
      evolution_url: d.evolution_url || null,
      evolution_api_key: d.evolution_api_key || null,
      evolution_instance: d.evolution_instance || null,
      n8n_webhook_url: d.n8n_webhook_url || null,
    }).eq("id", form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["configuracoes"] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Provedores, valores padrão e regras de envio.</p>
      </div>

      <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Provedores</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>PIX</Label>
              <Select value={form.provedor_pix} onValueChange={(v) => setForm({ ...form, provedor_pix: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulado">Simulado (dev)</SelectItem>
                  <SelectItem value="infinitepay">InfinitePay</SelectItem>
                  <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                  <SelectItem value="efi">Efí (Gerencianet)</SelectItem>
                  <SelectItem value="asaas">Asaas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.provedor_pix === "infinitepay" && (
              <div className="space-y-1">
                <Label>InfiniteTag (handle)</Label>
                <Input
                  placeholder="sualoja (sem o $)"
                  value={form.infinitepay_handle ?? ""}
                  onChange={(e) => setForm({ ...form, infinitepay_handle: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Seu nome de usuário no app InfinitePay. É só isso — a API pública não exige chave.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Select value={form.provedor_whatsapp} onValueChange={(v) => setForm({ ...form, provedor_whatsapp: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulado">Simulado (dev)</SelectItem>
                  <SelectItem value="evolution">Evolution API</SelectItem>
                  <SelectItem value="meta">Meta Cloud API</SelectItem>
                  <SelectItem value="zapi">Z-API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {form.provedor_whatsapp === "evolution" && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Evolution API + n8n</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>URL da Evolution API</Label>
                <Input
                  placeholder="https://evolution.seudominio.com"
                  value={form.evolution_url ?? ""}
                  onChange={(e) => setForm({ ...form, evolution_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Endereço base da sua instância Evolution (sem barra no final).</p>
              </div>
              <div className="space-y-1">
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="chave global ou da instância"
                    value={form.evolution_api_key ?? ""}
                    onChange={(e) => setForm({ ...form, evolution_api_key: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showKey ? "Ocultar" : "Mostrar"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Nome da Instância</Label>
                <Input
                  placeholder="ex.: renovazap"
                  value={form.evolution_instance ?? ""}
                  onChange={(e) => setForm({ ...form, evolution_instance: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Webhook n8n (opcional)</Label>
                <Input
                  placeholder="https://n8n.seudominio.com/webhook/renovazap"
                  value={form.n8n_webhook_url ?? ""}
                  onChange={(e) => setForm({ ...form, n8n_webhook_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Se preenchido, mensagens são enviadas via n8n ao invés de direto na Evolution.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Valores e prazos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label>Valor mensal (R$)</Label><Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Valor anual (R$)</Label><Input type="number" step="0.01" value={form.valor_anual} onChange={(e) => setForm({ ...form, valor_anual: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Expiração do PIX (segundos)</Label><Input type="number" value={form.tempo_expiracao_pix} onChange={(e) => setForm({ ...form, tempo_expiracao_pix: Number(e.target.value) })} /></div>
            <div className="space-y-1">
              <Label>Dias de aviso (separados por vírgula)</Label>
              <Input
                value={form.dias_aviso.join(",")}
                onChange={(e) => setForm({ ...form, dias_aviso: e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)) })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar configurações"}</Button>
        </div>
      </form>
    </div>
  );
}