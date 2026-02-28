# RELATORIO ORTHOSCAN DIAGNOSTICO

Gerado em: 2026-02-27
Repositorio: `d:\dev\ortho-scan`
Perfil de execucao: QA Lead + Arquiteto de Software

## 1) Resumo executivo

### Status geral
- Arquitetura e fluxo principal mapeados (frontend, auth, repositorios, storage, edge functions, migrations, RBAC).
- Pipeline tecnico principal executado localmente: install, lint, typecheck, build, unit, e2e, audit, diagnostico custom.
- Unitarios e build estao saudaveis, mas E2E esta totalmente quebrado por incompatibilidade entre ambiente de teste e modo de autenticacao atual.

### Resultado consolidado
| Area | Resultado | Evidencia |
|---|---|---|
| Instalacao limpa (`npm ci`) | PASS | 755 pacotes instalados |
| Diagnostico custom (`qa:diagnostics`) | PASS (12/12) | `reports/diagnostics.json` |
| Lint | WARN (2) | `src/pages/LabPage.tsx` hooks deps |
| Typecheck | PASS isolado / FAIL em paralelo | OOM quando concorrente |
| Build | PASS | `dist/` gerado |
| Unit/integration (Vitest) | PASS (29/29) | `src/tests/**` |
| E2E (Playwright) | FAIL (0/5) | falha login em todos specs |
| Security audit (`npm audit`) | FAIL (20 vulns) | 5 criticas, 11 altas |

### Top 10 riscos
1. E2E completamente indisponivel por quebra de login (critico).
2. Vulnerabilidades criticas/altas em dependencias de build/runtime (alto).
3. `verify_jwt = false` em funcoes sensiveis com validacao manual (alto).
4. `xlsx` com vulnerabilidades altas e sem `fixAvailable` (alto).
5. Fluxo local legado removido no app, mas ainda assumido por testes E2E (alto).
6. Typecheck instavel sob concorrencia (OOM) em execucao paralela (medio).
7. Lacunas de teste em edge functions e fluxos de storage/migracao (medio).
8. Uso extensivo de `toISOString().slice(0,10)` com risco de timezone/date drift (medio).
9. Avisos de hooks em `LabPage` podem gerar estado stale (medio).
10. Documentacao inconsistente (README menciona modo local) + mojibake em docs (baixo/medio).

### Pronto para producao?
- **Nao** no estado atual para governanca de qualidade.
- Motivos principais:
  - Suite E2E inteira falhando no passo inicial de autenticacao.
  - 20 vulnerabilidades abertas (incluindo criticas).
  - Cobertura automatica insuficiente para edge functions e cenario real Supabase ponta-a-ponta.

---

## 2) FASE 0 - Inventario e contexto

### 2.1 Stack e arquitetura
- Frontend: React 19 + TypeScript + Vite 7 (`src/`, `src/pages`, `src/components`).
- Roteamento: `react-router-dom` com rotas protegidas por permissao (`src/App.tsx`, `src/app/ProtectedRoute.tsx`).
- Estado de dados:
  - Camada local: `src/data/*.ts` (DB em `localStorage`).
  - Camada remota: Supabase (`src/repo/*.ts`, `src/lib/supabaseClient.ts`).
- Auth: Supabase Auth via provider unico (`src/auth/authProvider.ts -> authSupabase`).
- Banco e seguranca: Supabase Postgres + RLS + policies + migrations SQL (`supabase/migrations`).
- Storage: Supabase Storage bucket `orthoscan` ou Microsoft Drive via edge function (`src/repo/storageRepo.ts`).
- Backend serverless: Supabase Edge Functions (`supabase/functions/*`).
- Desktop: Electron (`desktop/*`, `desktop:build`).

### 2.2 Scripts disponiveis (`package.json`)
| Script | Finalidade |
|---|---|
| `dev` | sobe Vite em desenvolvimento |
| `build` | `tsc -b` + build Vite |
| `lint` | ESLint do projeto |
| `preview` | preview do build |
| `typecheck` | checagem TS sem emitir artefatos |
| `test` | Vitest |
| `test:ui` | Vitest UI |
| `test:e2e` | Playwright |
| `migrate` | `supabase db push` |
| `preflight:prod` | checklist pre-producao |
| `desktop:icon` | gera icon desktop |
| `desktop:dev` | inicia app electron dev |
| `desktop:build` | build web + empacota electron |
| `qa:diagnostics` | diagnostico custom de estrutura/permissoes |
| `qa` | pipeline completo (diagnostico + testes + e2e + build + relatorio) |

