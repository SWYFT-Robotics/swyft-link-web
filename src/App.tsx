import { useState, useRef } from 'react'
import { useMotorStore } from './store/motorStore'
import { ControlTab } from './components/tabs/ControlTab'
import { CanTab } from './components/tabs/CanTab'
import { FirmwareTab } from './components/tabs/FirmwareTab'
import { LogTab } from './components/tabs/LogTab'
import { GraphsTab } from './components/tabs/GraphsTab'
import { InputTab } from './components/tabs/InputTab'
import { AboutTab } from './components/tabs/AboutTab'
import { SerialConnection } from './api/SerialConnection'
import { Zap, Wifi, WifiOff, Loader2, Radio, Terminal, Cpu, AlertCircle, LineChart, Sliders, Info, Upload, CheckCircle, ChevronDown, ChevronUp, Usb } from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { id: 'control', label: 'Control', icon: Zap },
  { id: 'graphs', label: 'Graphs', icon: LineChart },
  { id: 'can', label: 'CAN', icon: Radio },
  { id: 'input', label: 'Input', icon: Sliders },
  { id: 'firmware', label: 'Firmware', icon: Cpu },
  { id: 'log', label: 'Log', icon: Terminal },
  { id: 'about', label: 'About', icon: Info },
] as const

type TabId = typeof TABS[number]['id']

