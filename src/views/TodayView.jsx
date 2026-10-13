import { buildTimeline, formatDuration, MINUTES_PER_DAY } from '../lib/freeWindows.js'
import { addDays, parseISODate, resolveDay, toISODate, WEEKDAY_NAMES } from '../lib/schedule.js'
import Timeline from '../components/Timeline.jsx'
import { Button, Card, Icon } from '../components/ui.jsx'

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })

export default function TodayView({ state, date, setDate, onAdjust, now }) {
  const { day, isOverride, weekday } = resolveDay(state, date)
  const timeline = buildTimeline(day, { minMinutes: state.settings.minWindowMinutes })
  const todayISO = toISODate(now)
  const isToday = date === todayISO

  // Minutos de "agora" no eixo do dia (depois da meia-noite conta como +24h).
  let nowMinutes = null
  if (isToday) {
    nowMinutes = now.getHours() * 60 + now.getMinutes()
    if (nowMinutes < timeline.dayStart) nowMinutes += MINUTES_PER_DAY
  }
  const nextWindow = isToday ? timeline.windows.find((w) => w.end > nowMinutes) : null
  const evening = timeline.windows.find((w) => w.afterLastFixed)

  return (
    <div className="space-y-4">
      {/* Navegação de data */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="!px-2" onClick={() => setDate(addDays(date, -1))} aria-label="Dia anterior">
          <Icon name="left" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-lg font-bold leading-tight">{isToday ? 'Hoje' : WEEKDAY_NAMES[weekday]}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {isToday && `${WEEKDAY_NAMES[weekday]}, `}
            {dateFmt.format(parseISODate(date))}
          </div>
        </div>
        <Button variant="ghost" className="!px-2" onClick={() => setDate(addDays(date, 1))} aria-label="Próximo dia">
          <Icon name="right" />
        </Button>
      </div>
      {!isToday && (
        <div className="-mt-2 text-center">
          <button className="text-sm font-medium text-emerald-600 dark:text-emerald-400" onClick={() => setDate(todayISO)}>
            Voltar para hoje
          </button>
        </div>
      )}

      {/* Resumo */}
      <Card className="!p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white">
          <div className="text-xs font-medium uppercase tracking-wide opacity-85">Tempo livre no dia</div>
          <div className="text-4xl font-bold tabular-nums">{formatDuration(timeline.totalFreeMinutes)}</div>
          <div className="mt-1 text-sm opacity-90">
            {timeline.windows.length} {timeline.windows.length === 1 ? 'janela' : 'janelas'}
            {evening && ` · em casa a partir de ${evening.startLabel}`}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-3">
          {isOverride ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              Dia ajustado (não segue o padrão)
            </span>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">Seguindo o padrão de {WEEKDAY_NAMES[weekday].toLowerCase()}</span>
          )}
          <Button variant="outline" className="ml-auto" onClick={() => onAdjust(date)}>
            <Icon name="routine" className="size-4" /> {isOverride ? 'Editar ajuste' : 'Ajustar só este dia'}
          </Button>
        </div>
      </Card>

      {nextWindow && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          {nowMinutes >= nextWindow.start ? (
            <>Você está numa janela livre agora: restam <b>{formatDuration(nextWindow.end - nowMinutes)}</b> (até {nextWindow.endLabel}).</>
          ) : (
            <>Próxima janela livre às <b>{nextWindow.startLabel}</b> ({formatDuration(nextWindow.minutes)}), daqui a {formatDuration(nextWindow.start - nowMinutes)}.</>
          )}
        </div>
      )}

      {/* Janelas livres em lista */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Janelas livres</h2>
        {timeline.windows.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma janela livre neste dia.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {timeline.windows.map((w) => (
              <li key={w.start} className="flex items-center gap-3 py-2">
                <span className="size-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="tabular-nums font-medium">
                  {w.startLabel}–{w.endLabel}
                </span>
                <span className="min-w-0 truncate text-sm text-slate-500 dark:text-slate-400">
                  {w.label ?? (w.afterLastFixed ? 'Até dormir' : 'Intervalo')}
                </span>
                <span className="ml-auto shrink-0 rounded-full bg-emerald-600/15 px-2 py-0.5 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatDuration(w.minutes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Linha do tempo */}
      <Card className="!px-2">
        <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Acorda {day.wake}</span>
          <span>Dorme {day.sleep}</span>
        </div>
        <Timeline timeline={timeline} nowMinutes={nowMinutes} />
      </Card>
    </div>
  )
}
