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

  if (!form) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("configuracoes").update({
      provedor_pix: form.provedor_pix,
      provedor_whatsapp: form.provedor_whatsapp,
      valor_mensal: Number(form.valor_mensal),
      valor_anual: Number(form.valor_anual),
      tempo_expiracao_pix: Number(form.tempo_expiracao_pix),
      dias_aviso: form.dias_aviso,
    }).eq("id", form.id);
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
                  <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                  <SelectItem value="efi">Efí (Gerencianet)</SelectItem>
                  <SelectItem value="asaas">Asaas</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <Button type="submit">Salvar configurações</Button>
        </div>
      </form>
    </div>
  );
}