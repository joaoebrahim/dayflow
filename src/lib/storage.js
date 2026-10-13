/**
 * Persistência no localStorage + exportar/importar JSON.
 */
import { createDefaultState } from './defaultData.js'
import { validateState, toISODate } from './schedule.js'

const KEY = 'dayflow:v1'

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return createDefaultState()
    const result = validateState(JSON.parse(raw))
    return result.ok ? result.state : createDefaultState()
  } catch {
    return createDefaultState()
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Armazenamento indisponível (aba anônima, cota cheia): segue só em memória.
  }
}

/** Baixa o estado atual como dayflow-AAAA-MM-DD.json. */
export function exportJSON(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dayflow-${toISODate(new Date())}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Lê um File e devolve { ok, state } ou { ok: false, error }. */
export async function importJSON(file) {
  try {
    const text = await file.text()
    return validateState(JSON.parse(text))
  } catch {
    return { ok: false, error: 'Não foi possível ler o arquivo como JSON' }
  }
}
