import { useState, useEffect } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { Upload, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export function FirmwareTab() {
  const { send, firmwareVersion, firmwareBuildDate } = useMotorStore()
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'updating' | 'done' | 'error'>('idle')
  const [updateLog, setUpdateLog] = useState<string[]>([])

  useEffect(() => { send('VERSION') }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirmwareFile(e.target.files?.[0] ?? null)
  }

  const handleUpdate = async () => {
    if (!firmwareFile) return
    setStatus('updating')
    setUpdateLog([])
    setUpdateLog(l => [...l, `Selected: ${firmwareFile.name}`])
    setUpdateLog(l => [...l, 'Sending DFU command...'])
    await send('DFU')
    setUpdateLog(l => [...l, 'Device entering DFU mode...'])
    setUpdateLog(l => [...l, '⚠ Use dfu-util or SWYFT Link desktop app for full firmware flashing.'])
    setUpdateLog(l => [...l, 'WebUSB DFU support coming soon.'])
    setStatus('error')
  }

  const isSwyftFirmware = firmwareFile?.name.toLowerCase().startsWith('swyft_thunder')
  const warnFile = firmwareFile && !isSwyftFirmware

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-white">Running Firmware</h3>
          <button onClick={() => send('VERSION')} className="text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Version</span>
            <span className="font-mono text-white">{firmwareVersion ?? 'Unknown'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Build Date</span>
            <span className="font-mono text-white">{firmwareBuildDate ?? '-'}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-3">Update Firmware</h3>

        {/* File picker */}
        <label className="flex items-center gap-3 p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-sky-500/50 transition-colors group">
          <Upload className="w-5 h-5 text-slate-400 group-hover:text-sky-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm text-slate-300">{firmwareFile ? firmwareFile.name : 'Choose firmware file (.bin)'}</div>
            {firmwareFile && <div className="text-xs text-slate-500">{(firmwareFile.size / 1024).toFixed(0)} KB</div>}
          </div>
          <input type="file" accept=".bin" onChange={handleFileSelect} className="hidden" />
        </label>

        {warnFile && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mt-2 text-sm text-amber-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>This doesn't look like official SWYFT firmware. Expected: SWYFT_THUNDER_YYYYMMDD_*.bin</span>
          </div>
        )}

        <button
          onClick={handleUpdate}
          disabled={!firmwareFile || status === 'updating'}
          className={clsx('btn w-full mt-3 flex items-center justify-center gap-2', {
            'btn-primary': firmwareFile && status !== 'updating',
            'btn-secondary': !firmwareFile || status === 'updating',
          })}
        >
          {status === 'updating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {status === 'updating' ? 'Updating...' : 'Update Firmware'}
        </button>

        {/* Log */}
        {updateLog.length > 0 && (
          <div className="mt-3 bg-slate-950 rounded-lg p-3 text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
            {updateLog.map((l, i) => (
              <div key={i} className={clsx({
                'text-green-400': l.includes('✓') || l.includes('done'),
                'text-red-400': l.includes('✗') || l.includes('Error') || l.includes('failed'),
                'text-amber-400': l.includes('⚠'),
                'text-slate-400': true,
              })}>
                {l}
              </div>
            ))}
          </div>
        )}

        {status === 'done' && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg mt-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" /> Firmware updated! Reconnect the motor.
          </div>
        )}
      </div>
    </div>
  )
}
