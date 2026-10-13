/**
 * Dayflow — cálculo de janelas livres.
 *
 * Funções puras, sem React e sem acesso a localStorage: recebem dados,
 * devolvem dados. Isso deixa a regra testável e reaproveitável nas
 * próximas etapas (gerador de plano, sugestões de estudo etc.).
 *
 * Convenções:
 * - Horários de entrada são strings "HH:MM" (24h).
 * - Internamente tudo vira "minutos desde a meia-noite do dia" (number).
 * - Um dia vai de `wake` (acordar) até `sleep` (dormir). Se `sleep` for
 *   menor ou igual a `wake`, entende-se que é depois da meia-noite
 *   (ex.: acordar 07:30, dormir 00:30 → fim do dia = 24h30 = 1470 min).
 * - Um bloco cujo `end` é menor ou igual ao `start` atravessa a
 *   meia-noite (ex.: 23:00–01:00).
 */

export const MINUTES_PER_DAY = 24 * 60

/** "07:30" → 450. Lança erro se o formato for inválido. */
export function toMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? '').trim())
  if (!match) throw new Error(`Horário inválido: "${hhmm}"`)
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) throw new Error(`Horário inválido: "${hhmm}"`)
  return h * 60 + m
}

/** 450 → "07:30". Valores ≥ 24h voltam para o relógio (1470 → "00:30"). */
export function fromMinutes(total) {
  const t = ((Math.round(total) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 200 → "3h 20min", 45 → "45min", 120 → "2h", 0 → "0min". */
export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/** Limites do dia em minutos: { start, end }, com `end` > `start`. */
export function dayBounds(wake, sleep) {
  const start = toMinutes(wake)
  let end = toMinutes(sleep)
  if (end <= start) end += MINUTES_PER_DAY
  return { start, end }
}

/**
 * Converte um bloco "HH:MM–HH:MM" em intervalo de minutos.
 * Se o fim for menor que o início, o bloco termina no dia seguinte.
 * Início igual ao fim = duração zero (não ocupa tempo). Antes isso virava
 * um bloco de 24h e zerava o tempo livre do dia.
 */
export function blockToInterval(block) {
  const start = toMinutes(block.start)
  let end = toMinutes(block.end)
  if (end < start) end += MINUTES_PER_DAY
  return { start, end }
}

/**
 * Ordena e junta intervalos que se sobrepõem ou se encostam.
 * [{0,10},{5,20},{20,30},{40,50}] → [{0,30},{40,50}]
 * Não altera o array recebido.
 */
export function mergeIntervals(intervals) {
  const sorted = intervals
    .filter((i) => i.end > i.start)
    .map((i) => ({ start: i.start, end: i.end }))
    .sort((a, b) => a.start - b.start)

  const merged = []
  for (const cur of sorted) {
    const last = merged[merged.length - 1]
    if (last && cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end)
    } else {
      merged.push(cur)
    }
  }
  return merged
}

/** Recorta um intervalo aos limites [min, max]. Devolve null se ficar vazio. */
export function clipInterval(interval, min, max) {
  const start = Math.max(interval.start, min)
  const end = Math.min(interval.end, max)
  return end > start ? { start, end } : null
}

/**
 * Complemento: os buracos entre os intervalos ocupados dentro de [min, max].
 * Espera `busy` já ordenado e sem sobreposição (saída de mergeIntervals).
 */
export function gapsBetween(busy, min, max) {
  const gaps = []
  let cursor = min
  for (const b of busy) {
    if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, max) })
    cursor = Math.max(cursor, b.end)
    if (cursor >= max) break
  }
  if (cursor < max) gaps.push({ start: cursor, end: max })
  return gaps.filter((g) => g.end > g.start)
}

/**
 * Calcula o deslocamento até em casa: do fim do último bloco fixo até
 * `homeArrival`. Só existe se houver bloco fixo e se a chegada for depois
 * do fim desse bloco. Chegada antes do `wake` conta como pós-meia-noite.
 */
export function transitInterval(fixedIntervals, homeArrival, dayStart) {
  if (!homeArrival || fixedIntervals.length === 0) return null
  const lastEnd = Math.max(...fixedIntervals.map((i) => i.end))
  let arrival = toMinutes(homeArrival)
  if (arrival < dayStart) arrival += MINUTES_PER_DAY
  return arrival > lastEnd ? { start: lastEnd, end: arrival } : null
}

/**
 * Pares de blocos FIXOS que se sobrepõem — útil para avisar o usuário.
 * Devolve [[blocoA, blocoB], ...].
 */
export function findOverlaps(blocks) {
  const fixed = blocks.filter((b) => b.kind === 'fixed')
  const pairs = []
  for (let i = 0; i < fixed.length; i++) {
    for (let j = i + 1; j < fixed.length; j++) {
      const a = blockToInterval(fixed[i])
      const b = blockToInterval(fixed[j])
      if (a.start < b.end && b.start < a.end) pairs.push([fixed[i], fixed[j]])
    }
  }
  return pairs
}

/**
 * Problemas por bloco, para avisar no editor sem bloquear a edição.
 * Devolve { [blockId]: [{ code, message }] } só para blocos com aviso.
 *
 * - zero:      início igual ao fim (não conta)
 * - overnight: termina no dia seguinte (pode ser intencional, ex.: plantão)
 * - outside:   fica totalmente fora do período acordado (não conta)
 * - partial:   parte do bloco fica fora do período acordado
 */