### 2.3 Mapa de pastas e pontos criticos
- `src/pages`: fluxos principais de produto (dashboard, scans, casos, lab, pacientes, configuracoes).
- `src/components`: UI e modais de operacao (upload, documentos, lab, scans).
- `src/auth`: permissoes RBAC, escopo por perfil, sessao.
- `src/data`: regras de dominio local (cases/scans/lab/replacement bank).
- `src/repo`: integracoes Supabase e orchestration de edge functions/storage.
- `src/diagnostics`: runtime checks e tela de diagnostico.
- `src/tests` + `e2e`: cobertura automatizada.
- `supabase/migrations`: esquema, RLS, policies, hardening.
- `supabase/functions`: onboarding, convite, reset senha, import/export, ms drive.
- `scripts`: diagnostico CLI e geracao de relatorio QA.

### 2.4 Integracoes externas e uso
| Integracao | Onde usada | Objetivo |
|---|---|---|
| Supabase Auth/DB/Storage/Functions | `src/lib/supabaseClient.ts`, `src/repo/*` | auth, CRUD, storage, serverless |
| Supabase Edge Functions | `src/repo/onboardingRepo.ts`, `src/repo/accessRepo.ts`, `src/pages/MigrationPage.tsx` | convite, onboarding, reset senha, import/export |
| Microsoft Graph (OneDrive) | `supabase/functions/ms-drive-storage/index.ts`, `src/repo/storageRepo.ts` | storage alternativo |
| ViaCEP | `src/lib/cep.ts`, `src/diagnostics/runDiagnostics.ts` | endereco e check conectividade |
| Resend API | `send-access-email`, `request-password-reset` | envio de emails |
| Monitoring webhook | `src/lib/monitoring.ts` | telemetria de erro frontend |

---

## 3) FASE 1 - Mapeamento completo de funcionalidades

## 3.1 Diagrama textual de fluxos por modulo

### Auth e acesso
1. Login (`/login`) -> `authSupabase.signIn` -> `getCurrentUser` -> redirect `/app/dashboard`.
2. Reset senha (`/reset-password`) -> edge function `request-password-reset` -> token -> `complete-password-reset`.
3. Convite onboarding:
- Admin cria convite (`create-onboarding-invite`) em Settings.
- Usuario abre `/complete-signup?token=...`.
- Validacao token (`validate-onboarding-invite`) e conclusao (`complete-onboarding-invite`).
4. Controle de acesso:
- Gate de rota em `ProtectedRoute`.
- Permissao por perfil em `auth/permissions.ts`.
- Escopo de dados por vinculo clinica/dentista em `auth/scope.ts`.

### Cadastros operacionais
1. Clinicas: lista + detalhe + criar/editar + soft delete + restaurar.
2. Dentistas: lista + importacao planilha + detalhe + soft delete/restaurar.
3. Pacientes: lista + importacao planilha + detalhe + vinculos + historicos.
4. Usuarios/perfis (Settings): CRUD, ativar/desativar, reset senha, envio acesso.

### Scans -> Cases -> Lab
1. Scans: criar, anexar arquivos (3D/fotos/rx), aprovar/reprovar, converter em caso.
2. Cases: planejamento, orcamento, contrato, geracao OS LAB, anexos, timeline de placas, entregas.
3. Lab: quadro kanban (`aguardando_iniciar -> em_producao -> controle_qualidade -> prontas`), solicitacao avulsa, reconfeccao, reposicao programada.
4. Replacement bank: saldo, debito em producao e eventos de rework.

### Documentos e storage
1. Upload de documento de paciente (validacao tipo/tamanho).
2. Persistencia em bucket `orthoscan` (privado) ou Microsoft Drive.
3. Leitura por signed URL (tempo limitado).
4. Soft delete logico de metadados + delete fisico no storage.

