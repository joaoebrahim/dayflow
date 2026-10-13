import { describe, it, expect } from 'vitest'
import {
  toMinutes,
  fromMinutes,
  formatDuration,
  mergeIntervals,
  gapsBetween,
  findOverlaps,
  findBlockIssues,
  computeFreeWindows,
  buildTimeline,
} from './freeWindows.js'
import { createDefaultState } from './defaultData.js'

const fixed = (name, start, end) => ({ id: name, name, start, end, color: '#000000', kind: 'fixed' })
const free = (name, start, end) => ({ id: name, name, start, end, color: '#10b981', kind: 'free' })

describe('conversão de horários', () => {
  it('converte HH:MM para minutos e de volta', () => {
    expect(toMinutes('07:30')).toBe(450)
    expect(toMinutes('00:00')).toBe(0)
    expect(fromMinutes(450)).toBe('07:30')
    expect(fromMinutes(1470)).toBe('00:30') // depois da meia-noite volta ao relógio
  })

  it('rejeita horários inválidos', () => {
    expect(() => toMinutes('25:00')).toThrow()
    expect(() => toMinutes('7h30')).toThrow()
    expect(() => toMinutes('')).toThrow()
  })

  it('formata durações', () => {
    expect(formatDuration(200)).toBe('3h 20min')
    expect(formatDuration(45)).toBe('45min')
    expect(formatDuration(120)).toBe('2h')
  })
})

describe('intervalos', () => {
  it('junta sobrepostos e encostados', () => {
    expect(
      mergeIntervals([
        { start: 20, end: 30 },
        { start: 0, end: 10 },
        { start: 5, end: 20 },
        { start: 40, end: 50 },
      ]),
    ).toEqual([
      { start: 0, end: 30 },
      { start: 40, end: 50 },
    ])
  })

  it('encontra os buracos entre ocupados', () => {
    const busy = [
      { start: 10, end: 20 },
      { start: 30, end: 40 },
    ]
    expect(gapsBetween(busy, 0, 50)).toEqual([
      { start: 0, end: 10 },
      { start: 20, end: 30 },
      { start: 40, end: 50 },
    ])
  })

  it('detecta blocos fixos sobrepostos (blocos livres não contam)', () => {
    const pairs = findOverlaps([fixed('A', '08:00', '10:00'), fixed('B', '09:30', '11:00'), free('C', '08:00', '12:00')])
    expect(pairs).toHaveLength(1)
    expect(pairs[0].map((b) => b.name)).toEqual(['A', 'B'])
  })
})