export function findBlockIssues(day) {
  const { start: dayStart, end: dayEnd } = dayBounds(day.wake, day.sleep)
  const issues = {}
  for (const b of day.blocks ?? []) {
    const list = []
    const i = blockToInterval(b)
    if (i.end === i.start) {
      list.push({ code: 'zero', message: 'Início e fim iguais: o bloco não conta.' })
    } else {
      if (i.end > MINUTES_PER_DAY) list.push({ code: 'overnight', message: 'Termina no dia seguinte.' })
      const clipped = clipInterval(i, dayStart, dayEnd)
      if (!clipped) list.push({ code: 'outside', message: 'Fora do horário acordado: não conta.' })
      else if (clipped.end - clipped.start < i.end - i.start) {
        list.push({ code: 'partial', message: 'Parte do bloco fica fora do horário acordado.' })
      }
    }
    if (list.length) issues[b.id] = list
  }
  return issues
}

/**
 * Função principal: janelas livres de um dia.
 *
 * @param {object} day
 * @param {string} day.wake        horário de acordar ("07:30")
 * @param {string} day.sleep       horário de dormir ("23:30")
 * @param {string|null} [day.homeArrival] chegada em casa; cria um trecho de deslocamento
 * @param {Array}  day.blocks      [{ id, name, start, end, color, kind: 'fixed'|'free' }]
 * @param {object} [options]
 * @param {number} [options.minMinutes=15] janelas menores que isso são ignoradas
 *
 * Regras:
 * 1. Só blocos `fixed` ocupam tempo. Blocos `free` são rótulos de intenção
 *    ("Estudos", "Projeto") e apenas nomeiam a janela em que caem.
 * 2. O deslocamento (fim do último fixo → chegada em casa) também ocupa tempo.
 * 3. Ocupados são juntados e recortados ao dia [wake, sleep]; o que sobra
 *    são as janelas livres.
 * 4. A janela que começa no fim do último bloco fixo (ou na chegada em
 *    casa) e vai até a hora de dormir é marcada `afterLastFixed: true`.
 *
 * @returns {{
 *   dayStart: number, dayEnd: number,
 *   busy: Array<{start:number,end:number}>,
 *   transit: {start:number,end:number}|null,
 *   windows: Array<{start:number,end:number,minutes:number,startLabel:string,
 *                   endLabel:string,afterLastFixed:boolean,label:string|null,color:string|null}>,
 *   totalFreeMinutes: number
 * }}
 */
export function computeFreeWindows(day, options = {}) {
  const minMinutes = options.minMinutes ?? 15
  const { start: dayStart, end: dayEnd } = dayBounds(day.wake, day.sleep)
  const blocks = day.blocks ?? []

  const fixed = blocks.filter((b) => b.kind === 'fixed').map(blockToInterval)
  const transit = transitInterval(fixed, day.homeArrival, dayStart)

  const busy = mergeIntervals(transit ? [...fixed, transit] : fixed)
    .map((i) => clipInterval(i, dayStart, dayEnd))
    .filter(Boolean)

  // Fim do último compromisso (bloco fixo ou deslocamento) dentro do dia.
  const lastBusyEnd = busy.length ? busy[busy.length - 1].end : null

  const freeLabels = blocks.filter((b) => b.kind === 'free').map((b) => ({ ...b, ...blockToInterval(b) }))

  const windows = gapsBetween(busy, dayStart, dayEnd)
    .filter((g) => g.end - g.start >= minMinutes)
    .map((g) => {
      const tag = freeLabels.find((f) => f.start < g.end && g.start < f.end) ?? null
      return {
        start: g.start,
        end: g.end,
        minutes: g.end - g.start,
        startLabel: fromMinutes(g.start),
        endLabel: fromMinutes(g.end),
        afterLastFixed: lastBusyEnd !== null && g.start >= lastBusyEnd,
        label: tag?.name ?? null,
        color: tag?.color ?? null,
      }
    })

  return {
    dayStart,
    dayEnd,
    busy,
    transit,
    windows,
    totalFreeMinutes: windows.reduce((sum, w) => sum + w.minutes, 0),
  }
}

/**
 * Monta a linha do tempo para exibição: blocos fixos (como cadastrados),
 * o deslocamento e as janelas livres, tudo ordenado por início.
 * Cada item: { type: 'fixed'|'transit'|'free', start, end, ... }.
 */
export function buildTimeline(day, options = {}) {
  const result = computeFreeWindows(day, options)
  const items = []

  for (const b of day.blocks ?? []) {
    if (b.kind !== 'fixed') continue
    const clipped = clipInterval(blockToInterval(b), result.dayStart, result.dayEnd)
    if (clipped) items.push({ type: 'fixed', ...clipped, block: b })
  }
  if (result.transit) {
    const clipped = clipInterval(result.transit, result.dayStart, result.dayEnd)
    if (clipped) items.push({ type: 'transit', ...clipped })
  }
  for (const w of result.windows) items.push({ type: 'free', ...w })

  items.sort((a, b) => a.start - b.start || a.end - b.end)
  return { ...result, items }
}
