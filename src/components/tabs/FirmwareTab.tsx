import { useState, useEffect } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { flashFirmware, isDFUSupported, type DFUProgress } from '../../api/WebDFU'
import { Upload, RefreshCw, AlertCircle, CheckCircle, Loader2, Zap, Info, Usb } from 'lucide-react'
import clsx from 'clsx'

export function FirmwareTab() {
  const { send, firmwareVersion, firmwareBuildDate, disconnect } = useMotorStore()
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null)
  const [dfuProgress, setDfuProgress] = useState<DFUProgress | null>(null)
  const [dfuSent, setDfuSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { send('VERSION') }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirmwareFile(e.target.files?.[0] ?? null)
    setDfuProgress(null)
    setError(null)
  }

  const handleFlash = async () => {
    if (!firmwareFile) return
    setError(null)
    setDfuProgress({ phase: 'connecting', progress: 0, message: 'Sending DFU command to device...' })
    setDfuSent(false)

    try {
      // Step 1: Put device in DFU mode via serial command
      await send('DFU')
      setDfuSent(true)

      // Step 2: Disconnect serial — the port disappears when DFU mode starts
      await disconnect()

      // Step 3: Wait for STM32 to reset and enumerate as DFU device (~1.5s)
      setDfuProgress({ phase: 'connecting', progress: 5, message: 'Waiting for device to enter DFU mode...' })
      await new Promise(r => setTimeout(r, 1500))

      // Step 4: Flash via WebUSB DFU — browser will show device picker
      setDfuProgress({ phase: 'connecting', progress: 8, message: 'Select the STM32 BOOTLOADER device in the browser dialog...' })
      const binData = await firmwareFile.arrayBuffer()
      await flashFirmware(binData, (p) => setDfuProgress(p))

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setDfuProgress(null)
    }
  }

  // Flash without sending DFU command — device is already in DFU mode
  const handleFlashDFUDirect = async () => {
    if (!firmwareFile) return
    setError(null)
    setDfuProgress({ phase: 'connecting', progress: 0, message: 'Connecting to DFU device...' })
    try {
      setDfuProgress({ phase: 'connecting', progress: 5, message: 'Select the STM32 BOOTLOADER device in the browser dialog...' })
      const binData = await firmwareFile.arrayBuffer()
      await flashFirmware(binData, (p) => setDfuProgress(p))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setDfuProgress(null)
    }
  }

  const isFlashing = dfuProgress !== null && dfuProgress.phase !== 'done' && dfuProgress.phase !== 'error'
  const isDone = dfuProgress?.phase === 'done'
  const isSwyftFirmware = firmwareFile?.name.toLowerCase().startsWith('swyft_thunder')
  const warnFile = firmwareFile && !isSwyftFirmware
  const webUsbSupported = isDFUSupported()

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

      {/* One-click browser DFU update */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-sky-400" />
          <h3 className="font-semibold text-white">Browser Firmware Update</h3>
          {!webUsbSupported && (
            <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
              WebUSB requires Chrome/Edge
            </span>
          )}
        </div>

        {!isDone && !isFlashing && (
          <>
            <p className="text-xs text-slate-400 mb-3">
              Flash firmware directly from the browser — no tools needed. Uses WebUSB to communicate with the STM32 DFU bootloader.
            </p>

            <label className="flex items-center gap-3 p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-sky-500/50 transition-colors group mb-3">
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-sky-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-300 truncate">
                  {firmwareFile ? firmwareFile.name : 'Choose firmware (.bin)'}
                </div>
                {firmwareFile && <div className="text-xs text-slate-500">{(firmwareFile.size / 1024).toFixed(0)} KB</div>}
              </div>
              <input type="file" accept=".bin" onChange={handleFileSelect} className="hidden" />
            </label>

            {warnFile && (
              <div className="flex gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3 text-sm text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Unexpected filename. Official files are named SWYFT_THUNDER_YYYYMMDD_*.bin</span>
              </div>
            )}

            {error && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-3 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Flash failed</div>
                  <div className="font-mono text-xs mt-1 break-all">{error}</div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleFlash}
                disabled={!firmwareFile || !webUsbSupported}
                title="Sends DFU command via serial, then flashes via WebUSB"
                className={clsx('flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all',
                  (firmwareFile && webUsbSupported)
                    ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                )}>
                <Zap className="w-4 h-4" />
                {webUsbSupported ? 'Flash Firmware' : 'WebUSB required (Chrome/Edge)'}
              </button>
              <button
                onClick={handleFlashDFUDirect}
                disabled={!firmwareFile || !webUsbSupported}
                title="Device already in DFU mode — connect directly via WebUSB"
                className={clsx('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all',
                  (firmwareFile && webUsbSupported)
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                )}>
                <Usb className="w-4 h-4" />
                <span className="text-xs">Already in DFU</span>
              </button>
            </div>
          </>
        )}

        {isFlashing && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-white capitalize">{dfuProgress?.phase}...</div>
                <div className="text-xs text-slate-400">{dfuProgress?.message}</div>
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${dfuProgress?.progress ?? 0}%` }} />
            </div>
            <div className="text-xs text-slate-500 text-right">{dfuProgress?.progress ?? 0}%</div>
          </div>
        )}

        {isDone && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {dfuProgress?.message}
            </div>
            <button onClick={() => { setDfuProgress(null); setFirmwareFile(null) }}
              className="text-xs text-sky-400 hover:text-sky-300">
              Flash another file
            </button>
          </div>
        )}
      </div>

      {/* Manual DFU fallback */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-300 text-sm">Manual DFU (fallback)</h3>
        </div>
        <ol className="space-y-1.5 text-xs text-slate-500">
          {['Unplug motor from power', 'Hold DFU button on back', 'Plug in USB-C while holding', 'Release after 2 seconds', 'Use dfu-util or SWYFT Link desktop app'].map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-sky-600 flex-shrink-0">{i + 1}.</span> {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
