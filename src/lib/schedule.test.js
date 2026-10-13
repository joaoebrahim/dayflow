import { describe, it, expect } from 'vitest'
import {
  weekdayOf,
  addDays,
  weekDates,
  resolveDay,
  setOverride,
  clearOverride,
  copyWeekday,
  cloneDay,
  validateState,
} from './schedule.js'
import { createDefaultState } from './defaultData.js'

describe('datas', () => {
  it('dia da semana no fuso local', () => {
    expect(weekdayOf('2026-10-12')).toBe(1) // segunda
    expect(weekdayOf('2026-10-18')).toBe(0) // domingo
  })

  it('soma dias atravessando o mês', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })

  it('semana vai de segunda a domingo', () => {
    const dates = weekDates('2026-10-15')
    expect(dates[0]).toBe('2026-10-12')
    expect(dates[6]).toBe('2026-10-18')
  })
})

describe('ajuste pontual', () => {
  it('altera só a data escolhida, sem mexer no padrão', () => {
    const state = createDefaultState()
    const changed = cloneDay(state.week[1])
    changed.blocks = changed.blocks.filter((b) => b.name !== 'Academia')

    const next = setOverride(state, '2026-10-12', changed)

    expect(resolveDay(next, '2026-10-12').isOverride).toBe(true)
    expect(resolveDay(next, '2026-10-12').day.blocks.some((b) => b.name === 'Academia')).toBe(false)
    // a segunda seguinte continua com o padrão
    expect(resolveDay(next, '2026-10-19').isOverride).toBe(false)
    expect(next.week[1].blocks.some((b) => b.name === 'Academia')).toBe(true)

    expect(resolveDay(clearOverride(next, '2026-10-12'), '2026-10-12').isOverride).toBe(false)
  })

  it('copiar dia gera ids novos', () => {
    const state = createDefaultState()
    const next = copyWeekday(state, 1, [6])
    expect(next.week[6].blocks).toHaveLength(state.week[1].blocks.length)
    expect(next.week[6].blocks[0].id).not.toBe(state.week[1].blocks[0].id)
  })
})

describe('validateState', () => {
  it('aceita o estado padrão (ida e volta pelo JSON)', () => {
    const state = createDefaultState()
    const r = validateState(JSON.parse(JSON.stringify(state)))
    expect(r.ok).toBe(true)
    expect(r.state.week[1].blocks).toHaveLength(state.week[1].blocks.length)
  })

  it('rejeita horário inválido com mensagem útil', () => {
    const state = createDefaultState()
    state.week[2].blocks[0].start = '99:00'
    const r = validateState(state)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Terça/)
  })

  it('rejeita arquivo sem semana', () => {
    expect(validateState({ version: 1 }).ok).toBe(false)
    expect(validateState(null).ok).toBe(false)
  })
})
