import { useEffect, useState } from 'react'
import { Icon } from './components/ui.jsx'
import { toISODate, weekdayOf } from './lib/schedule.js'
import { loadState, saveState } from './lib/storage.js'
import DataView from './views/DataView.jsx'
import RoutineView from './views/RoutineView.jsx'
import TodayView from './views/TodayView.jsx'
import WeekView from './views/WeekView.jsx'

const TABS = [
  { id: 'today', label: 'Hoje', icon: 'today', hash: '#hoje' },
  { id: 'week', label: 'Semana', icon: 'week', hash: '#semana' },
  { id: 'routine', label: 'Rotina', icon: 'routine', hash: '#rotina' },
  { id: 'data', label: 'Dados', icon: 'data', hash: '#dados' },
]

const tabFromHash = () => TABS.find((t) => t.hash === window.location.hash)?.id ?? 'today'

/** Relógio que atualiza a cada minuto (para o marcador "agora"). */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function App() {
  const [state, setState] = useState(loadState)
  const now = useNow()
  const [tab, setTabState] = useState(tabFromHash)
  // A aba fica na URL (#semana etc.) para o botão voltar funcionar.
  const setTab = (id) => {
    const hash = TABS.find((t) => t.id === id).hash
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
    setTabState(id)
  }
  useEffect(() => {
    const onPop = () => setTabState(tabFromHash())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [weekAnchor, setWeekAnchor] = useState(() => toISODate(new Date()))
  const [routineTarget, setRoutineTarget] = useState(() => ({ type: 'weekday', weekday: new Date().getDay() }))

  useEffect(() => saveState(state), [state])

  const dark = state.settings.theme === 'dark'
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0f17' : '#f8fafc')
  }, [dark])

  const toggleTheme = () => setState((s) => ({ ...s, settings: { ...s.settings, theme: dark ? 'light' : 'dark' } }))

  const goTab = (id) => {
    // Ao abrir "Rotina" pela navegação, volta para o padrão semanal.
    if (id === 'routine' && tab !== 'routine' && routineTarget.type === 'date') {
      setRoutineTarget({ type: 'weekday', weekday: weekdayOf(routineTarget.iso) })
    }
    setTab(id)
    window.scrollTo({ top: 0 })
  }

  const adjustDate = (iso) => {
    setRoutineTarget({ type: 'date', iso })
    setTab('routine')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl pb-24 sm:pb-10">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/85 backdrop-blur dark:border-slate-800 dark:bg-[#0b0f17]/85">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-500 text-sm font-black text-white">D</span>
            <span className="text-lg font-bold tracking-tight">Dayflow</span>
          </div>
          <nav className="ml-6 hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => goTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <button
            onClick={toggleTheme}
            className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
          >
            <Icon name={dark ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4">
        {tab === 'today' && <TodayView state={state} date={date} setDate={setDate} onAdjust={adjustDate} now={now} />}
        {tab === 'week' && (
          <WeekView
            state={state}
            anchor={weekAnchor}
            setAnchor={setWeekAnchor}
            now={now}
            onOpenDay={(iso) => {
              setDate(iso)
              goTab('today')
            }}
          />
        )}
        {tab === 'routine' && <RoutineView state={state} setState={setState} target={routineTarget} setTarget={setRoutineTarget} />}
        {tab === 'data' && <DataView state={state} setState={setState} onEditDate={adjustDate} />}
      </main>

      {/* Navegação inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-slate-800 dark:bg-[#0b0f17]/95">
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => goTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                tab === t.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon name={t.icon} className="size-6" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
