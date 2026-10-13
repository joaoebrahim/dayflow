/** Componentes visuais pequenos e reaproveitáveis. */

const ICONS = {
  today: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.05 16.95l-1.41 1.41m12.72 0-1.42-1.41M7.05 7.05 5.64 5.64M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  week: 'M4 5h16v14H4zM4 10h16M9 10v9M14 10v9',
  routine: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  data: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Zm8 3v6c0 1.7-3.6 3-8 3s-8-1.3-8-3V6m16 6v6c0 1.7-3.6 3-8 3s-8-1.3-8-3v-6',
  left: 'm15 18-6-6 6-6',
  right: 'm9 18 6-6-6-6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  sun: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.05 16.95l-1.41 1.41m12.72 0-1.42-1.41M7.05 7.05 5.64 5.64M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  upload: 'M12 20V9m0 0-4 4m4-4 4 4M5 4h14',
  reset: 'M4 4v6h6M20 20v-6h-6M5.5 15A7 7 0 0 0 18.4 17M18.5 9A7 7 0 0 0 5.6 7',
  warn: 'M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
}

export function Icon({ name, className = 'size-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

export function Card({ className = '', children }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 ${className}`}>
      {children}
    </section>
  )
}

const VARIANTS = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50',
}

export function Button({ variant = 'outline', className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/** Controle segmentado (ex.: Fixo | Livre). */
export function Segmented({ value, options, onChange, size = 'sm' }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 ${size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-sm'} font-medium transition-colors ${
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const inputClass =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-950'
