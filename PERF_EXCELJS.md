# Performance Optimization: ExcelJS Lazy Load

## 1) Onde `exceljs` entrava antes

Estado inicial desta tarefa (antes da otimização):

- `src/pages/SettingsPage.tsx` tinha import estatico de `exceljs` no topo do arquivo.
- `src/lib/spreadsheetImport.ts` tinha import estatico de `exceljs` no topo do arquivo.

Isso colocava a dependencia no grafo estatico dos modulos dessas telas/fluxos.

## 2) Mudancas aplicadas

### 2.1 Wrapper com cache para import dinamico

Arquivo novo: [src/lib/loadExcelJS.ts](D:/dev/ortho-scan/src/lib/loadExcelJS.ts)

```ts
let excelJsModule: ExcelJSModule | null = null
let excelJsLoadPromise: Promise<ExcelJSModule> | null = null

export async function loadExcelJS() {
  if (excelJsModule) return excelJsModule
  if (!excelJsLoadPromise) {
    excelJsLoadPromise = import('exceljs').then(...)
  }
  return excelJsLoadPromise
}
```

### 2.2 Exportacao: carregar `exceljs` so no clique

Arquivo: [src/pages/SettingsPage.tsx](D:/dev/ortho-scan/src/pages/SettingsPage.tsx)

- Removido import estatico.
- Adicionado `await loadExcelJS()` dentro de `exportReport`.
- Adicionado estado de UX durante carga:
  - botao desabilitado durante preparo
  - label temporario: `Preparando exportacao...`
- Tratamento de erro amigavel:
  - toast: `Falha ao preparar exportacao. Tente novamente.`

Pontos principais:
- `loadExcelJS` importado em `SettingsPage` (linha 39)
- `exportingReport` (linha 259)
- lazy-load no `exportReport` (linha 794)
- botao com disable + label temporario (linha 1242)

### 2.3 Importacao de planilha: lazy-load no momento de leitura `.xlsx`

Arquivo: [src/lib/spreadsheetImport.ts](D:/dev/ortho-scan/src/lib/spreadsheetImport.ts)

- Removido import estatico de `exceljs`.
- Leitura `.xlsx` agora chama `const ExcelJS = await loadExcelJS()`.

### 2.4 Erro controlado no fluxo de importacao

Arquivos:
- [src/pages/PatientsPage.tsx](D:/dev/ortho-scan/src/pages/PatientsPage.tsx)
- [src/pages/DentistsPage.tsx](D:/dev/ortho-scan/src/pages/DentistsPage.tsx)

`handleImportFile` agora possui `try/catch` e mensagem amigavel se a carga falhar.

## 3) Resultado de build (antes/depois)

### Antes (baseline do problema)

- Aviso de chunk grande causado por `exceljs`.
- `exceljs` era importado de forma esttica nos modulos de export/import.

### Depois (build executado apos a mudanca)

Comando: `npm run build --silent`

- Chunk principal (`index`): `486.17 kB` (gzip `144.30 kB`)
- Chunk de `exceljs`: `exceljs.min-*.js` com `936.99 kB` (gzip `270.75 kB`)
- Novo chunk de loader: `loadExcelJS-*.js` com `0.52 kB`

Observacao:
- O warning de chunk grande ainda aparece, mas agora concentrado no chunk assincrono de `exceljs`.
- O caminho inicial fica sem carregar `exceljs` diretamente; a biblioteca so e buscada quando o usuario aciona export/import `.xlsx`.

## 4) Confirmacao de isolamento

- Busca de referencias no source mostra uso apenas via `loadExcelJS`:
  - [src/lib/loadExcelJS.ts](D:/dev/ortho-scan/src/lib/loadExcelJS.ts)
  - [src/pages/SettingsPage.tsx](D:/dev/ortho-scan/src/pages/SettingsPage.tsx)
  - [src/lib/spreadsheetImport.ts](D:/dev/ortho-scan/src/lib/spreadsheetImport.ts)
- Nao ha import estatico de `exceljs` nas paginas.

## 5) Validacoes executadas

- `npm run lint --silent` -> PASS
- `npm run typecheck --silent` -> PASS
- `npm run build --silent` -> PASS
- `npm run test -- --run` -> PASS (`11` arquivos, `30` testes)
- `npm run test:e2e` -> PASS (`5/5`)

Teste adicional criado:
- [src/tests/lib/loadExcelJS.test.ts](D:/dev/ortho-scan/src/tests/lib/loadExcelJS.test.ts)
  - valida carga do modulo
  - valida cache/reuso na segunda chamada

## 6) Impacto esperado

- Melhora de performance percebida no carregamento inicial, porque `exceljs` nao entra no caminho principal de execucao da pagina.
- Custo da lib transferido para o momento de uso real da funcionalidade de export/import `.xlsx`.
- Segunda exportacao/import tende a ser mais rapida no runtime por cache do loader em memoria.

## 7) Riscos e observacoes

- O warning de chunk grande continua devido ao tamanho intrinseco do bundle de `exceljs` (agora assincrono).
- Se o objetivo for eliminar completamente esse warning, sera necessario trocar a estrategia/biblioteca de XLSX (trade-off de compatibilidade) ou mover a implementacao para backend.
