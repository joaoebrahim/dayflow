import { fromMinutes, formatDuration } from '../lib/freeWindows.js'

/**
 * Linha do tempo vertical e proporcional de um dia.
 * Recebe a saída de buildTimeline().
 */
export default function Timeline({ timeline, nowMinutes = null, pxPerMin = 1.15 }) {
  const { dayStart, dayEnd, items } = timeline
  const height = (dayEnd - dayStart) * pxPerMin
  const y = (m) => (m - dayStart) * pxPerMin

  const hours = []
  for (let h = Math.ceil(dayStart / 60) * 60; h <= dayEnd; h += 60) hours.push(h)

  const showNow = nowMinutes !== null && nowMinutes >= dayStart && nowMinutes <= dayEnd

  return (
    <div className="flex py-3">
      {/* Eixo de horas */}
      <div className="relative w-11 shrink-0" style={{ height }}>
        {hours.map((h) => (
          <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-slate-400 dark:text-slate-500" style={{ top: y(h) }}>
            {fromMinutes(h)}
          </span>
        ))}
      </div>

      <div className="relative flex-1 border-l border-slate-200 dark:border-slate-800" style={{ height }}>
        {hours.map((h) => (
          <div key={h} className="absolute inset-x-0 border-t border-dashed border-slate-200/80 dark:border-slate-800" style={{ top: y(h) }} />
        ))}

        {items.map((item, i) => {
          const top = y(item.start)
          const h = Math.max((item.end - item.start) * pxPerMin - 2, 3)
          const compact = h < 38
          const range = `${fromMinutes(item.start)}–${fromMinutes(item.end)}`

          if (item.type === 'fixed') {
            const c = item.block.color
            return (
              <div
                key={item.block.id}
                className="absolute inset-x-1.5 overflow-hidden rounded-lg border-l-4 px-2.5 py-1"
                style={{ top: top + 1, height: h, borderColor: c, backgroundColor: `${c}2e` }}
                title={`${item.block.name} · ${range}`}
              >
                <div className={`flex ${compact ? 'items-center gap-2' : 'flex-col'} min-w-0`}>
                  <span className="truncate text-sm font-semibold">{item.block.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-600 dark:text-slate-300">{range}</span>
                </div>
              </div>
            )
          }

          if (item.type === 'transit') {
            return (
              <div
                key="transit"
                className="absolute inset-x-1.5 flex items-center gap-2 overflow-hidden rounded-lg border border-dashed border-slate-400 px-2.5 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400"
                style={{ top: top + 1, height: h }}
              >
                <span className="truncate">A caminho de casa · {formatDuration(item.end - item.start)}</span>
              </div>
            )
          }

          return (
            <div
              key={`free-${i}`}
              className="free-stripes absolute inset-x-1.5 overflow-hidden rounded-lg border-2 border-emerald-500/70 px-2.5 py-1 text-emerald-800 dark:text-emerald-200"
              style={{ top: top + 1, height: h }}
            >
              <div className={`flex ${compact ? 'items-center gap-2' : 'flex-col'} min-w-0`}>
                <span className="truncate text-sm font-semibold">
                  {item.label ?? 'Janela livre'} · {formatDuration(item.minutes)}
                </span>
                <span className="shrink-0 text-xs tabular-nums opacity-80">{range}</span>
              </div>
            </div>
          )
        })}

        {showNow && (
          <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: y(nowMinutes) }}>
            <span className="-ml-1.5 size-3 rounded-full bg-rose-500" />
            <span className="h-0.5 flex-1 bg-rose-500" />
          </div>
        )}
      </div>
    </div>
  )
}