### Administracao e suporte
1. Settings: tema, cadastro laboratorio, automacao guias, precificacao por produto.
2. Backup/relatorio XLSX local.
3. Migration (`/app/settings/migration`): export local e import/export Supabase.
4. Diagnostico (`/app/settings/diagnostics`): checks de ambiente, RBAC, conectividade.
5. Ajuda e paginas legais (termos, privacidade, LGPD).

### Chat interno
1. Widget com salas e unread counts.
2. Leitura/escrita em tabelas `internal_chat_messages` e `internal_chat_reads`.

### Estados e transicoes relevantes
- Scan: `pendente -> aprovado/reprovado -> convertido`.
- Case status: `planejamento -> em_producao -> em_entrega -> finalizado`.
- Case phase: `planejamento -> orcamento -> contrato_pendente -> contrato_aprovado -> em_producao -> finalizado`.
- Lab status: `aguardando_iniciar -> em_producao -> controle_qualidade -> prontas` (transicao adjacente).
- Tray state: `pendente -> em_producao -> pronta -> entregue`, com `rework`.

### 3.2 Matriz de funcionalidades
| Modulo | Tela/Rota | Acao | Funcoes/Arquivos | Dep. externa | Teste existe? | Risco |
|---|---|---|---|---|---|---|
| Login | `/login` | autenticar e redirecionar | `src/pages/LoginPage.tsx`, `src/auth/authSupabase.ts` | Supabase Auth | E2E (falhando) | Alto |
| Reset senha | `/reset-password` | solicitar e concluir reset | `src/pages/ResetPasswordPage.tsx`, `src/repo/accessRepo.ts` | Edge funcs + Resend | Nao direto | Alto |
| Onboarding convite | `/complete-signup` | validar token e concluir cadastro | `src/pages/OnboardingInvitePage.tsx`, `src/repo/onboardingRepo.ts` | Edge funcs | Nao direto | Alto |
| Dashboard | `/app/dashboard` | KPIs e pendencias | `src/pages/DashboardPage.tsx`, `src/data/kpis.ts` | Supabase/local DB | E2E smoke (falhando) | Medio |
| Scans | `/app/scans` | CRUD scan + anexos + aprovar/reprovar | `src/pages/ScansPage.tsx`, `src/data/scanRepo.ts`, `src/repo/storageRepo.ts` | Supabase + Storage | Unit+E2E (E2E falha) | Alto |
| Criar caso do scan | modal em scans | converter scan para caso | `createCaseFromScan`, `createCaseFromScanSupabase` | Supabase DB | Unit+E2E (E2E falha) | Alto |
| Cases lista | `/app/cases` | listar/filtrar casos | `src/pages/CasesPage.tsx` | Supabase | E2E smoke (falhando) | Medio |
| Case detalhe | `/app/cases/:id` | fluxo clinico/comercial/producao | `src/pages/CaseDetailPage.tsx`, `src/data/caseRepo.ts` | Supabase + Storage | Unit parcial | Alto |
| Lab board | `/app/lab` | mover cards e produzir | `src/pages/LabPage.tsx`, `src/data/labRepo.ts` | Supabase | Unit+E2E (E2E falha) | Alto |
| Replacement bank | lab/case | reposicao e reconfeccao | `src/data/replacementBankRepo.ts` | local/supabase sync | Unit | Medio |
| Pacientes lista | `/app/patients` | listar/importar | `src/pages/PatientsPage.tsx` | Supabase | E2E RBAC (falha) | Medio |
| Paciente detalhe | `/app/patients/:id` | editar, vincular, docs | `src/pages/PatientDetailPage.tsx`, `src/repo/patientDocsRepo.ts` | Supabase + Storage | Nao direto | Alto |
| Documentos paciente | em paciente detalhe | upload/download/delete | `patientDocsRepo`, `storageRepo` | Supabase Storage / MS Drive | Nao direto | Alto |
| Dentistas lista | `/app/dentists` | listar/importar | `src/pages/DentistsPage.tsx` | Supabase | E2E smoke (falha) | Medio |
| Dentista detalhe | `/app/dentists/:id` | CRUD + soft delete | `src/pages/DentistDetailPage.tsx` | Supabase | Nao direto | Medio |
| Clinicas lista | `/app/clinics` | listar | `src/pages/ClinicsPage.tsx` | Supabase | Nao direto | Medio |
| Clinica detalhe | `/app/clinics/:id` | CRUD + soft delete | `src/pages/ClinicDetailPage.tsx` | Supabase | Nao direto | Medio |
| Settings usuarios | `/app/settings` | CRUD user/profile, reset, email acesso | `src/pages/SettingsPage.tsx`, `userRepo`, `profileRepo` | Supabase + edge func | E2E (falha) | Alto |
| Settings pricing/theme | `/app/settings` | precificacao, tema, auditoria | `src/pages/SettingsPage.tsx` | local/supabase | Nao direto | Medio |
| Diagnostico sistema | `/app/settings/diagnostics` | checks tecnicos | `src/pages/DiagnosticsPage.tsx`, `src/diagnostics/runDiagnostics.ts` | Supabase + ViaCEP | Unit (runner) | Medio |
| Migracao | `/app/settings/migration` | export/import DB | `src/pages/MigrationPage.tsx`, edge funcs `import-db/export-db` | Supabase funcs | Nao direto | Alto |
| RBAC | rotas protegidas | gate de permissao e escopo | `ProtectedRoute`, `permissions.ts`, `scope.ts` | Supabase profile/RLS | Unit+E2E (E2E falha) | Alto |
| Chat interno | widget | mensagens e lidos | `src/components/InternalChatWidget.tsx`, `internalChatRepo.ts` | Supabase realtime/db | Nao | Medio |
| Storage alternativo | upload/download | ms drive | `storageRepo.ts`, `ms-drive-storage` | Microsoft Graph | Nao | Alto |

