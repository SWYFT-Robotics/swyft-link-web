import { useState, useEffect } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { Upload, RefreshCw, AlertCircle, Info, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

export function FirmwareTab() {
  const { send, firmwareVersion, firmwareBuildDate } = useMotorStore()
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null)
  const [dfuState, setDfuState] = useState<'idle' | 'sent' | 'done'>('idle')

  useEffect(() => { send('VERSION') }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirmwareFile(e.target.files?.[0] ?? null)
  }

  const handleDFU = async () => {
    setDfuState('sent')
    await send('DFU')
    // Device will disconnect after ~500ms
    setTimeout(() => setDfuState('done'), 2000)
  }

  const isSwyftFirmware = firmwareFile?.name.toLowerCase().startsWith('swyft_thunder')
  const warnFile = firmwareFile && !isSwyftFirmware

  return (
    <div className="space-y-4 max-w-lg">
      {/* Current firmware */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-white">Running Firmware</h3>
          <button onClick={() => send('VERSION')} className="text-slate-400 hover:text-white transition-colors p-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Version</span>
            <span className="font-mono text-white">{firmwareVersion ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Build Date</span>
            <span className="font-mono text-white text-xs">{firmwareBuildDate ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* One-click update via DFU */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3">One-Click Firmware Update</h3>

        {dfuState === 'idle' && (
          <>
            {/* File picker */}
            <label className="flex items-center gap-3 p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-sky-500/50 transition-colors group mb-3">
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-slate-300">{firmwareFile ? firmwareFile.name : 'Choose firmware (.bin)'}</div>
                {firmwareFile && <div className="text-xs text-slate-500">{(firmwareFile.size / 1024).toFixed(0)} KB</div>}
              </div>
              <input type="file" accept=".bin" onChange={handleFileSelect} className="hidden" />
            </label>

            {warnFile && (
              <div className="flex gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3 text-sm text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Unexpected filename — official files are named SWYFT_THUNDER_YYYYMMDD_*.bin</span>
              </div>
            )}

            <button onClick={handleDFU} disabled={!firmwareFile}
              className={clsx('w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all',
                firmwareFile ? 'bg-sky-500 hover:bg-sky-400 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              )}>
              <Upload className="w-4 h-4" />
              Flash Firmware
            </button>
          </>
        )}

        {dfuState === 'sent' && (
          <div className="text-center py-4">
            <div className="text-sky-400 font-medium mb-1">DFU command sent...</div>
            <div className="text-slate-400 text-sm">Device is entering bootloader mode</div>
          </div>
        )}

        {dfuState === 'done' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Device entered DFU mode! Now use dfu-util to flash.
            </div>
            <div className="bg-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300">
              dfu-util -a 0 -d 0483:df11 -s 0x08000000:leave -D {firmwareFile?.name ?? 'firmware.bin'}
            </div>
            <button onClick={() => setDfuState('idle')} className="text-xs text-slate-500 hover:text-slate-300">
              Start over
            </button>
          </div>
        )}
      </div>

      {/* Manual DFU instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-sky-400" />
          <h3 className="font-semibold text-white">Manual DFU Method</h3>
        </div>
        <ol className="space-y-2 text-sm text-slate-400">
          {[
            'Unplug the motor from all power',
            'Hold the DFU button on the back',
            'While holding, plug in USB-C',
            'Release button after 2 seconds',
            'Flash using SWYFT Link desktop app or dfu-util',
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-xs text-sky-400 flex-shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
