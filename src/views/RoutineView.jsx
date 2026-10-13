import { useState } from 'react'
import DayEditor from '../components/DayEditor.jsx'
import { Button, Card, Icon } from '../components/ui.jsx'
import {
  clearOverride,
  cloneDay,
  copyWeekday,
  parseISODate,
  resolveDay,
  setOverride,
  setWeekday,
  WEEK_ORDER,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
} from '../lib/schedule.js'

const dateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * target = { type: 'weekday', weekday } → edita o padrão semanal
 * target = { type: 'date', iso }        → edita só aquela data (ajuste pontual)
 */
export default function RoutineView({ state, setState, target, setTarget }) {
  const minWindowMinutes = state.settings.minWindowMinutes

  if (target.type === 'date') {
    const { day, isOverride, weekday } = resolveDay(state, target.iso)
    return (
      <div className="space-y-4">
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Ajuste pontual</div>
          <div className="text-lg font-bold first-letter:uppercase">{dateFmt.format(parseISODate(target.iso))}</div>
          <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
            {isOverride
              ? 'Este dia tem um ajuste próprio. O padrão da semana não muda.'
              : `Ainda segue o padrão de ${WEEKDAY_NAMES[weekday].toLowerCase()}. Qualquer alteração aqui vale só para esta data.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isOverride && (
              <Button variant="outline" onClick={() => setState((s) => clearOverride(s, target.iso))}>
                <Icon name="reset" className="size-4" /> Voltar ao padrão
              </Button>
            )}
            <Button variant="ghost" onClick={() => setTarget({ type: 'weekday', weekday })}>
              Editar padrão de {WEEKDAY_NAMES[weekday].toLowerCase()}
            </Button>
          </div>
        </Card>
        <Card>
          <DayEditor
            day={day}
            minWindowMinutes={minWindowMinutes}
            onChange={(next) => setState((s) => setOverride(s, target.iso, cloneDay(next)))}
          />
        </Card>
      </div>
    )
  }

  const wd = target.weekday
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Rotina semanal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">O padrão que se repete toda semana.</p>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEK_ORDER.map((d) => (
          <button
            key={d}
            onClick={() => setTarget({ type: 'weekday', weekday: d })}
            className={`rounded-xl py-2 text-sm font-semibold transition-colors ${
              d === wd
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {WEEKDAY_SHORT[d]}
          </button>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">{WEEKDAY_NAMES[wd]}</h2>
        <DayEditor day={state.week[wd]} minWindowMinutes={minWindowMinutes} onChange={(next) => setState((s) => setWeekday(s, wd, next))} />
      </Card>

      <CopyPanel key={wd} from={wd} onCopy={(targets) => setState((s) => copyWeekday(s, wd, targets))} />
    </div>
  )
}

function CopyPanel({ from, onCopy }) {
  const [selected, setSelected] = useState([])
  const [done, setDone] = useState(false)
  const toggle = (d) => setSelected((sel) => (sel.includes(d) ? sel.filter((x) => x !== d) : [...sel, d]))

  return (
    <Card>
      <h2 className="font-semibold">Copiar {WEEKDAY_NAMES[from].toLowerCase()} para…</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">Substitui a rotina dos dias marcados.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {WEEK_ORDER.filter((d) => d !== from).map((d) => (
          <button
            key={d}
            onClick={() => toggle(d)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              selected.includes(d)
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            {WEEKDAY_SHORT[d]}
          </button>
        ))}
      </div>
      <Button
        variant="primary"
        className="mt-3"
        disabled={selected.length === 0}
        onClick={() => {
          if (!confirm(`Substituir a rotina de ${selected.map((d) => WEEKDAY_NAMES[d]).join(', ')}?`)) return
          onCopy(selected)
          setSelected([])
          setDone(true)
        }}
      >
        <Icon name="copy" className="size-4" /> Copiar
      </Button>
      {done && <span className="ml-3 text-sm text-emerald-600 dark:text-emerald-400">Copiado!</span>}
    </Card>
  )
}
