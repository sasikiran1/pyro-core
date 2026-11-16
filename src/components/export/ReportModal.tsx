import { useEffect } from 'react'
import { Download, FileText, X } from 'lucide-react'
import { buildScreeningReport, type ReportInput } from './screeningReport'

export function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/** Modal showing the model screening summary, with a plain-text download. */
export function ReportModal({ open, onClose, report }: { open: boolean; onClose: () => void; report: ReportInput }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  const text = buildScreeningReport(report)
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Model screening summary"
        className="bg-deck border border-edge rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
          <h2 className="panel-title"><FileText size={12} /> Model screening summary</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-100"><X size={16} /></button>
        </div>
        <pre className="hud text-[11px] leading-relaxed text-slate-300 p-4 overflow-auto whitespace-pre-wrap">{text}</pre>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-edge">
          <button onClick={() => download(`pyro-core-${report.material.id}-screening.txt`, text)}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-cyan-nasa/60 text-cyan-nasa text-xs hover:bg-cyan-nasa/10">
            <Download size={13} /> Download .txt
          </button>
        </div>
      </div>
    </div>
  )
}
