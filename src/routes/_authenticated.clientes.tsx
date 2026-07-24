import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
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
  const [pacoteFilter, setPacoteFilter] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [agrupar, setAgrupar] = useState(true);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [mostrarAntigos, setMostrarAntigos] = useState(false);

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
    const usuario =
      obs?.match(/Usuario:\s*([^\|]+)/i)?.[1]?.trim() ??
      obs?.match(/Conta:\s*([^\|]+)/i)?.[1]?.trim() ??
      "";
    const senha = obs?.match(/Senha:\s*([^\|]+)/i)?.[1]?.trim() ?? "";
    const pacote = obs?.match(/Pacote:\s*([^\|]+)/i)?.[1]?.trim() ?? "";
    const indicacao =
      obs?.match(/Indica[cç][aã]o:\s*([^\|]+)/i)?.[1]?.trim() ?? "";
    return { usuario, senha, pacote, indicacao, conta: usuario };
  };

  const pacotes = Array.from(
    new Set(clientes.map((c) => parseObs(c.observacoes).pacote).filter(Boolean)),
  ).sort();

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
    const { conta, pacote } = parseObs(c.observacoes);
    const matchQ =
      !query ||
      c.nome.toLowerCase().includes(query) ||
      c.telefone.toLowerCase().includes(query) ||
      (c.email ?? "").toLowerCase().includes(query) ||
      (parseObs(c.observacoes).usuario).toLowerCase().includes(query) ||
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

  // Agrupa por telefone (usuários com múltiplas contas)
  const grupos = (() => {
    const map = new Map<string, Cliente[]>();
    for (const c of filtered) {
      const key = (c.telefone || c.id).trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries())
      .map(([telefone, itens]) => ({
        telefone,
        nome: itens[0].nome,
        itens: itens.sort((a, b) => a.expiracao.localeCompare(b.expiracao)),
        proxVenc: itens.reduce((min, c) => c.expiracao < min ? c.expiracao : min, itens[0].expiracao),
        totalValor: itens.reduce((s, c) => s + Number(c.valor || 0), 0),
      }))
      .sort((a, b) => a.proxVenc.localeCompare(b.proxVenc));
  })();

  const remove = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
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

      <div className="flex items-center gap-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={agrupar} onChange={(e) => setAgrupar(e.target.checked)} />
          Agrupar por telefone (unifica contas do mesmo usuário)
        </label>
        {agrupar && (
          <span className="text-muted-foreground">
            · {grupos.length} usuário(s), {filtered.length} conta(s)
          </span>
        )}
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

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {agrupar && <TableHead className="w-8"></TableHead>}
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
              <TableRow><TableCell colSpan={agrupar ? 8 : 7} className="text-center text-sm text-muted-foreground py-8">Nenhum cliente</TableCell></TableRow>
            )}
            {!agrupar && filtered.map((c) => {
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
            {agrupar && grupos.map((g) => {
              const aberto = expandido[g.telefone] ?? (g.itens.length === 1);
              const d = diasAte(g.proxVenc);
              return (
                <Fragment key={g.telefone}>
                  <TableRow className="bg-muted/30">
                    <TableCell>
                      {g.itens.length > 1 && (
                        <button onClick={() => setExpandido({ ...expandido, [g.telefone]: !aberto })}>
                          {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {g.nome}
                      {g.itens.length > 1 && <Badge variant="secondary" className="ml-2">{g.itens.length} contas</Badge>}
                    </TableCell>
                    <TableCell>{g.telefone}</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell>{fmtBRL(g.totalValor)}</TableCell>
                    <TableCell>
                      {fmtDate(g.proxVenc)}{" "}
                      <span className={`ml-1 text-xs ${d < 0 ? "text-destructive" : d <= 3 ? "text-orange-500" : "text-muted-foreground"}`}>
                        ({d < 0 ? `vencido ${Math.abs(d)}d` : d === 0 ? "hoje" : `${d}d`})
                      </span>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {aberto && g.itens.map((c) => {
                    const dc = diasAte(c.expiracao);
                    const { usuario, senha, pacote } = parseObs(c.observacoes);
                    return (
                      <TableRow key={c.id}>
                        <TableCell></TableCell>
                        <TableCell className="pl-8 text-sm">
                          <div className="flex flex-col">
                            <span>{usuario || pacote || c.nome}</span>
                            {(usuario || senha) && (
                              <span className="text-xs text-muted-foreground">
                                {usuario && <>Usuário: <code>{usuario}</code></>}
                                {senha && <> · Senha: <code>{senha}</code></>}
                              </span>
                            )}
                            {pacote && <span className="text-xs text-muted-foreground">Pacote: {pacote}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.telefone}</TableCell>
                        <TableCell>{c.plano}</TableCell>
                        <TableCell>{Number(c.valor) > 0 ? fmtBRL(c.valor) : <span className="text-xs text-muted-foreground">padrão</span>}</TableCell>
                        <TableCell>
                          {fmtDate(c.expiracao)}{" "}
                          <span className={`ml-1 text-xs ${dc < 0 ? "text-destructive" : dc <= 3 ? "text-orange-500" : "text-muted-foreground"}`}>
                            ({dc < 0 ? `vencido ${Math.abs(dc)}d` : dc === 0 ? "hoje" : `${dc}d`})
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
                </Fragment>
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
            placeholder={"Usuario: seu_usuario | Senha: sua_senha | Pacote: Basic Plan"}
            value={form.observacoes ?? ""}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Use o formato <code>Usuario: ... | Senha: ... | Pacote: ...</code> para que apareça formatado na listagem.
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}