import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { gerarCobrancaInfinitepay } from "@/lib/infinitepay.functions";
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
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { clienteSchema, firstIssue } from "@/lib/schemas";

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
  const gerarInfinitepay = useServerFn(gerarCobrancaInfinitepay);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [mostrarAntigos, setMostrarAntigos] = useState(false);
  const [toDelete, setToDelete] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("expiracao");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const parseObs = (obs: string | null) => {
    const usuario =
      obs?.match(/Usuario:\s*([^\|]+)/i)?.[1]?.trim() ??
      obs?.match(/Conta:\s*([^\|]+)/i)?.[1]?.trim() ??
      "";
    const senha = obs?.match(/Senha:\s*([^\|]+)/i)?.[1]?.trim() ?? "";
    const indicacao =
      obs?.match(/Indica[cç][aã]o:\s*([^\|]+)/i)?.[1]?.trim() ?? "";
    return { usuario, senha, indicacao, conta: usuario };
  };

  const query = q.trim().toLowerCase();
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const ocultosAntigos = clientes.filter((c) => {
    const exp = new Date(c.expiracao + "T00:00:00");
    return (hoje.getTime() - exp.getTime()) / 86400000 > 90;
  }).length;
  const visiveis = mostrarAntigos
    ? clientes
    : clientes.filter((c) => {
        const exp = new Date(c.expiracao + "T00:00:00");
        return (hoje.getTime() - exp.getTime()) / 86400000 <= 90;
      });
  const filtered = visiveis.filter((c) => {
    const matchQ =
      !query ||
      c.nome.toLowerCase().includes(query) ||
      c.telefone.toLowerCase().includes(query) ||
      (c.email ?? "").toLowerCase().includes(query) ||
      (parseObs(c.observacoes).usuario).toLowerCase().includes(query);
    const matchStatus = statusFilter === "todos" || c.status === statusFilter;
    return matchQ && matchStatus;
  });

  const clearFilters = () => {
    setQ("");
    setStatusFilter("todos");
  };
  const hasFilters = q !== "" || statusFilter !== "todos";

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("clientes").delete().eq("id", toDelete.id);
    setDeleting(false);
    setToDelete(null);
    if (error) return toast.error(error.message);
    toast.success("Cliente excluído");
    qc.invalidateQueries({ queryKey: ["clientes"] });
  };

  const gerarPix = async (c: Cliente) => {
    const { data: cfg } = await supabase
      .from("configuracoes")
      .select("provedor_pix")
      .eq("id", 1)
      .maybeSingle();
    const provedor = cfg?.provedor_pix ?? "simulado";

    if (provedor === "infinitepay") {
      try {
        const res = await gerarInfinitepay({ data: { clienteId: c.id } });
        toast.success("Link InfinitePay gerado");
        qc.invalidateQueries({ queryKey: ["pagamentos"] });
        window.open(res.url, "_blank", "noopener");
      } catch (e: any) {
        toast.error(e?.message ?? "Falha ao gerar cobrança InfinitePay");
      }
      return;
    }

    // Fallback simulado
    const txid = `PIX${Date.now()}`;
    const expires_at = new Date(Date.now() + 3600 * 1000).toISOString();
    const { error } = await supabase.from("pagamentos").insert({
      cliente_id: c.id,
      valor: c.valor,
      status: "pendente",
      pix_id: txid,
      txid,
      copiaecola: `00020126...${txid}...5204000053039865802BR6009RenovaZap`,
      expires_at,
    });
    if (error) return toast.error(error.message);
    toast.success("PIX simulado gerado. Selecione InfinitePay em Configurações para gerar link real.");
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

      <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
        <Input
          placeholder="Buscar por nome, usuário, telefone ou e-mail…"
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
        <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
          <X className="mr-1 h-4 w-4" /> Limpar
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={mostrarAntigos} onChange={(e) => setMostrarAntigos(e.target.checked)} />
          Mostrar clientes vencidos há mais de 90 dias
        </label>
        {ocultosAntigos > 0 && !mostrarAntigos && (
          <span className="text-muted-foreground">· {ocultosAntigos} oculto(s)</span>
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Nenhum cliente</TableCell></TableRow>
            )}
            {filtered.map((c) => {
              const d = diasAte(c.expiracao);
              const aberto = !!expandido[c.id];
              const { usuario, senha, indicacao } = parseObs(c.observacoes);
              const toggle = () => setExpandido({ ...expandido, [c.id]: !aberto });
              return (
                <Fragment key={c.id}>
                  <TableRow
                    className={cn("cursor-pointer hover:bg-muted/50", aberto && "bg-muted/40")}
                    onClick={toggle}
                  >
                    <TableCell>
                      {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.telefone || <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{Number(c.valor) > 0 ? fmtBRL(c.valor) : <span className="text-xs text-muted-foreground">padrão</span>}</TableCell>
                    <TableCell className="capitalize">{c.plano}</TableCell>
                    <TableCell>
                      {fmtDate(c.expiracao)}{" "}
                      <span className={`ml-1 text-xs ${d < 0 ? "text-destructive" : d <= 3 ? "text-orange-500" : "text-muted-foreground"}`}>
                        ({d < 0 ? `vencido ${Math.abs(d)}d` : d === 0 ? "hoje" : `${d}d`})
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => gerarPix(c)} title="Gerar PIX"><QrCode className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                  {aberto && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell></TableCell>
                      <TableCell colSpan={7}>
                        <DetalhesCliente usuario={usuario} senha={senha} indicacao={indicacao} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">Nenhum cliente</div>
        )}
        {filtered.map((c) => {
          const d = diasAte(c.expiracao);
          const aberto = !!expandido[c.id];
          const { usuario, senha, indicacao } = parseObs(c.observacoes);
          const toggle = () => setExpandido({ ...expandido, [c.id]: !aberto });
          return (
            <div key={c.id} className="rounded-lg border bg-card overflow-hidden">
              <button
                onClick={toggle}
                className="w-full text-left p-3 flex items-start gap-3 hover:bg-muted/50 transition"
              >
                <div className="mt-1 shrink-0">
                  {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{c.nome}</span>
                    <Badge variant={c.status === "ativo" ? "default" : "secondary"} className="shrink-0">{c.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.telefone || "sem telefone"} · <span className="capitalize">{c.plano}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {Number(c.valor) > 0 ? fmtBRL(c.valor) : "valor padrão"}
                    </span>
                    <span className={d < 0 ? "text-destructive" : d <= 3 ? "text-orange-500" : "text-muted-foreground"}>
                      {fmtDate(c.expiracao)} ({d < 0 ? `vencido ${Math.abs(d)}d` : d === 0 ? "hoje" : `${d}d`})
                    </span>
                  </div>
                </div>
              </button>
              {aberto && (
                <div className="border-t bg-muted/20 p-3 space-y-3">
                  <DetalhesCliente usuario={usuario} senha={senha} indicacao={indicacao} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => gerarPix(c)}><QrCode className="mr-1 h-4 w-4" /> PIX</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => setToDelete(c)}><Trash2 className="mr-1 h-4 w-4 text-destructive" /> Excluir</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `"${toDelete.nome}" será removido permanentemente. Esta ação não pode ser desfeita.` : ""}
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

function DetalhesCliente({
  usuario, senha, indicacao,
}: { usuario: string; senha: string; indicacao: string }) {
  const items = [
    { label: "Usuário", value: usuario, mono: true },
    { label: "Senha", value: senha, mono: true },
    { label: "Indicação", value: indicacao, mono: false },
  ];
  const copy = (v: string) => {
    if (!v) return;
    navigator.clipboard?.writeText(v);
    toast.success("Copiado");
  };
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-md border bg-background p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {it.label}
          </div>
          {it.value ? (
            <button
              onClick={() => copy(it.value)}
              className={cn(
                "mt-1 block w-full truncate text-left text-sm hover:text-primary transition",
                it.mono && "font-mono",
              )}
              title="Clique para copiar"
            >
              {it.value}
            </button>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">—</div>
          )}
        </div>
      ))}
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
    const parsed = clienteSchema.safeParse({
      nome: form.nome ?? "",
      telefone: form.telefone ?? "",
      email: form.email ?? "",
      plano: form.plano ?? "mensal",
      valor: form.valor ?? 0,
      status: form.status ?? "ativo",
      expiracao: form.expiracao ?? "",
      observacoes: form.observacoes ?? "",
    });
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error));
      return;
    }
    setBusy(true);
    const payload = {
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      email: parsed.data.email || null,
      plano: parsed.data.plano,
      valor: parsed.data.valor,
      status: parsed.data.status,
      expiracao: parsed.data.expiracao,
      observacoes: parsed.data.observacoes || null,
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
              <SelectItem value="semestral">Semestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" placeholder="0 = usar padrão" value={form.valor ?? 0} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground">Deixe 0 para usar o valor padrão de Configurações.</p>
          </div>
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
        <div className="space-y-1">
          <Label>Observações</Label>
          <Textarea
            placeholder={"Usuario: seu_usuario | Senha: sua_senha | Indicação: origem"}
            value={form.observacoes ?? ""}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Use o formato <code>Usuario: ... | Senha: ... | Indicação: ...</code> para que apareça formatado na listagem.
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}