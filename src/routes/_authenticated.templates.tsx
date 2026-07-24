import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { templateSchema, firstIssue } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — RenovaZap" }] }),
  component: Templates,
});

type Template = {
  id: string;
  nome: string;
  gatilho: string;
  mensagem: string;
  ativo: boolean;
};

const TIPOS = [
  { v: "aviso_7d", l: "Aviso 7 dias antes" },
  { v: "aviso_3d", l: "Aviso 3 dias antes" },
  { v: "aviso_1d", l: "Aviso 1 dia antes" },
  { v: "vencido", l: "Vencido" },
  { v: "pagamento_confirmado", l: "Pagamento confirmado" },
  { v: "manual", l: "Envio manual" },
];

function Templates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [toDelete, setToDelete] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").order("gatilho");
      if (error) throw error;
      return data as Template[];
    },
  });

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("templates").delete().eq("id", toDelete.id);
    setDeleting(false);
    setToDelete(null);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    qc.invalidateQueries({ queryKey: ["templates"] });
  };

  const toggle = async (t: Template) => {
    await supabase.from("templates").update({ ativo: !t.ativo }).eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["templates"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Variáveis: {"{{nome}}"}, {"{{valor}}"}, {"{{expiracao}}"}, {"{{dias}}"}, {"{{pix_copiaecola}}"}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo</Button></DialogTrigger>
          <TemplateForm editing={editing} onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["templates"] }); }} />
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{t.nome}</CardTitle>
                <Badge variant="outline" className="mt-1">{TIPOS.find(x => x.v === t.gatilho)?.l ?? t.gatilho}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={t.ativo} onCheckedChange={() => toggle(t)} />
                <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setToDelete(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{t.mensagem}</pre>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum template ainda.</p>}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `"${toDelete.nome}" será removido permanentemente.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={(e) => { e.preventDefault(); confirmDelete(); }}>
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplateForm({ editing, onSaved }: { editing: Template | null; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Template>>(
    editing ?? { nome: "", gatilho: "aviso_3d", mensagem: "Olá {{nome}}, sua assinatura vence em {{dias}} dias.", ativo: true },
  );
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = templateSchema.safeParse({
      nome: form.nome ?? "",
      gatilho: form.gatilho ?? "manual",
      mensagem: form.mensagem ?? "",
      ativo: !!form.ativo,
    });
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error));
      return;
    }
    setBusy(true);
    const payload = parsed.data;
    const { error } = editing
      ? await supabase.from("templates").update(payload).eq("id", editing.id)
      : await supabase.from("templates").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Editar template" : "Novo template"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1"><Label>Nome</Label><Input required value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={form.gatilho} onValueChange={(v) => setForm({ ...form, gatilho: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Conteúdo</Label><Textarea rows={6} required value={form.mensagem ?? ""} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} /></div>
        <div className="flex items-center gap-2"><Switch checked={!!form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
        <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}