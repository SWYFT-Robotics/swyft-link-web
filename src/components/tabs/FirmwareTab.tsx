import { useState, useEffect } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { isDFUSupported } from '../../api/WebDFU'
import { Upload, RefreshCw, AlertCircle, CheckCircle, Loader2, Zap, Info, Usb, Download } from 'lucide-react'
import clsx from 'clsx'

interface FirmwareEntry { id: string; name: string; description: string; file: string; version: string; date: string }

export function FirmwareTab() {
  const { send, firmwareVersion, firmwareBuildDate, dfuProgress, dfuError, clearDFU, flashFirmwareFromSerial, flashFirmwareDirect } = useMotorStore()
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null)
  const [firmwareList, setFirmwareList] = useState<FirmwareEntry[]>([])
  const webUsbSupported = isDFUSupported()

  useEffect(() => { send('VERSION') }, [])

  // Fetch firmware manifest
  useEffect(() => {
    fetch('./firmware/manifest.json')
      .then(r => r.json())
      .then(d => setFirmwareList(d.devices ?? []))
      .catch(() => {})
  }, [])

  const isFlashing = dfuProgress !== null && dfuProgress.phase !== 'done'
  const isDone = dfuProgress?.phase === 'done'

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirmwareFile(e.target.files?.[0] ?? null)
    clearDFU()
  }

  // Fetch a firmware from the public folder and return a File object
  const fetchAndSetFirmware = async (entry: FirmwareEntry) => {
    const url = `./firmware/${entry.file}`
    const resp = await fetch(url)
    const blob = await resp.blob()
    setFirmwareFile(new File([blob], entry.file, { type: 'application/octet-stream' }))
    clearDFU()
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Current firmware */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-white">Running Firmware</h3>
          <button onClick={() => send('VERSION')} className="text-slate-400 hover:text-white transition-colors p-1"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Version</span><span className="font-mono text-white">{firmwareVersion ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Build Date</span><span className="font-mono text-white text-xs">{firmwareBuildDate ?? '—'}</span></div>
        </div>
      </div>

      {/* Available firmware downloads */}
      {firmwareList.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-white">Available Firmware</h3>
          </div>
          <div className="space-y-2">
            {firmwareList.map(fw => (
              <div key={fw.id} className="flex items-center gap-3 p-2.5 bg-slate-800 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{fw.name}</div>
                  <div className="text-xs text-slate-400">{fw.version} · {fw.date}</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <a
                    href={`./firmware/${fw.file}`}
                    download={fw.file}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-200 transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                  <button
                    onClick={() => fetchAndSetFirmware(fw)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 rounded-lg text-xs text-sky-400 transition-colors"
                  >
                    <Upload className="w-3 h-3" /> Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browser DFU update */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-sky-400" />
          <h3 className="font-semibold text-white">Flash Firmware</h3>
          {!webUsbSupported && <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">WebUSB requires Chrome/Edge</span>}
        </div>

        {!isDone && !isFlashing && (
          <>
            <p className="text-xs text-slate-400 mb-3">
              Sends a DFU command to the device, waits for it to reboot into the STM32 bootloader, then flashes via WebUSB — no tools needed.
            </p>

            <label className="flex items-center gap-3 p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-sky-500/50 transition-colors group mb-3">
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-sky-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-300 truncate">{firmwareFile ? firmwareFile.name : 'Choose firmware (.bin) or select above'}</div>
                {firmwareFile && <div className="text-xs text-slate-500">{(firmwareFile.size / 1024).toFixed(0)} KB</div>}
              </div>
              <input type="file" accept=".bin" onChange={handleFileSelect} className="hidden" />
            </label>

            {dfuError && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-3 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div><div className="font-semibold">Flash failed</div><div className="font-mono text-xs mt-1 break-all">{dfuError}</div></div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => firmwareFile && flashFirmwareFromSerial(firmwareFile)} disabled={!firmwareFile || !webUsbSupported}
                title="Sends DFU command via serial, then flashes via WebUSB"
                className={clsx('flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all',
                  firmwareFile && webUsbSupported ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed')}>
                <Zap className="w-4 h-4" />
                {webUsbSupported ? 'Flash Firmware' : 'WebUSB required (Chrome/Edge)'}
              </button>
              <button onClick={() => firmwareFile && flashFirmwareDirect(firmwareFile)} disabled={!firmwareFile || !webUsbSupported}
                title="Device already in DFU mode — connect directly via WebUSB"
                className={clsx('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all',
                  firmwareFile && webUsbSupported ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-800 text-slate-500 cursor-not-allowed')}>
                <Usb className="w-4 h-4" /><span className="text-xs whitespace-nowrap">Already in DFU</span>
              </button>
            </div>
          </>
        )}

        {isFlashing && dfuProgress && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin flex-shrink-0" />
              <div><div className="text-sm font-medium text-white capitalize">{dfuProgress.phase}…</div><div className="text-xs text-slate-400">{dfuProgress.message}</div></div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-sky-500 h-2 rounded-full transition-all duration-300" style={{ width: `${dfuProgress.progress ?? 0}%` }} /></div>
            <div className="text-xs text-slate-500 text-right">{dfuProgress.progress ?? 0}%</div>
          </div>
        )}

        {isDone && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />{dfuProgress?.message}
            </div>
            <button onClick={() => { clearDFU(); setFirmwareFile(null) }} className="text-xs text-sky-400 hover:text-sky-300">Flash another file</button>
          </div>
        )}
      </div>

      {/* Manual DFU */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-300 text-sm">Manual DFU (fallback)</h3>
        </div>
        <ol className="space-y-1.5 text-xs text-slate-500">
          {['Unplug motor from power and USB', 'Hold DFU button (small button on back)', 'Plug in USB-C while holding', 'Release after 2 seconds', 'Use "Recover Device" on the connect screen'].map((s, i) => (
            <li key={i} className="flex gap-2"><span className="text-sky-600 flex-shrink-0">{i + 1}.</span> {s}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
