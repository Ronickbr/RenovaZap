import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Zap,
  ShieldCheck,
  BarChart3,
  Clock,
  QrCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RenovaZap — Renovação automática via WhatsApp e PIX" },
      {
        name: "description",
        content:
          "Reduza inadimplência e recupere receita: lembretes automáticos no WhatsApp, cobrança PIX instantânea e renovação sem intervenção manual.",
      },
      { property: "og:title", content: "RenovaZap — Renovação automática via WhatsApp e PIX" },
      {
        property: "og:description",
        content:
          "Reduza inadimplência e recupere receita: lembretes automáticos no WhatsApp, cobrança PIX instantânea e renovação sem intervenção manual.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Clock,
    title: "Monitoramento 24/7",
    desc: "Job automático verifica vencimentos e dispara mensagens nos gatilhos: 7d, 3d, 1d, no dia e após.",
    span: "md:col-span-2",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp integrado",
    desc: "Evolution API, Meta Cloud, WPPConnect, Baileys e Green API — templates com variáveis dinâmicas.",
  },
  {
    icon: QrCode,
    title: "PIX instantâneo",
    desc: "Mercado Pago, InfinitePay, Efí, Asaas, Inter e Stripe. QR + copia-e-cola no chat.",
  },
  {
    icon: ShieldCheck,
    title: "Confirmação < 30s",
    desc: "Webhook do banco confirma o pagamento e renova a assinatura automaticamente.",
    span: "md:col-span-2",
  },
  {
    icon: BarChart3,
    title: "Painel completo",
    desc: "KPIs, gestão de clientes, cobranças, histórico e editor de templates.",
  },
  {
    icon: Zap,
    title: "Regras inteligentes",
    desc: "Sem duplicidade de mensagem, sem PIX redundante, auditoria completa.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5 font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="font-display text-lg tracking-tight">RenovaZap</span>
          </div>
          <nav className="flex items-center gap-1.5">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90">
                Começar <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="absolute inset-x-0 top-0 -z-10 flex justify-center opacity-40">
          <div className="h-[400px] w-[800px] rounded-full bg-primary/20 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center sm:py-36">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
            <Sparkles className="h-3 w-3" /> Automação de renovações via WhatsApp
          </span>
          <h1 className="mt-8 font-display text-6xl font-bold leading-[1.02] tracking-tighter sm:text-7xl">
            Renove assinaturas
            <br />
            no <span className="text-gradient-primary">piloto automático</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Monitore vencimentos, envie lembretes no WhatsApp, gere PIX instantâneo e
            confirme pagamentos sem levantar um dedo.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90">
                Acessar painel <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <a href="#recursos">
              <Button size="lg" variant="outline" className="border-border/60 backdrop-blur-sm">
                Ver recursos
              </Button>
            </a>
          </div>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Sem cartão de crédito</div>
            <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Setup em 5 min</div>
            <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> LGPD compliant</div>
          </div>
        </div>
      </section>

      <section id="recursos" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Tudo que você precisa para <span className="text-gradient-primary">não perder receita</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Uma stack completa de retenção — do lembrete à confirmação do pagamento.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant ${f.span ?? ""}`}
              >
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-surface p-12 text-center shadow-elegant">
            <div className="absolute -top-24 left-1/2 -z-10 h-48 w-[600px] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Pronto para automatizar?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Cadastre-se agora — o primeiro usuário vira admin automaticamente.
            </p>
            <div className="mt-8">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90">
                  Começar grátis <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
              <MessageCircle className="h-3 w-3" />
            </div>
            <span className="font-medium text-foreground">RenovaZap</span>
          </div>
          <div>Renovação automática via WhatsApp + PIX</div>
        </div>
      </footer>
    </div>
  );
}
