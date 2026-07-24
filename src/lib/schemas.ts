import { z } from "zod";

// Aceita apenas dígitos, 10-15 (DDI + DDD + número). Ex.: 5511999999999.
const telefoneRegex = /^\d{10,15}$/;

export const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120, "Nome muito longo"),
  telefone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D+/g, ""))
    .refine((v) => v === "" || telefoneRegex.test(v), "Telefone inválido (use apenas números, 10 a 15 dígitos)"),
  email: z
    .string()
    .trim()
    .max(255)
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  plano: z.enum(["mensal", "trimestral", "semestral", "anual"]),
  valor: z.coerce.number().min(0, "Valor inválido").max(100000, "Valor muito alto"),
  status: z.enum(["ativo", "inativo", "vencido"]),
  expiracao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida"),
  observacoes: z.string().max(2000, "Observações muito longas").optional().or(z.literal("")),
});
export type ClienteInput = z.infer<typeof clienteSchema>;

export const templateSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120),
  gatilho: z.enum(["aviso_7d", "aviso_3d", "aviso_1d", "vencido", "pagamento_confirmado", "manual"]),
  mensagem: z.string().trim().min(5, "Mensagem muito curta").max(4000, "Mensagem muito longa"),
  ativo: z.boolean(),
});
export type TemplateInput = z.infer<typeof templateSchema>;

const urlOpt = z
  .string()
  .trim()
  .max(500)
  .url("URL inválida (inclua https://)")
  .optional()
  .or(z.literal(""));

export const configSchema = z.object({
  provedor_pix: z.string().min(1),
  provedor_whatsapp: z.string().min(1),
  valor_mensal: z.coerce.number().min(0).max(100000),
  valor_anual: z.coerce.number().min(0).max(1000000),
  tempo_expiracao_pix: z.coerce.number().int().min(60, "Mínimo 60s").max(86400, "Máximo 24h"),
  dias_aviso: z.array(z.number().int().min(0).max(365)).max(20),
  infinitepay_handle: z.string().trim().max(60).optional().or(z.literal("")),
  evolution_url: urlOpt,
  evolution_api_key: z.string().trim().max(500).optional().or(z.literal("")),
  evolution_instance: z.string().trim().max(120).optional().or(z.literal("")),
  n8n_webhook_url: urlOpt,
});
export type ConfigInput = z.infer<typeof configSchema>;

export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos";
}