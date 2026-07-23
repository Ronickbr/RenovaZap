import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtBRL, fmtDate, diasAte } from "@/lib/format";
import { Plus, Pencil, Trash2, QrCode, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — RenovaZap" }] }),
  component: Clientes,
});

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  plano: string;
  valor: number;
  status: string;
  expiracao: string;
  observacoes: string | null;
};

function Clientes() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [pacoteFilter, setPacoteFilter] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("expiracao");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  // Extrai "Conta:" e "Pacote:" das observações (formato importado da planilha)
  const parseObs = (obs: string | null) => {
    const conta = obs?.match(/Conta:\s*([^\|]+)/i)?.[1]?.trim() ?? "";
    const pacote = obs?.match(/Pacote:\s*([^\|]+)/i)?.[1]?.trim() ?? "";
    return { conta, pacote };
  };

  const pacotes = Array.from(
    new Set(clientes.map((c) => parseObs(c.observacoes).pacote).filter(Boolean)),
  ).sort();

  const query = q.trim().toLowerCase();
  const filtered = clientes.filter((c) => {
    const { conta, pacote } = parseObs(c.observacoes);
    const matchQ =
      !query ||
      c.nome.toLowerCase().includes(query) ||
      c.telefone.toLowerCase().includes(query) ||
      (c.email ?? "").toLowerCase().includes(query) ||
      conta.toLowerCase().includes(query) ||
      pacote.toLowerCase().includes(query);
    const matchStatus = statusFilter === "todos" || c.status === statusFilter;
    const matchPacote = pacoteFilter === "todos" || pacote === pacoteFilter;
    return matchQ && matchStatus && matchPacote;
  });

  const clearFilters = () => {
    setQ("");
    setStatusFilter("todos");
    setPacoteFilter("todos");
  };
  const hasFilters = q !== "" || statusFilter !== "todos" || pacoteFilter !== "todos";

  const remove = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cliente excluído");
    qc.invalidateQueries({ queryKey: ["clientes"] });
  };

  const gerarPix = async (c: Cliente) => {
    const txid = `PIX${Date.now()}`;
    const expires_at = new Date(Date.now() + 3600 * 1000).toISOString();
    const { error } = await supabase.from("pagamentos").insert({
      cliente_id: c.id,
      valor: c.valor,
      status: "pendente",
      pix_id: txid,
      txid,
      qrcode: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>`,
      copiaecola: `00020126...${txid}...5204000053039865802BR6009RenovaZap`,
      expires_at,
    });
    if (error) return toast.error(error.message);
    toast.success("PIX gerado (simulado). Configure seu provedor real em Configurações.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {clientes.length} cadastrado(s)
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo cliente</Button>
          </DialogTrigger>
          <ClienteForm
            editing={editing}
            onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["clientes"] }); }}
          />
        </Dialog>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_180px_180px_auto]">
        <Input
          placeholder="Buscar por nome, conta, telefone, e-mail ou pacote…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pacoteFilter} onValueChange={setPacoteFilter}>
          <SelectTrigger><SelectValue placeholder="Pacote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os pacotes</SelectItem>
            {pacotes.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
          <X className="mr-1 h-4 w-4" /> Limpar
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum cliente</TableCell></TableRow>
            )}
            {filtered.map((c) => {
              const d = diasAte(c.expiracao);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.telefone}</TableCell>
                  <TableCell>{c.plano}</TableCell>
                  <TableCell>{fmtBRL(c.valor)}</TableCell>
                  <TableCell>
                    {fmtDate(c.expiracao)}{" "}
                    <span className={`ml-1 text-xs ${d < 0 ? "text-destructive" : d <= 3 ? "text-orange-500" : "text-muted-foreground"}`}>
                      ({d < 0 ? `vencido ${Math.abs(d)}d` : d === 0 ? "hoje" : `${d}d`})
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => gerarPix(c)} title="Gerar PIX"><QrCode className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ClienteForm({ editing, onSaved }: { editing: Cliente | null; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Cliente>>(
    editing ?? { nome: "", telefone: "", email: "", plano: "mensal", valor: 49.9, status: "ativo", expiracao: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) },
  );
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      nome: form.nome!,
      telefone: form.telefone!,
      email: form.email || null,
      plano: form.plano!,
      valor: Number(form.valor ?? 0),
      status: form.status!,
      expiracao: form.expiracao!,
      observacoes: form.observacoes || null,
    };
    const { error } = editing
      ? await supabase.from("clientes").update(payload).eq("id", editing.id)
      : await supabase.from("clientes").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Cliente atualizado" : "Cliente criado");
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1"><Label>Nome</Label><Input required value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Telefone (WhatsApp)</Label><Input required placeholder="5511999999999" value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Plano</Label>
            <Select value={form.plano} onValueChange={(v) => setForm({ ...form, plano: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor ?? 0} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1"><Label>Vencimento</Label><Input type="date" required value={form.expiracao ?? ""} onChange={(e) => setForm({ ...form, expiracao: e.target.value })} /></div>
        <div className="space-y-1"><Label>Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}