/**
 * Rotina de exemplo (tudo editável no app).
 * Dias da semana: 0 = domingo … 6 = sábado (mesmo padrão do Date do JS).
 */

export const COLORS = {
  trabalho: '#3b82f6',
  almoco: '#f59e0b',
  academia: '#f43f5e',
  faculdade: '#8b5cf6',
  livre: '#10b981',
}

// Chegada em casa depois da faculdade varia por dia (valores de exemplo).
const HOME_ARRIVAL = { 1: '21:50', 2: '22:00', 3: '21:50', 4: '22:15', 5: '21:45' }

function weekdayRoutine(wd) {
  const arrival = HOME_ARRIVAL[wd]
  return {
    wake: '07:30',
    homeArrival: arrival,
    sleep: '23:30',
    blocks: [
      { id: `d${wd}-trabalho1`, name: 'Trabalho presencial', start: '07:30', end: '11:30', color: COLORS.trabalho, kind: 'fixed' },
      { id: `d${wd}-almoco`, name: 'Almoço (no local)', start: '11:30', end: '12:30', color: COLORS.almoco, kind: 'fixed' },
      { id: `d${wd}-trabalho2`, name: 'Trabalho presencial', start: '12:30', end: '16:30', color: COLORS.trabalho, kind: 'fixed' },
      { id: `d${wd}-academia`, name: 'Academia', start: '16:30', end: '18:00', color: COLORS.academia, kind: 'fixed' },
      { id: `d${wd}-faculdade`, name: 'Faculdade', start: '18:00', end: '21:20', color: COLORS.faculdade, kind: 'fixed' },
      { id: `d${wd}-estudos`, name: 'Estudos e projetos', start: arrival, end: '23:30', color: COLORS.livre, kind: 'free' },
    ],
  }
}

function weekendDay() {
  return { wake: '08:30', homeArrival: null, sleep: '23:30', blocks: [] }
}

export function createDefaultState() {
  return {
    version: 1,
    week: {
      0: weekendDay(),
      1: weekdayRoutine(1),
      2: weekdayRoutine(2),
      3: weekdayRoutine(3),
      4: weekdayRoutine(4),
      5: weekdayRoutine(5),
      6: weekendDay(),
    },
    overrides: {},
    settings: { minWindowMinutes: 15, theme: 'dark' },
  }
}