---

## 4) FASE 2 - Diagnostico completo (checklist tecnico)

### 4.1 Comandos executados e resultado
| Comando | Status | Resumo |
|---|---|---|
| `npm ci` | PASS | instalacao limpa concluida; 20 vulnerabilidades reportadas |
| `npm run qa:diagnostics` | PASS | 12 pass / 0 warn / 0 fail |
| `npm run lint --silent` | WARN | 2 warnings hooks em `LabPage.tsx` |
| `npm run typecheck --silent` (concorrente) | FAIL | OOM (Zone Allocation failed) |
| `npm run typecheck --silent` (isolado) | PASS | sem erros TS |
| `npm run build` | PASS | build Vite + tsc ok |
| `npm run test -- --run` | PASS | 10 arquivos / 29 testes |
| `npm run test:e2e` | FAIL | 5/5 falharam no login |
| `npm audit --json` | FAIL | 20 vulnerabilidades (5C/11H/4M) |
| `supabase --version` | FAIL/BLOCKED | CLI nao instalada no ambiente |

### 4.2 PASS/WARN/FAIL consolidado
| Categoria | PASS | WARN | FAIL |
|---|---:|---:|---:|
| Estrutural (`qa:diagnostics`) | 12 | 0 | 0 |
| Qualidade estatica | 2 (typecheck isolado/build) | 1 (lint) | 1 (typecheck concorrente) |
| Testes automatizados | 1 (vitest) | 0 | 1 (e2e) |
| Seguranca dependencias | 0 | 0 | 1 |

### 4.3 Causa raiz principal dos fails E2E
- Evidencia de interface: `test-results/.../error-context.md` mostra mensagem `Supabase nao configurado.` no formulario de login.
- Fluxo de teste E2E usa seed local/localStorage (`e2e/helpers/auth.ts`, `seedDbAndStart`) e variaveis `VITE_DATA_MODE='local'` no `playwright.config.ts`.
- App esta hardcoded para Supabase: `src/data/dataMode.ts` define `DATA_MODE = 'supabase'`.
- Provider de auth e apenas Supabase (`src/auth/authProvider.ts`).
- Resultado: login sempre retorna para `/login`, quebrando todos os specs.

### 4.4 Env vars e defaults
- `.env.example` existe e cobre frontend essencial Supabase.
- `.env.production` versionado contem URL e anon key (chave publica), mas precisa governanca para evitar confusao com segredos.
- Funcoes edge exigem variaveis extras (`SERVICE_ROLE_KEY`, `SITE_URL`, etc.) nao executadas localmente nesta rodada por falta de Supabase CLI/stack local.