describe('computeFreeWindows', () => {
  it('rotina de exemplo da segunda: janela única após chegar em casa', () => {
    const monday = createDefaultState().week[1]
    const r = computeFreeWindows(monday)

    // Faculdade termina 21:20, chega em casa 21:50 → deslocamento de 30min.
    expect(r.transit).toEqual({ start: toMinutes('21:20'), end: toMinutes('21:50') })
    expect(r.windows).toHaveLength(1)
    expect(r.windows[0]).toMatchObject({
      startLabel: '21:50',
      endLabel: '23:30',
      minutes: 100,
      afterLastFixed: true,
      label: 'Estudos e projetos', // nome do bloco livre que cai nessa janela
    })
    expect(r.totalFreeMinutes).toBe(100)
  })

  it('chegada diferente por dia muda a janela (quinta chega 22:15)', () => {
    const thursday = createDefaultState().week[4]
    const r = computeFreeWindows(thursday)
    expect(r.windows[0].startLabel).toBe('22:15')
    expect(r.totalFreeMinutes).toBe(75)
  })

  it('dia sem blocos: o dia inteiro é livre', () => {
    const r = computeFreeWindows({ wake: '08:30', sleep: '23:30', homeArrival: null, blocks: [] })
    expect(r.windows).toHaveLength(1)
    expect(r.totalFreeMinutes).toBe(15 * 60)
    expect(r.windows[0].afterLastFixed).toBe(false)
  })

  it('encontra buracos no meio do dia e respeita o mínimo', () => {
    const day = {
      wake: '08:00',
      sleep: '22:00',
      blocks: [fixed('A', '08:00', '10:00'), fixed('B', '10:10', '12:00'), fixed('C', '14:00', '18:00')],
    }
    const r = computeFreeWindows(day, { minMinutes: 15 })
    // 10:00–10:10 (10min) é descartado; ficam 12:00–14:00 e 18:00–22:00.
    expect(r.windows.map((w) => `${w.startLabel}-${w.endLabel}`)).toEqual(['12:00-14:00', '18:00-22:00'])
    expect(r.windows.map((w) => w.afterLastFixed)).toEqual([false, true])
    expect(r.totalFreeMinutes).toBe(120 + 240)

    const all = computeFreeWindows(day, { minMinutes: 0 })
    expect(all.windows).toHaveLength(3)
  })

  it('blocos sobrepostos não contam tempo ocupado duas vezes', () => {
    const r = computeFreeWindows({
      wake: '08:00',
      sleep: '12:00',
      blocks: [fixed('A', '08:00', '10:00'), fixed('B', '09:00', '11:00')],
    })
    expect(r.busy).toEqual([{ start: 480, end: 660 }])
    expect(r.totalFreeMinutes).toBe(60)
  })

  it('dormir depois da meia-noite estende o dia', () => {
    const r = computeFreeWindows({ wake: '07:00', sleep: '00:30', blocks: [fixed('Aula', '18:00', '23:00')] })
    expect(r.windows.at(-1)).toMatchObject({ startLabel: '23:00', endLabel: '00:30', minutes: 90 })
  })

  it('bloco que atravessa a meia-noite é tratado corretamente', () => {
    const r = computeFreeWindows({ wake: '07:00', sleep: '02:00', blocks: [fixed('Plantão', '22:00', '01:00')] })
    expect(r.windows.at(-1)).toMatchObject({ startLabel: '01:00', endLabel: '02:00', minutes: 60 })
  })

  it('blocos fora do dia (antes de acordar) são recortados', () => {
    const r = computeFreeWindows({ wake: '08:00', sleep: '12:00', blocks: [fixed('Madrugada', '05:00', '09:00')] })
    expect(r.busy).toEqual([{ start: 480, end: 540 }])
    expect(r.totalFreeMinutes).toBe(180)
  })

  it('chegada em casa antes do fim do último bloco é ignorada', () => {
    const r = computeFreeWindows({
      wake: '08:00',
      sleep: '22:00',
      homeArrival: '17:00',
      blocks: [fixed('A', '08:00', '18:00')],
    })
    expect(r.transit).toBeNull()
    expect(r.windows[0].startLabel).toBe('18:00')
  })

  it('bloco com início igual ao fim não ocupa o dia inteiro (bug corrigido)', () => {
    const r = computeFreeWindows({ wake: '08:00', sleep: '12:00', blocks: [fixed('Novo', '10:00', '10:00')] })
    expect(r.totalFreeMinutes).toBe(240)
  })

  it('blocos do tipo livre não ocupam tempo', () => {
    const r = computeFreeWindows({ wake: '08:00', sleep: '10:00', blocks: [free('Leitura', '08:00', '09:00')] })
    expect(r.totalFreeMinutes).toBe(120)
    expect(r.windows[0].label).toBe('Leitura')
  })
})

describe('findBlockIssues', () => {
  const codes = (day) => Object.fromEntries(Object.entries(findBlockIssues(day)).map(([id, l]) => [id, l.map((i) => i.code)]))

  it('aponta duração zero, virada de dia e blocos fora do horário acordado', () => {
    const day = {
      wake: '07:00',
      sleep: '23:00',
      blocks: [
        fixed('ok', '08:00', '09:00'),
        fixed('zero', '10:00', '10:00'),
        fixed('noite', '22:00', '02:00'),
        fixed('cedo', '05:00', '06:00'),
        fixed('meio', '06:00', '08:00'),
      ],
    }
    expect(codes(day)).toEqual({
      zero: ['zero'],
      noite: ['overnight', 'partial'],
      cedo: ['outside'],
      meio: ['partial'],
    })
  })

  it('rotina de exemplo não tem avisos', () => {
    expect(findBlockIssues(createDefaultState().week[1])).toEqual({})
  })
})

describe('buildTimeline', () => {
  it('ordena fixos, deslocamento e janelas livres', () => {
    const t = buildTimeline(createDefaultState().week[1])
    expect(t.items.map((i) => i.type)).toEqual(['fixed', 'fixed', 'fixed', 'fixed', 'fixed', 'transit', 'free'])
  })
})
