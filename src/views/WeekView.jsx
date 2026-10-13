import { buildTimeline, formatDuration, fromMinutes } from '../lib/freeWindows.js'
import { addDays, parseISODate, resolveDay, toISODate, weekDates, WEEKDAY_SHORT } from '../lib/schedule.js'
import { Button, Card, Icon } from '../components/ui.jsx'

const PX = 0.7 // pixels por minuto
const rangeFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

export default function WeekView({ state, anchor, setAnchor, onOpenDay, now }) {
  const todayISO = toISODate(now)
  const days = weekDates(anchor).map((iso) => {
    const { day, isOverride, weekday } = resolveDay(state, iso)
    return { iso, weekday, isOverride, t: buildTimeline(day, { minMinutes: state.settings.minWindowMinutes }) }
  })

  // Faixa vertical comum a todos os dias, arredondada para horas cheias.
  const rangeStart = Math.floor(Math.min(...days.map((d) => d.t.dayStart)) / 60) * 60
  const rangeEnd = Math.ceil(Math.max(...days.map((d) => d.t.dayEnd)) / 60) * 60
  const height = (rangeEnd - rangeStart) * PX
  const y = (m) => (m - rangeStart) * PX
  const hours = []
  for (let h = rangeStart; h <= rangeEnd; h += 60) hours.push(h)

  const weekTotal = days.reduce((s, d) => s + d.t.totalFreeMinutes, 0)
  const first = parseISODate(days[0].iso)
  const last = parseISODate(days[6].iso)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="!px-2" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Semana anterior">
          <Icon name="left" />
        </Button>
        <div className="flex-1 text-center">
          <div className="text-lg font-bold leading-tight">Semana</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {rangeFmt.format(first)} – {rangeFmt.format(last)}
          </div>
        </div>
        <Button variant="ghost" className="!px-2" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Próxima semana">
          <Icon name="right" />
        </Button>
      </div>

      <Card className="flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">Tempo livre na semana</span>
        <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatDuration(weekTotal)}</span>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div>
          <div className="grid" style={{ gridTemplateColumns: '2rem repeat(7, minmax(0, 1fr))' }}>
            {/* Cabeçalho */}
            <div className="border-b border-slate-200 dark:border-slate-800" />
            {days.map((d) => (
              <button
                key={d.iso}
                onClick={() => onOpenDay(d.iso)}
                className={`border-b border-l border-slate-200 px-1 py-2 text-center transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 ${
                  d.iso === todayISO ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''
                }`}
              >
                <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {WEEKDAY_SHORT[d.weekday]}
                  {d.isOverride && <span className="ml-1 inline-block size-1.5 rounded-full bg-amber-500 align-middle" title="Dia ajustado" />}
                </div>
                <div className={`text-base font-bold ${d.iso === todayISO ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {parseISODate(d.iso).getDate()}
                </div>
                <div className="text-[10px] font-medium leading-tight tabular-nums text-emerald-600 sm:text-[11px] dark:text-emerald-400">{formatDuration(d.t.totalFreeMinutes)}</div>
              </button>
            ))}

            {/* Eixo de horas */}
            <div className="relative" style={{ height }}>
              {hours.map((h) => (
                <span key={h} className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-slate-400" style={{ top: Math.max(y(h), 6) }}>
                  {fromMinutes(h).slice(0, 2)}h
                </span>
              ))}
            </div>

            {/* Colunas dos dias */}
            {days.map((d) => (
              <div key={d.iso} className="relative border-l border-slate-200 dark:border-slate-800" style={{ height }}>
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800/70" style={{ top: y(h) }} />
                ))}
                {/* Fora do dia (dormindo) */}
                <div className="absolute inset-x-0 top-0 bg-slate-200/60 dark:bg-slate-950/70" style={{ height: y(d.t.dayStart) }} />
                <div className="absolute inset-x-0 bottom-0 bg-slate-200/60 dark:bg-slate-950/70" style={{ top: y(d.t.dayEnd) }} />

                {d.t.items.map((item, i) => {
                  const style = { top: y(item.start) + 1, height: Math.max((item.end - item.start) * PX - 2, 2) }
                  const range = `${fromMinutes(item.start)}–${fromMinutes(item.end)}`
                  if (item.type === 'fixed') {
                    return (
                      <div
                        key={item.block.id}
                        className="absolute inset-x-0.5 overflow-hidden rounded-md px-1 py-0.5 text-[9px] font-semibold leading-tight text-white sm:text-[11px]"
                        style={{ ...style, backgroundColor: item.block.color }}
                        title={`${item.block.name} · ${range}`}
                      >
                        <span className="line-clamp-3 [overflow-wrap:anywhere]">{item.block.name}</span>
                      </div>
                    )
                  }
                  if (item.type === 'transit') {
                    return <div key="transit" className="absolute inset-x-0.5 rounded-md border border-dashed border-slate-400 dark:border-slate-600" style={style} title={`Deslocamento · ${range}`} />
                  }
                  return (
                    <div
                      key={`f${i}`}
                      className="free-stripes absolute inset-x-0.5 overflow-hidden rounded-md border border-emerald-500/60 px-1 py-0.5 text-[10px] font-semibold leading-tight text-emerald-700 dark:text-emerald-300"
                      style={style}
                      title={`Livre · ${range} · ${formatDuration(item.minutes)}`}
                    >
                      {style.height > 22 && <span className="[overflow-wrap:anywhere]">{formatDuration(item.minutes)}</span>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">Toque em um dia para ver a linha do tempo. Ponto laranja = dia ajustado.</p>
    </div>
  )
}