### 4.5 RLS e storage policies (validacao estatica)
- RLS habilitado nas tabelas principais (`0001_init.sql`, `0002_reference_target_schema.sql`, `0017_app_settings.sql`).
- Bucket `orthoscan` privado com policies de clinica (`0003_storage.sql`).
- Validacao efetiva em runtime (query real contra projeto/supabase local) **nao executada** nesta rodada por ausencia de CLI e credenciais de ambiente local completo.

### 4.6 Runtime checks comuns
- Risco de timezone detectado: uso recorrente de `toISOString().slice(0,10)` para datas de negocio.
- Risco de estado stale detectado por ESLint em hooks de `LabPage`.

---

## 5) FASE 3 - Plano e execucao de testes "em tudo"

## 5.1 Plano de testes por fluxo (100% mapeado)

### A. Caminho feliz
- Login master/dentist/lab/reception.
- CRUD clinica/dentista/paciente.
- Criar scan -> aprovar -> criar caso -> gerar OS -> mover no LAB -> entrega.
- Upload/download documento paciente.
- Convite onboarding e reset senha ponta-a-ponta.
- Export/import migracao.

### B. Borda/validacao
- Campos obrigatorios vazios e formatos invalidos (CPF/CNPJ/CRO/email/telefone).
- Upload >50MB e tipos proibidos.
- Planilha com colunas faltantes e duplicados.
- Mudancas de estado invalidas (salto de status LAB, entrega sem OS, instalacao sem entrega ao dentista).

### C. Permissao/RBAC
- Rotas protegidas por role.
- Escopo clinica/dentista em pacientes/scans/cases/lab.
- Niveis de escrita/exclusao por role.

### D. Rede/falhas externas
- Timeout/500 nas edge functions.
- Indisponibilidade storage (Supabase/MS Drive).
- ViaCEP indisponivel.

### E. Seguranca
- Tentativa de bypass de rota.
- Tentativa de acesso cross-clinic via IDs.
- Tentativa de uso indevido de edge function com token invalido.

## 5.2 O que foi executado de fato
- Unit/integration vitest: executado e aprovado (29 testes).
- E2E Playwright: executado integralmente (5 testes), todos falharam por causa raiz unica no login.
- Diagnostico custom: executado e aprovado.
- Security audit: executado e falhou com vulnerabilidades.

## 5.3 Cobertura por fluxo (executado x gap)
| Fluxo | Automatizado existente | Executado agora | Resultado | Gap |
|---|---|---|---|---|
| RBAC escopo | unit + e2e | sim | unit PASS / e2e FAIL | e2e bloqueado no login |
| Scan->Case->Lab | unit + e2e | sim | unit PASS / e2e FAIL | e2e bloqueado no login |
| Settings usuarios | e2e | sim | FAIL | e2e bloqueado no login |
| Diagnostico | unit + script | sim | PASS | sem gap imediato |
| DB migration local shape | unit | sim | PASS | sem gap imediato |
| Reset senha completo | parcial (sem e2e real) | nao ponta-a-ponta | N/A | falta teste integrado edge |
| Onboarding convite completo | parcial | nao ponta-a-ponta | N/A | falta teste integrado edge |
| Storage Supabase/MS Drive | parcial | nao ponta-a-ponta | N/A | falta suite integrada |
| Chat interno | sem automacao dedicada | nao | N/A | falta testes |

## 5.4 Reproducao de falhas principais
### Falha E2E login (reproduzivel)
1. Executar `npm run test:e2e`.
2. Observar falha em `e2e/helpers/auth.ts:36` (`toHaveURL(/\/app\/dashboard/)`).
3. Ver `test-results/*/error-context.md`: mensagem `Supabase nao configurado.` no login.

### Falha typecheck concorrente (intermitente por recurso)
1. Rodar `typecheck` em paralelo com outras tasks pesadas.
2. Ocasionalmente ocorre `FATAL ERROR: Zone Allocation failed - process out of memory`.

---

## 6) FASE 4 - Lista de problemas encontrados (ordenado por severidade)

