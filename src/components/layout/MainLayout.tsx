import type { ReactNode } from 'react'

/** Three-column workstation grid; stacks to one column on narrow screens. */
export function MainLayout({ header, left, centre, right, footer }: { header: ReactNode; left: ReactNode; centre: ReactNode; right: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-void">
      {header}
      <main className="flex-1 grid gap-3 p-3 grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_340px]">
        <div className="space-y-3 order-2 lg:order-1 min-w-0">{left}</div>
        <div className="space-y-3 order-1 lg:order-2 min-w-0">{centre}</div>
        <div className="space-y-3 order-3 lg:col-span-2 xl:col-span-1 grid gap-3 md:grid-cols-2 xl:grid-cols-1 xl:space-y-0 content-start min-w-0">{right}</div>
      </main>
      {footer}
    </div>
  )
}
