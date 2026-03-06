import { useState } from 'react'
import { useMotorStore } from './store/motorStore'
import { ControlTab } from './components/tabs/ControlTab'
import { CanTab } from './components/tabs/CanTab'
import { FirmwareTab } from './components/tabs/FirmwareTab'
import { LogTab } from './components/tabs/LogTab'
import { SerialConnection } from './api/SerialConnection'
import { Zap, Wifi, WifiOff, Loader2, Radio, Terminal, Cpu, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { id: 'control', label: 'Control', icon: Zap },
  { id: 'can', label: 'CAN Bus', icon: Radio },
  { id: 'firmware', label: 'Firmware', icon: Cpu },
  { id: 'log', label: 'Log', icon: Terminal },
] as const

type TabId = typeof TABS[number]['id']

const isSupported = SerialConnection.isSupported()

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('control')
  const { connectionState, status, connect, disconnect } = useMotorStore()

  const isConnected = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting'

  const handleConnect = async () => {
    try {
      await connect()
    } catch {
      // handled in store
    }
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

      {/* Disconnected state */}
      {!isConnected && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-10 h-10 text-sky-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">SWYFT Link</h1>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              Connect a SWYFT device via USB-C to configure and control it.
              Works with SWYFT Thunder motor controllers and sensors.
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

            <p className="text-xs text-slate-600 mt-4">
              Plug in your device, then select its COM port when prompted.
            </p>
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
            {activeTab === 'can' && <CanTab />}
            {activeTab === 'firmware' && <FirmwareTab />}
            {activeTab === 'log' && <LogTab />}
          </div>
        </div>
      )}
    </div>
  )
}