const isSupported = SerialConnection.isSupported()

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('control')
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [recoverFile, setRecoverFile] = useState<File | null>(null)
  const recoverInputRef = useRef<HTMLInputElement>(null)

  const {
    connectionState, status, connectError, connect, disconnect,
    dfuProgress, dfuError, dfuSupported,
    flashFirmwareFromSerial, flashFirmwareDirect, clearDFU
  } = useMotorStore()

  const isConnected = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting'
  const isDFUActive = dfuProgress !== null
  const isDFUDone = dfuProgress?.phase === 'done'

  const handleConnect = async () => {
    try { await connect() } catch { /* handled in store */ }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="leading-none">
              <div className="font-bold text-white text-sm tracking-wide">SWYFT Link</div>
              <div className="text-xs text-slate-500">Device Interface</div>
            </div>
          </div>

          {/* Connection status dot */}
          <div className="flex items-center gap-1.5">
            <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', {
              'bg-green-400 shadow-sm shadow-green-400': isConnected,
              'bg-amber-400 animate-pulse': isConnecting,
              'bg-slate-600': connectionState === 'disconnected',
              'bg-red-400': connectionState === 'error',
            })} />
            {isConnected && status && (
              <span className="text-xs text-slate-400">
                {status.voltage > 0.1 ? `${status.voltage.toFixed(1)}V · ` : ''}{status.temperature.toFixed(0)}°C
                {status.state !== 0 && ` · ${status.stateString}`}
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* CAN master badge */}
            {isConnected && status?.canMaster && (
              <span className="text-xs px-2 py-1 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/25">
                CAN Master
              </span>
            )}

            {/* Not supported warning */}
            {!isSupported && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Use Chrome or Edge
              </div>
            )}

            {/* Connect button */}
            {isSupported && (
              <button
                onClick={isConnected ? disconnect : handleConnect}
                disabled={isConnecting}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                  isConnected
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'bg-sky-500 border-sky-400 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20',
                  isConnecting && 'opacity-60 cursor-not-allowed'
                )}
              >
                {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" />
                  : isConnected ? <WifiOff className="w-4 h-4" />
                  : <Wifi className="w-4 h-4" />}
                {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect Device'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DFU flashing overlay — shown instead of connect screen while flashing */}
      {!isConnected && isDFUActive && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-sky-500/15 border border-sky-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  {isDFUDone
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />}
                </div>
                <div>
                  <div className="font-semibold text-white capitalize">{dfuProgress.phase}…</div>
                  <div className="text-xs text-slate-400 mt-0.5">{dfuProgress.message}</div>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mb-1">
                <div
                  className={clsx('h-2 rounded-full transition-all duration-300', isDFUDone ? 'bg-green-500' : 'bg-sky-500')}
                  style={{ width: `${dfuProgress.progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 text-right mb-4">{dfuProgress.progress}%</div>
              {isDFUDone && (
                <button
                  onClick={() => { clearDFU(); handleConnect() }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-medium text-sm transition-all"
                >
                  <Wifi className="w-4 h-4" /> Reconnect Device
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DFU error overlay */}
      {!isConnected && !isDFUActive && dfuError && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-4 text-sm">
              <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> Flash failed
              </div>
              <div className="font-mono text-xs text-red-300 break-all">{dfuError}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={clearDFU} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all">
                Back
              </button>
              <button onClick={handleConnect} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-medium transition-all">
                <Wifi className="w-4 h-4" /> Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Normal disconnected state */}
      {!isConnected && !isDFUActive && !dfuError && (
        <div className="flex-1 flex items-start justify-center p-8">
          <div className="w-full max-w-sm space-y-5">
            {/* Main connect card */}
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-sky-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">SWYFT Link</h1>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                Connect a SWYFT Thunder motor controller via USB-C to configure and control it.
              </p>

              {isSupported ? (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-semibold shadow-lg shadow-sky-500/25 transition-all disabled:opacity-60"
                >
                  {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
                  {isConnecting ? 'Connecting...' : 'Connect Device'}
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4" />
                  WebSerial requires Chrome 89+ or Edge 89+
                </div>
              )}

              {connectError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm text-left">
                  <div className="font-semibold mb-1">Connection failed</div>
                  <div className="font-mono text-xs">{connectError}</div>
                  <div className="mt-2 text-xs text-slate-500">Check the device is plugged in and not open in another app.</div>
                </div>
              )}

              <p className="text-xs text-slate-600 mt-4">
                Plug in your device, then select its COM port when prompted.
              </p>
            </div>

            {/* Recover / DFU section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setRecoverOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Usb className="w-4 h-4" />
                  <span className="font-medium">Recover Device / Flash Firmware</span>
                </div>
                {recoverOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {recoverOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
                  <p className="text-xs text-slate-500 pt-3 leading-relaxed">
                    Use this if your device is stuck or unresponsive. Put it into DFU mode manually, then flash new firmware.
                  </p>

                  {/* How to enter DFU manually */}
                  <div className="bg-slate-800/60 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-300 mb-2">How to enter DFU mode</div>
                    <ol className="space-y-1.5 text-xs text-slate-400">
                      {[
                        'Unplug the device from USB',
                        'Hold the DFU button (small button on the back)',
                        'Plug in USB-C while holding the button',
                        'Release after 2 seconds',
                        'Device appears as "STM32 BOOTLOADER"',
                      ].map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-sky-600 flex-shrink-0 font-medium">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* File picker */}
                  <label className="flex items-center gap-3 p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-sky-500/50 transition-colors group">
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-sky-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-300 truncate">
                        {recoverFile ? recoverFile.name : 'Choose firmware (.bin)'}
                      </div>
                      {recoverFile && <div className="text-xs text-slate-500">{(recoverFile.size / 1024).toFixed(0)} KB</div>}
                    </div>
                    <input
                      ref={recoverInputRef}
                      type="file" accept=".bin"
                      onChange={e => setRecoverFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>

                  {!dfuSupported && (
                    <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      WebUSB requires Chrome or Edge
                    </div>
                  )}

                  <button
                    onClick={() => recoverFile && flashFirmwareDirect(recoverFile)}
                    disabled={!recoverFile || !dfuSupported}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all',
                      recoverFile && dfuSupported
                        ? 'bg-sky-500 hover:bg-sky-400 text-white'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    )}
                  >
                    <Usb className="w-4 h-4" />
                    Flash Firmware (Device already in DFU mode)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connected state */}
      {isConnected && (
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 flex flex-col gap-3">
          {/* Low voltage warning */}
          {status && status.voltage > 0.1 && status.voltage < 7 && (
            <div className={clsx('flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium border', {
              'bg-red-500/10 border-red-500/20 text-red-400': status.voltage < 5.5,
              'bg-amber-500/10 border-amber-500/20 text-amber-400': status.voltage >= 5.5,
            })}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Voltage {status.voltage.toFixed(1)}V — device requires ≥7V to operate motors. Connect 12V power.
            </div>
          )}

          {/* CAN master notice */}
          {status?.canMaster && (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Radio className="w-4 h-4 flex-shrink-0" />
              <span><strong>CAN / SystemCore is master.</strong> USB motor control disabled. Power cycle to re-enable USB control.</span>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1 bg-slate-900/60 backdrop-blur p-1 rounded-xl border border-slate-800">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'flex items-center gap-2 flex-1 justify-center py-2 px-3 rounded-lg text-sm font-medium transition-all',
                  activeTab === id
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 pb-4">
            {activeTab === 'control' && <ControlTab />}
            {activeTab === 'graphs' && <GraphsTab />}
            {activeTab === 'can' && <CanTab />}
            {activeTab === 'input' && <InputTab />}
            {activeTab === 'firmware' && <FirmwareTab />}
            {activeTab === 'log' && <LogTab />}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </div>
      )}
    </div>
  )
}
