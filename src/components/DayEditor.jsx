import { computeFreeWindows, findOverlaps, formatDuration } from '../lib/freeWindows.js'
import { newId, sortBlocks } from '../lib/schedule.js'
import { Button, Icon, Segmented, inputClass } from './ui.jsx'

const TIME = /^\d{2}:\d{2}$/
const PRESET_COLORS = ['#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6', '#10b981', '#06b6d4', '#64748b']

/**
 * Editor de um dia (usado tanto no padrão semanal quanto no ajuste pontual).
 * Toda alteração é enviada na hora via onChange(dayAtualizado).
 */
export default function DayEditor({ day, onChange, minWindowMinutes }) {
  const update = (patch) => onChange({ ...day, ...patch })
  const updateBlock = (id, patch) => update({ blocks: day.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
  const removeBlock = (id) => update({ blocks: day.blocks.filter((b) => b.id !== id) })

  const addBlock = () => {
    const last = sortBlocks(day.blocks.filter((b) => b.kind === 'fixed')).at(-1)
    const start = last?.end ?? day.wake
    const block = { id: newId(), name: 'Novo bloco', start, end: start, color: PRESET_COLORS[day.blocks.length % PRESET_COLORS.length], kind: 'fixed' }
    // Um bloco de 1h por padrão
    const [h, m] = start.split(':').map(Number)
    block.end = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    update({ blocks: sortBlocks([...day.blocks, block]) })
  }

  // Reordena por horário ao sair do campo de início (só se a ordem mudou,
  // para não criar um ajuste pontual sem alteração real).
  const sortIfNeeded = () => {
    const sorted = sortBlocks(day.blocks)
    if (sorted.some((b, i) => b.id !== day.blocks[i].id)) update({ blocks: sorted })
  }

  const result = computeFreeWindows(day, { minMinutes: minWindowMinutes })
  const overlaps = findOverlaps(day.blocks)

  return (
    <div className="space-y-4">
      {/* Horários do dia */}
      <div className="grid grid-cols-3 gap-2">
        <TimeField label="Acordar" value={day.wake} onChange={(v) => update({ wake: v })} />
        <TimeField label="Chegada em casa" value={day.homeArrival ?? ''} optional onChange={(v) => update({ homeArrival: v || null })} />
        <TimeField label="Dormir" value={day.sleep} onChange={(v) => update({ sleep: v })} />
      </div>
      <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
        A chegada em casa cria um trecho de deslocamento depois do último bloco fixo. Deixe vazio se não se aplica.
      </p>

      {/* Blocos */}
      <div className="space-y-2">
        {day.blocks.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
            Nenhum bloco. O dia inteiro está livre.
          </p>
        )}
        {day.blocks.map((b) => (
          <div key={b.id} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800" style={{ borderLeft: `4px solid ${b.color}` }}>
            <div className="flex items-center gap-2">
              <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-white/20" style={{ backgroundColor: b.color }} title="Cor">
                <input type="color" value={b.color} onChange={(e) => updateBlock(b.id, { color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <input
                value={b.name}
                onChange={(e) => updateBlock(b.id, { name: e.target.value })}
                className={`${inputClass} min-w-0 flex-1`}
                aria-label="Nome do bloco"
              />
              <Button variant="danger" className="!px-2" onClick={() => removeBlock(b.id)} aria-label={`Remover ${b.name}`}>
                <Icon name="trash" className="size-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={b.start}
                onChange={(e) => TIME.test(e.target.value) && updateBlock(b.id, { start: e.target.value })}
                onBlur={sortIfNeeded}
                className={`${inputClass} w-[6.5rem] tabular-nums`}
                aria-label="Início"
              />
              <span className="text-slate-400">–</span>
              <input
                type="time"
                value={b.end}
                onChange={(e) => TIME.test(e.target.value) && updateBlock(b.id, { end: e.target.value })}
                className={`${inputClass} w-[6.5rem] tabular-nums`}
                aria-label="Fim"
              />
              <div className="ml-auto">
                <Segmented
                  value={b.kind}
                  onChange={(kind) => updateBlock(b.id, { kind })}
                  options={[
                    { value: 'fixed', label: 'Fixo' },
                    { value: 'free', label: 'Livre' },
                  ]}
                />
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" className="w-full border-dashed" onClick={addBlock}>
          <Icon name="plus" className="size-4" /> Adicionar bloco
        </Button>
      </div>

      {overlaps.length > 0 && (
        <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <Icon name="warn" className="size-5 shrink-0" />
          <div>
            Blocos fixos sobrepostos:{' '}
            {overlaps.map(([a, b]) => `${a.name} × ${b.name}`).join(', ')}. O tempo é contado uma vez só.
          </div>
        </div>
      )}

      {/* Prévia das janelas livres */}
      <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
        <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          Tempo livre: {formatDuration(result.totalFreeMinutes)}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {result.windows.map((w) => (
            <span key={w.start} className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-xs tabular-nums text-emerald-800 dark:text-emerald-200">
              {w.startLabel}–{w.endLabel} · {formatDuration(w.minutes)}
            </span>
          ))}
          {result.windows.length === 0 && <span className="text-xs text-emerald-700/70 dark:text-emerald-300/70">Nenhuma janela livre.</span>}
        </div>
      </div>
    </div>
  )
}

function TimeField({ label, value, onChange, optional = false }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => {
          const v = e.target.value
          if (TIME.test(v) || (optional && v === '')) onChange(v)
        }}
        className={`${inputClass} w-full tabular-nums`}
      />
    </label>
  )
}
