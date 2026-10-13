# Dayflow

Planejador pessoal de rotina. **Etapa 1:** rotina semanal + cálculo das janelas livres.

[![CI](https://github.com/joaog/dayflow/actions/workflows/ci.yml/badge.svg)](https://github.com/joaog/dayflow/actions/workflows/ci.yml)
[![Deploy](https://github.com/joaog/dayflow/actions/workflows/deploy.yml/badge.svg)](https://github.com/joaog/dayflow/actions/workflows/deploy.yml)

## Demo

🔗 **https://joaog.github.io/dayflow/**

## Rodar localmente

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes (Vitest)
npm run build    # gera dist/
npm run preview  # serve dist/ localmente
```

## Telas

| Aba | Hash | Descrição |
|-----|------|-----------|
| **Hoje** | `#hoje` | Linha do tempo do dia, janelas livres destacadas, total livre, marcador de "agora" e botão para ajustar só aquele dia |
| **Semana** | `#semana` | Grade segunda→domingo com blocos coloridos e o tempo livre de cada dia. Toque no dia para abrir em "Hoje" |
| **Rotina** | `#rotina` | Editor do padrão semanal (blocos, acordar, chegada em casa, dormir) e "copiar para outros dias". O mesmo editor é usado no ajuste pontual de uma data |
| **Dados** | `#dados` | Exportar/importar JSON, janela mínima, lista de dias ajustados, restaurar exemplo |

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        App.jsx                                │
│  Estado global (state) + navegação por hash + tema            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Views/      │    │   Views/      │    │   Views/      │
│ TodayView     │    │ WeekView      │    │ RoutineView   │
│ DataView      │    │               │    │               │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      lib/ (funções puras)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │freeWindows.js│  │ schedule.js  │  │ storage.js   │       │
│  │ Cálculo      │  │ Datas,       │  │ localStorage │       │
│  │ janelas livres│  │ overrides,   │  │ + import/    │       │
│  │ buildTimeline│  │ validação    │  │ export       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de dados

1. **App** carrega estado do `localStorage` via `storage.loadState()`
2. **Views** recebem `state` + callbacks (`setState`, `setDate`, etc.)
3. **Cálculos** usam `freeWindows.computeFreeWindows()` / `buildTimeline()` — funções puras, testáveis
4. **Persistência**: `storage.saveState()` chamado via `useEffect` no App

## API das bibliotecas (lib/)

### `freeWindows.js` — Cálculo de janelas livres

Todas as funções são puras (sem I/O, sem React).

```js
import {
  toMinutes,           // "07:30" → 450
  fromMinutes,         // 450 → "07:30"
  formatDuration,      // 200 → "3h 20min"
  dayBounds,           // { wake, sleep } → { start, end } em minutos
  blockToInterval,     // bloco → { start, end } normalizado
  mergeIntervals,      // junta intervalos sobrepostos
  clipInterval,        // recorta a [min, max]
  gapsBetween,         // buracos entre intervalos ocupados
  transitInterval,     // deslocamento fim-do-último-fixo → chegada
  findOverlaps,        // pares de blocos fixos que se sobrepõem
  computeFreeWindows,  // função principal
  buildTimeline        // timeline para exibição
} from './lib/freeWindows.js'
```

#### `computeFreeWindows(day, options?)`

```js
const day = {
  wake: '07:30',
  sleep: '23:30',
  homeArrival: '21:50',      // opcional
  blocks: [
    { id: '1', name: 'Trabalho', start: '07:30', end: '11:30', color: '#3b82f6', kind: 'fixed' },
    { id: '2', name: 'Estudos', start: '21:50', end: '23:30', color: '#10b981', kind: 'free' }
  ]
}

const result = computeFreeWindows(day, { minMinutes: 15 })
```

**Retorna:**

```ts
{
  dayStart: number,           // wake em minutos
  dayEnd: number,             // sleep em minutos (pode ser > 1440)
  busy: Array<{start, end}>,  // intervalos ocupados (fixos + deslocamento)
  transit: {start, end} | null,
  windows: Array<{
    start: number,
    end: number,
    minutes: number,
    startLabel: string,       // "HH:MM"
    endLabel: string,
    afterLastFixed: boolean,  // true para janela após último compromisso
    label: string | null,     // nome do bloco 'free' que cobre
    color: string | null
  }>,
  totalFreeMinutes: number
}
```

#### `buildTimeline(day, options?)`

Igual a `computeFreeWindows` mas adiciona `items` ordenados para renderização:

```ts
items: Array<{
  type: 'fixed' | 'transit' | 'free',
  start: number,
  end: number,
  // fixed: { block: {...} }
  // free:  { minutes, startLabel, endLabel, afterLastFixed, label, color }
}>
```

### `schedule.js` — Datas, overrides, validação

```js
import {
  toISODate,           // Date → "2026-10-12"
  parseISODate,        // "2026-10-12" → Date (meia-noite local)
  addDays,             // "2026-10-12", 3 → "2026-10-15"
  weekdayOf,           // "2026-10-12" → 1 (segunda)
  weekDates,           // "2026-10-12" → ["2026-10-05", ..., "2026-10-11"]
  resolveDay,          // (state, iso) → { day, isOverride, weekday }
  cloneDay,            // deep copy
  setWeekday,          // (state, weekday, day) → newState
  setOverride,         // (state, iso, day) → newState
  clearOverride,       // (state, iso) → newState
  copyWeekday,         // (state, from, targets[]) → newState
  sortBlocks,          // blocks[] → blocks[] ordenados por horário
  newId,               // gera ID único
  validateState        // valida import JSON
} from './lib/schedule.js'
```

#### `validateState(input)`

```js
const { ok, state, error } = validateState(jsonObject)
if (!ok) console.error(error)
```

Valida: `version === 1`, `week[0..6]` com wake/sleep/blocks, `overrides` com datas ISO, `settings.minWindowMinutes` e `theme`.

### `storage.js` — Persistência

```js
import { loadState, saveState, exportJSON, importJSON } from './lib/storage.js'

const state = loadState()                    // carrega ou cria default
saveState(state)                             // salva no localStorage
exportJSON(state)                            // baixa arquivo .json
const { ok, state, error } = await importJSON(file)  // File → estado validado
```

### `defaultData.js` — Rotina de exemplo

```js
import { createDefaultState, COLORS } from './lib/defaultData.js'

const state = createDefaultState()
// { version: 1, week: {0..6}, overrides: {}, settings: {minWindowMinutes: 15, theme: 'dark'} }

COLORS.trabalho  // '#3b82f6'
COLORS.almoco    // '#f59e0b'
COLORS.academia  // '#f43f5e'
COLORS.faculdade // '#8b5cf6'
COLORS.livre     // '#10b981'
```

## Regras do cálculo

1. O dia vai de **acordar** até **dormir** (dormir depois da meia-noite é aceito: `07:30` → `00:30` = 17h)
2. Só blocos **fixos** ocupam tempo. Blocos **livres** apenas dão nome à janela onde caem
3. **Chegada em casa** (por dia) cria um trecho de deslocamento entre o fim do último bloco fixo e a chegada
4. Blocos sobrepostos são juntados (o tempo não conta duas vezes) e há aviso no editor
5. Janelas menores que a **janela mínima** (padrão 15 min, configurável em Dados) são ignoradas
6. A janela entre o último compromisso e a hora de dormir vem marcada com `afterLastFixed: true`

**Limitação conhecida:** um bloco que *começa* depois da meia-noite (ex.: `00:15`) é lido como madrugada do mesmo dia, antes de acordar, e é descartado.

## Formato dos dados (JSON)

```json
{
  "version": 1,
  "week": {
    "0": { "wake": "08:30", "sleep": "23:30", "homeArrival": null, "blocks": [] },
    "1": { "wake": "07:30", "sleep": "23:30", "homeArrival": "21:50", "blocks": [...] }
  },
  "overrides": {
    "2026-10-15": { "wake": "09:00", "sleep": "23:00", "homeArrival": null, "blocks": [...] }
  },
  "settings": { "minWindowMinutes": 15, "theme": "dark" }
}
```

- `week`: chaves `0` (domingo) a `6` (sábado)
- `overrides`: chaves são datas ISO (`YYYY-MM-DD`)
- `blocks`: cada bloco tem `id`, `name`, `start` (HH:MM), `end` (HH:MM), `color` (#RRGGBB), `kind` (`fixed` | `free`)

## Testes

```bash
npm test           # roda tudo
npm run test:watch # modo watch
```

- `freeWindows.test.js`: 19 testes (cálculo, merge, gaps, transit, overlaps, edge cases)
- `schedule.test.js`: 7 testes (datas, resolveDay, copyWeekday, validação)
- `views.test.js`: 3 testes de integração (render sem crash)

## Contribuindo

### Pré-requisitos

- Node.js 18+
- npm

### Desenvolvimento

```bash
git clone https://github.com/joaog/dayflow.git
cd dayflow
npm install
npm run dev
```

### Padrões de código

- **ESM** (`"type": "module"` no package.json)
- **Funções puras** em `lib/` — sem side effects, fáceis de testar
- **Componentes** em `views/` e `components/` — React funcional com hooks
- **Estilos**: Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Testes**: Vitest + `@testing-library/react`

### Pull Requests

1. Fork + branch descritiva (`feat/...`, `fix/...`, `docs/...`)
2. `npm test` e `npm run build` devem passar
3. Commits claros (`feat: adiciona exportação CSV`, `fix: corrige cálculo meia-noite`)
4. PR com descrição do que mudou e por quê

### Ideias para contribuir

- [ ] Exportar/importar CSV
- [ ] Notificações de janelas livres
- [ ] Modo "foco" com timer Pomodoro nas janelas
- [ ] Sincronização via GitHub Gist / Firebase
- [ ] PWA (service worker + manifest)
- [ ] Temas customizados
- [ ] Tradução EN/ES

## Deploy (GitHub Pages)

O deploy é automático via GitHub Actions no push para `main`:

1. Build com `vite build` → gera `dist/`
2. Deploy do conteúdo de `dist/` para `gh-pages`
3. Disponível em `https://joaog.github.io/dayflow/`

Configuração em `.github/workflows/deploy.yml`.

## Licença

MIT — use, modifique, distribua livremente.
