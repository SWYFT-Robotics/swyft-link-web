import { useState } from 'react'
import { useMotorStore } from './store/motorStore'
import { ControlTab } from './components/tabs/ControlTab'
import { CanTab } from './components/tabs/CanTab'
import { FirmwareTab } from './components/tabs/FirmwareTab'
import { LogTab } from './components/tabs/LogTab'
import { Zap, Wifi, WifiOff, Loader2, Radio, Terminal, Cpu } from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { id: 'control', label: 'Control', icon: Zap },
  { id: 'can', label: 'CAN Bus', icon: Radio },
  { id: 'firmware', label: 'Firmware', icon: Cpu },
  { id: 'log', label: 'Log', icon: Terminal },
] as const

type TabId = typeof TABS[number]['id']

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('control')
  const { connectionState, status, connect, disconnect } = useMotorStore()

  const isConnected = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white leading-none">SWYFT Link</div>
              <div className="text-xs text-slate-400">Motor Controller Interface</div>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 ml-2">
            <div className={clsx('w-2 h-2 rounded-full', {
              'bg-green-400 animate-pulse': isConnected,
              'bg-yellow-400 animate-pulse': isConnecting,
              'bg-slate-600': connectionState === 'disconnected',
              'bg-red-400': connectionState === 'error',
            })} />
            <span className="text-xs text-slate-400 capitalize">{connectionState}</span>
          </div>

          {/* Voltage/Temp quick stats */}
          {isConnected && status && (
            <div className="flex items-center gap-4 ml-2 text-sm">
              {status.voltage > 0.1 && (
                <span className={clsx('font-mono', status.voltage < 7 ? 'text-amber-400' : 'text-slate-300')}>
                  {status.voltage.toFixed(1)}V
                </span>
              )}
              <span className="font-mono text-slate-300">{status.temperature.toFixed(1)}°C</span>
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', {
                'bg-slate-700 text-slate-400': status.state === 0,
                'bg-green-500/20 text-green-400': status.state !== 0,
              })}>
                {status.stateString}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* CAN Master badge */}
            {isConnected && status?.canMaster && (
              <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/40 rounded-lg px-3 py-1.5">
                <Radio className="w-3 h-3 text-orange-400" />
                <span className="text-xs font-medium text-orange-400">CAN Master</span>
              </div>
            )}

            {/* Connect/Disconnect */}
            {!SerialConnection.isSupported() ? (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
                WebSerial not supported — use Chrome/Edge
              </div>
            ) : (
              <button
                onClick={isConnected ? disconnect : connect}
                disabled={isConnecting}
                className={clsx('btn flex items-center gap-2', isConnected ? 'btn-danger' : 'btn-primary')}
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isConnected ? (
                  <WifiOff className="w-4 h-4" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect Motor'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Not connected message */}
      {!isConnected && (
        <div className="max-w-6xl mx-auto w-full px-4 mt-8 text-center">
          <div className="inline-flex flex-col items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-10">
            <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/30 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Connect Your SWYFT Thunder</h2>
              <p className="text-slate-400 mt-1 text-sm max-w-xs">
                Plug in the USB-C cable and click "Connect Motor" to configure and control your motor.
              </p>
            </div>
            {!SerialConnection.isSupported() && (
              <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
                ⚠ WebSerial requires Chrome, Edge, or Opera. Firefox/Safari not supported.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      {isConnected && (
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
          {/* Low voltage warning */}
          {status && status.voltage > 0.1 && status.voltage < 7 && (
            <div className={clsx('flex items-center gap-3 rounded-xl px-4 py-3 border text-sm font-medium', {
              'bg-red-500/10 border-red-500/30 text-red-400': status.voltage < 5.5,
              'bg-amber-500/10 border-amber-500/30 text-amber-400': status.voltage >= 5.5,
            })}>
              ⚠ Voltage low ({status.voltage.toFixed(1)}V) — Motor requires ≥7V to spin. Connect 12V power.
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx('flex items-center gap-2 flex-1 justify-center py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === id ? 'tab-active' : 'tab-inactive'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1">
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

// Need to import for the check above
import { SerialConnection } from './api/SerialConnection'
