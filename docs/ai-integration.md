# AI Integration - OrthoScan

## Visao geral

O gateway de IA foi implementado como Edge Function `ai-gateway` com rotas:

- `POST /functions/v1/ai-gateway/clinica/resumo`
- `POST /functions/v1/ai-gateway/clinica/plano`
- `POST /functions/v1/ai-gateway/clinica/evolucao`
- `POST /functions/v1/ai-gateway/lab/auditoria-solicitacao`
- `POST /functions/v1/ai-gateway/lab/previsao-entrega`
- `POST /functions/v1/ai-gateway/gestao/insights-dre`
- `POST /functions/v1/ai-gateway/gestao/anomalias`
- `POST /functions/v1/ai-gateway/comercial/script`
- `POST /functions/v1/ai-gateway/comercial/resumo-leigo`
- `POST /functions/v1/ai-gateway/comercial/followup`

O frontend usa `src/repo/aiRepo.ts`, que chama estas rotas via `supabase.functions.invoke`.

## Como ligar por clinica

1. Criar/atualizar linha em `public.ai_feature_flags` para a `clinic_id`.
2. Ativar `ai_enabled=true`.
3. Ativar os modulos desejados:
   - `clinica_enabled`
   - `lab_enabled`
   - `gestao_enabled`
   - `comercial_enabled`
4. Opcionalmente ajustar `limits_json` com:
   - `userPerMinute`
   - `clinicPerMinute`
   - `dailyCostLimit`

## Limites e custo

- Rate limit por usuario e clinica baseado em contagem de `ai_jobs` no ultimo minuto.
- Quota diaria por clinica baseada em `ai_usage.cost_total`.
- Ao exceder quota diaria, a API retorna: `Limite diario atingido`.

## Provider/modelo

Variaveis:

- `AI_PROVIDER` (`mock`, `http`, `openai`)
- `AI_API_KEY`
- `AI_MODEL`
- `AI_API_BASE_URL` (opcional para provider HTTP)

`mock` e o padrao recomendado para desenvolvimento local.

## LGPD e boas praticas

- Nao enviar PDF/imagem base64 para IA.
- Enviar apenas texto e metadados.
- O gateway aplica mascaramento de CPF/telefone/email/nome em campos conhecidos.
- Inputs redigidos e outputs ficam auditados em `ai_jobs`.
- Sempre manter aprovacao humana antes de salvar/enviar texto gerado.
