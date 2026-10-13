import { useRef, useState } from 'react'
import { Button, Card, Icon, inputClass } from '../components/ui.jsx'
import { createDefaultState } from '../lib/defaultData.js'
import { clearOverride, parseISODate } from '../lib/schedule.js'
import { exportJSON, importJSON } from '../lib/storage.js'

const dateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export default function DataView({ state, setState, onEditDate }) {
  const fileRef = useRef(null)
  const [message, setMessage] = useState(null)

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const result = await importJSON(file)
    if (result.ok) {
      setState(result.state)
      setMessage({ ok: true, text: 'Dados importados com sucesso.' })
    } else {
      setMessage({ ok: false, text: `Importação falhou: ${result.error}` })
    }
  }

  const overrides = Object.keys(state.overrides).sort()

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Dados e ajustes</h1>

      <Card className="space-y-3">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Os dados ficam só neste navegador. Exporte para guardar ou levar para outro aparelho.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => exportJSON(state)}>
            <Icon name="download" className="size-4" /> Exportar JSON
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" className="size-4" /> Importar JSON
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
        </div>
        {message && (
          <p className={`text-sm ${message.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{message.text}</p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Preferências</h2>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">
            Janela mínima
            <span className="block text-xs text-slate-500 dark:text-slate-400">Intervalos menores que isso não contam como livres.</span>
          </span>
          <span className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="180"
              step="5"
              value={state.settings.minWindowMinutes}
              onChange={(e) => {
                const v = Math.max(0, Math.min(180, Number(e.target.value) || 0))
                setState((s) => ({ ...s, settings: { ...s.settings, minWindowMinutes: v } }))
              }}
              className={`${inputClass} w-20 text-right tabular-nums`}
            />
            <span className="text-sm text-slate-500">min</span>
          </span>
        </label>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Dias ajustados</h2>
        {overrides.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum ajuste pontual. Use “Ajustar só este dia” na tela Hoje.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {overrides.map((iso) => (
              <li key={iso} className="flex items-center gap-2 py-2">
                <button className="text-sm font-medium hover:underline" onClick={() => onEditDate(iso)}>
                  {dateFmt.format(parseISODate(iso))}
                </button>
                <Button variant="danger" className="ml-auto !px-2" onClick={() => setState((s) => clearOverride(s, iso))} aria-label="Remover ajuste">
                  <Icon name="trash" className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Recomeçar</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Apaga tudo e volta para a rotina de exemplo.</p>
        <Button
          variant="danger"
          className="border border-rose-300 dark:border-rose-900"
          onClick={() => {
            if (confirm('Apagar todos os dados e restaurar a rotina de exemplo?')) {
              setState({ ...createDefaultState(), settings: { ...createDefaultState().settings, theme: state.settings.theme } })
              setMessage(null)
            }
          }}
        >
          <Icon name="reset" className="size-4" /> Restaurar exemplo
        </Button>
      </Card>
    </div>
  )
}
