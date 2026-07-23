import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MessageCircle, Zap, ShieldCheck, BarChart3, Clock, QrCode } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RenovaZap — Renovação automática via WhatsApp e PIX" },
      {
        name: "description",
        content:
          "Reduza inadimplência e recupere receita: lembretes automáticos no WhatsApp, cobrança PIX instantânea e renovação sem intervenção manual.",
      },
      { property: "og:title", content: "RenovaZap — Renove assinaturas no automático" },
      {
        property: "og:description",
        content:
          "Monitoramento de vencimentos, cobrança PIX e confirmação automática direto no WhatsApp do seu cliente.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessageCircle className="h-4 w-4" />
            </div>
            RenovaZap
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button>Começar</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Zap className="h-3 w-3" /> Automação de renovações via WhatsApp
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Renove assinaturas no <span className="text-primary">piloto automático</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Monitore vencimentos, envie lembretes no WhatsApp, gere PIX instantâneo e
            confirme pagamentos sem levantar um dedo. Menos inadimplência, mais receita.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth">
              <Button size="lg">Acessar painel</Button>
            </Link>
            <a href="#recursos">
              <Button size="lg" variant="outline">
                Ver recursos
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section id="recursos" className="border-t bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Clock,
                title: "Monitoramento 24/7",
                desc: "Job automático verifica vencimentos e dispara mensagens nos gatilhos configurados: 7d, 3d, 1d, no dia e após.",
              },
              {
                icon: MessageCircle,
                title: "WhatsApp integrado",
                desc: "Compatível com Evolution API, Meta Cloud API, WPPConnect, Baileys e Green API. Templates com variáveis dinâmicas.",
              },
              {
                icon: QrCode,
                title: "PIX instantâneo",
                desc: "Mercado Pago, Efí, Asaas, PagSeguro, Inter e Stripe. QR Code + copia e cola enviados direto no chat.",
              },
              {
                icon: ShieldCheck,
                title: "Confirmação automática",
                desc: "Webhook do banco confirma o pagamento e renova a assinatura em menos de 30 segundos.",
              },
              {
                icon: BarChart3,
                title: "Painel completo",
                desc: "Dashboard com KPIs, gestão de clientes, cobranças, histórico de mensagens e editor de templates.",
              },
              {
                icon: Zap,
                title: "Regras inteligentes",
                desc: "Não envia mensagens duplicadas, não gera PIX enquanto houver cobrança válida e mantém auditoria completa.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          RenovaZap · Sistema de renovação automática via WhatsApp + PIX
        </div>
      </footer>
    </div>
  );
}