### P-001
- Severidade: **Critico**
- Impacto: suite E2E inutilizada; regressao funcional nao detectada antes de release.
- Onde: `src/data/dataMode.ts`, `playwright.config.ts`, `e2e/helpers/auth.ts`, `src/auth/authProvider.ts`.
- Reproducao: `npm run test:e2e`.
- Causa provavel: divergencia entre arquitetura atual (Supabase-only) e setup de teste legado local.
- Correcao recomendada:
  - Opcao A: adaptar E2E para autenticar em Supabase de teste real/mocado.
  - Opcao B: restaurar provider local para modo teste (`authLocal`) e usar `VITE_DATA_MODE` dinamico.
- Esforco: M
- Dependencias: ambiente Supabase QA ou refatoracao auth provider.

### P-002
- Severidade: **Alto**
- Impacto: exposicao a CVEs (build chain e runtime libs), risco de supply chain.
- Onde: dependencias (`electron`, `electron-builder`, `xlsx`, `to-ico` chain, etc.).
- Reproducao: `npm audit --json`.
- Causa provavel: versoes antigas e dependencias deprecadas transitivas.
- Correcao recomendada:
  - atualizar `electron`/`electron-builder` para faixas seguras.
  - revisar substituicao de `to-ico` (cadeia `request/jimp/minimist`).
  - avaliar mitigacao para `xlsx` (fork seguro/lib alternativa/sandbox parsing).
- Esforco: G
- Dependencias: testes de regressao desktop/build.

### P-003
- Severidade: **Alto**
- Impacto: possivel ampliacao de superficie de ataque em edge functions com `verify_jwt=false`.
- Onde: `supabase/config.toml` (`functions.invite-user`, `functions.ms-drive-storage`).
- Reproducao: analise estatica.
- Causa provavel: workaround para JWT ES256 no gateway.
- Correcao recomendada:
  - manter validacao manual robusta + hardening adicional (nonce, origem, rate-limit por IP/actor, auditoria reforcada).
  - reavaliar estrategia para voltar `verify_jwt=true` quando possivel.
- Esforco: M
- Dependencias: constraints do Supabase gateway/projeto.

### P-004
- Severidade: **Alto**
- Impacto: fluxo critico (onboarding/reset/import/export/storage) sem teste automatizado ponta-a-ponta.
- Onde: `supabase/functions/*` + repos `onboardingRepo`, `accessRepo`, `storageRepo`, `MigrationPage`.
- Reproducao: gap de cobertura.
- Causa provavel: ausencia de ambiente Supabase de teste e fixtures dedicadas.
- Correcao recomendada: criar suite integration (supabase test project + seed + playwright/api tests).
- Esforco: G
- Dependencias: provisionamento ambiente QA.

### P-005
- Severidade: **Medio**
- Impacto: instabilidade de pipeline local/CI sob concorrencia.
- Onde: execucao de typecheck em paralelo.
- Reproducao: rodar `typecheck` com outras tasks pesadas.
- Causa provavel: limite de memoria do node/processo.
- Correcao recomendada: serializar etapas pesadas no CI ou usar `NODE_OPTIONS=--max-old-space-size=4096`.
- Esforco: P
- Dependencias: configuracao CI.

### P-006
- Severidade: **Medio**
- Impacto: risco de comportamento inconsistente em automacao do LAB.
- Onde: `src/pages/LabPage.tsx` (warnings hooks deps linhas ~376 e ~465).
- Reproducao: `npm run lint --silent`.
- Causa provavel: dependencias incompletas/excedentes em `useEffect`.
- Correcao recomendada: ajustar deps arrays e validar efeitos colaterais.
- Esforco: P
- Dependencias: testes de regressao em Lab.

### P-007
- Severidade: **Medio**
- Impacto: possiveis erros de data por timezone (dia anterior/seguinte).
- Onde: multiplos arquivos com `toISOString().slice(0,10)`.
- Reproducao: usuarios em timezone negativo e operacoes perto de meia-noite.
- Causa provavel: uso de data UTC para logica de negocio local.
- Correcao recomendada: normalizar datas locais (`Intl`, util de data local) e centralizar helper.
- Esforco: M
- Dependencias: ajuste em dados historicos/formatacao.

