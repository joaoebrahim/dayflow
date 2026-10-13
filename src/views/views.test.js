// Teste de fumaça: cada tela renderiza com os dados de exemplo sem quebrar.
import { describe, it, expect } from 'vitest'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { createDefaultState } from '../lib/defaultData.js'
import TodayView from './TodayView.jsx'
import WeekView from './WeekView.jsx'
import RoutineView from './RoutineView.jsx'
import DataView from './DataView.jsx'

const state = createDefaultState()
const now = new Date(2026, 9, 12, 21, 0) // segunda, 21:00
const noop = () => {}

describe('telas', () => {
  it('Hoje', () => {
    const html = renderToString(h(TodayView, { state, date: '2026-10-12', setDate: noop, onAdjust: noop, now }))
    expect(html).toContain('1h 40min')
  })

  it('Semana', () => {
    const html = renderToString(h(WeekView, { state, anchor: '2026-10-12', setAnchor: noop, onOpenDay: noop, now }))
    expect(html).toContain('37h 50min')
  })

  it('Rotina (padrão e ajuste pontual)', () => {
    expect(renderToString(h(RoutineView, { state, setState: noop, target: { type: 'weekday', weekday: 1 }, setTarget: noop }))).toContain('Faculdade')
    expect(renderToString(h(RoutineView, { state, setState: noop, target: { type: 'date', iso: '2026-10-14' }, setTarget: noop }))).toContain('Ajuste pontual')
  })

  it('Dados', () => {
    expect(renderToString(h(DataView, { state, setState: noop, onEditDate: noop }))).toContain('Exportar JSON')
  })
})
