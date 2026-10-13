/**
 * Dayflow — regras do calendário (funções puras).
 * Decide qual configuração vale para uma data (padrão da semana ou ajuste
 * pontual) e valida dados importados.
 */
import { toMinutes } from './freeWindows.js'

export const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
/** Ordem de exibição: semana começando na segunda. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Date → "2026-10-12" (no fuso local, não UTC). */
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "2026-10-12" → Date à meia-noite local. */
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, n) {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + n)
  return toISODate(date)
}

export function weekdayOf(iso) {
  return parseISODate(iso).getDay()
}

/** Datas (ISO) da semana segunda→domingo que contém `iso`. */
export function weekDates(iso) {
  const wd = weekdayOf(iso)
  const monday = addDays(iso, wd === 0 ? -6 : 1 - wd)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/**
 * Configuração efetiva de uma data: o ajuste pontual, se existir;
 * senão, o padrão do dia da semana.
 */
export function resolveDay(state, iso) {
  const weekday = weekdayOf(iso)
  const override = state.overrides?.[iso]
  return override
    ? { day: override, isOverride: true, weekday }
    : { day: state.week[weekday], isOverride: false, weekday }
}

/** Cópia profunda simples de um dia (dados JSON puros). */
export function cloneDay(day) {
  return JSON.parse(JSON.stringify(day))
}

export function setWeekday(state, weekday, day) {
  return { ...state, week: { ...state.week, [weekday]: day } }
}

export function setOverride(state, iso, day) {
  return { ...state, overrides: { ...state.overrides, [iso]: day } }
}

export function clearOverride(state, iso) {
  const overrides = { ...state.overrides }
  delete overrides[iso]
  return { ...state, overrides }
}

/** Copia o dia `from` para os dias `targets`, gerando ids novos para os blocos. */
export function copyWeekday(state, from, targets) {
  const week = { ...state.week }
  for (const wd of targets) {
    if (wd === from) continue
    const copy = cloneDay(state.week[from])
    copy.blocks = copy.blocks.map((b) => ({ ...b, id: newId() }))
    week[wd] = copy
  }
  return { ...state, week }
}

export function sortBlocks(blocks) {
  return [...blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Validação de import
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

/**
 * Limites de segurança: um arquivo importado (ou um localStorage adulterado)
 * não pode travar a tela com milhares de blocos ou textos gigantes.
 */
export const LIMITS = {
  blocksPerDay: 48,
  overrides: 1000,
  nameLength: 60,
}

/** Remove caracteres de controle e corta no tamanho máximo. */
export function cleanName(value) {
  // eslint-disable-next-line no-control-regex
  const name = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return name.slice(0, LIMITS.nameLength) || 'Sem nome'
}

function isRealDate(iso) {
  if (!ISO_DATE.test(iso)) return false
  return toISODate(parseISODate(iso)) === iso // rejeita 2026-02-31
}

function isTime(v) {
  try {
    toMinutes(v)
    return true
  } catch {
    return false
  }
}

function validateDay(day, where) {
  if (!day || typeof day !== 'object') throw new Error(`${where}: dia ausente`)
  if (!isTime(day.wake)) throw new Error(`${where}: "wake" inválido`)
  if (!isTime(day.sleep)) throw new Error(`${where}: "sleep" inválido`)
  if (day.homeArrival != null && day.homeArrival !== '' && !isTime(day.homeArrival)) {
    throw new Error(`${where}: "homeArrival" inválido`)
  }
  if (!Array.isArray(day.blocks)) throw new Error(`${where}: "blocks" deve ser uma lista`)
  return {
    wake: day.wake,
    sleep: day.sleep,
    homeArrival: day.homeArrival || null,
    blocks: day.blocks.map((b, i) => {
      const at = `${where}, bloco ${i + 1}`
      if (!isTime(b.start) || !isTime(b.end)) throw new Error(`${at}: horário inválido`)
      if (b.kind !== 'fixed' && b.kind !== 'free') throw new Error(`${at}: tipo deve ser "fixed" ou "free"`)
      return {
        id: typeof b.id === 'string' && b.id ? b.id : newId(),
        name: String(b.name ?? 'Sem nome'),
        start: b.start,
        end: b.end,
        color: HEX_COLOR.test(b.color) ? b.color : '#64748b',
        kind: b.kind,
      }
    }),
  }
}

/**
 * Valida e normaliza um objeto importado.
 * @returns {{ ok: true, state: object } | { ok: false, error: string }}
 */
export function validateState(input) {
  try {
    if (!input || typeof input !== 'object') throw new Error('Arquivo vazio ou não é um objeto JSON')
    if (input.version !== 1) throw new Error('Versão de dados não suportada')
    if (!input.week || typeof input.week !== 'object') throw new Error('Campo "week" ausente')

    const week = {}
    for (let wd = 0; wd < 7; wd++) week[wd] = validateDay(input.week[wd], WEEKDAY_NAMES[wd])

    const overrides = {}
    for (const [iso, day] of Object.entries(input.overrides ?? {})) {
      if (!ISO_DATE.test(iso)) throw new Error(`Data de ajuste inválida: ${iso}`)
      overrides[iso] = validateDay(day, `Ajuste ${iso}`)
    }

    const s = input.settings ?? {}
    const settings = {
      minWindowMinutes: Number.isFinite(s.minWindowMinutes) ? Math.max(0, s.minWindowMinutes) : 15,
      theme: s.theme === 'light' ? 'light' : 'dark',
    }
    return { ok: true, state: { version: 1, week, overrides, settings } }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