### P-008
- Severidade: **Medio**
- Impacto: inconsistencias operacionais e onboarding tecnico confuso.
- Onde: `README.md` ainda cita modo local; app esta Supabase-only.
- Reproducao: analise estatica.
- Causa provavel: documentacao desatualizada apos mudanca arquitetural.
- Correcao recomendada: atualizar README e estrategia oficial de testes locais.
- Esforco: P
- Dependencias: decisao de arquitetura de teste.

### P-009
- Severidade: **Baixo/Medio**
- Impacto: ruído em docs e risco de interpretacao errada.
- Onde: `supabase/README.md` com encoding quebrado (mojibake).
- Reproducao: leitura do arquivo.
- Causa provavel: problema de encoding em commit anterior.
- Correcao recomendada: normalizar para UTF-8 e revisar texto.
- Esforco: P
- Dependencias: nenhuma.

### P-010
- Severidade: **Baixo**
- Impacto: performance de carga inicial em redes lentas.
- Onde: build output (`assets/index*.js ~463KB`, `xlsx ~424KB`).
- Reproducao: `npm run build`.
- Causa provavel: bibliotecas pesadas no bundle principal.
- Correcao recomendada: code splitting mais agressivo, lazy import de XLSX e modulos administrativos.
- Esforco: M
- Dependencias: analise de chunks/rotas.

---

## 7) Recomendacoes de melhoria (arquitetura, DX, performance, seguranca)

### Arquitetura
- Separar claramente `runtime mode` (prod) de `test mode` para nao quebrar suites E2E.
- Introduzir `AuthProvider` selecionavel por env em testes.
- Isolar camada Supabase em gateway interno para facilitar mock/integration tests.

### DX/QA
- Criar pipeline CI em estagios:
  1) lint+typecheck (serial)
  2) unit
  3) integration supabase sandbox
  4) e2e.
- Publicar matriz de cobertura por fluxo como artefato CI.

### Seguranca
- Tratar backlog de CVEs como iniciativa prioritaria.
- Revisar funcoes com `verify_jwt=false` e ampliar controles compensatorios.
- Revisar politica de versionamento de `.env.production`.

### Performance
- Lazy-load de `xlsx` apenas no fluxo de export/import.
- Revisao de queries repetidas com `useSupabaseSyncTick` para reduzir polling e renderizacao.

---

## 8) Plano de acao priorizado

### Sprint 1 (estabilidade e bloqueadores)
- [ ] Corrigir incompatibilidade E2E x Supabase-only (P-001).
- [ ] Fechar warnings de hooks em LabPage (P-006).
- [ ] Definir execucao serial/heap para typecheck em CI (P-005).
- [ ] Atualizar README para arquitetura real (P-008).

### Sprint 2 (seguranca e cobertura critica)
- [ ] Plano de upgrade dependencias criticas (P-002).
- [ ] Suite integrada para edge functions essenciais (P-004).
- [ ] Hardening de funcoes `verify_jwt=false` (P-003).

### Sprint 3 (confiabilidade e performance)
- [ ] Refatoracao de datas para timezone-safe (P-007).
- [ ] Otimizacao de bundle e lazy imports (P-010).
- [ ] Cobertura de chat/storage alternativo em testes automatizados.

---

## 9) Anexos

### 9.1 Evidencias principais
- Diagnostico: `reports/diagnostics.json`
- Relatorio QA consolidado: `reports/qa-report.md`
- Playwright JSON: `reports/playwright-results.json`
- Playwright HTML: `reports/playwright-html/index.html`
- Falha login E2E (snapshot): `test-results/routes.smoke-smoke-routes-for-master-admin-chromium/error-context.md`

### 9.2 Comandos executados
- `npm ci`
- `npm run qa:diagnostics`
- `npm run lint --silent`
- `npm run typecheck --silent`
- `npm run build`
- `npm run test -- --run`
- `npm run test:e2e`
- `npm audit --json`
- `node ./scripts/makeReport.mjs`
- `supabase --version`

### 9.3 Limites desta rodada
- Nao foi possivel validar edge functions com Supabase local ativo (CLI nao instalada).
- Nao houve alteracao em codigo de producao nesta rodada; foco em diagnostico e evidencias.
- Worktree ja possuia alteracoes previas em `src/pages/CaseDetailPage.tsx` e `src/pages/DashboardPage.tsx`.
