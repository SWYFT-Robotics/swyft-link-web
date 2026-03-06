import { useState, useCallback } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { Power, PowerOff, Gauge, Zap, Navigation, Activity } from 'lucide-react'
import clsx from 'clsx'

const MODES = [
  { id: 2, label: 'Current', icon: Zap },
  { id: 3, label: 'Speed', icon: Gauge },
  { id: 4, label: 'Position', icon: Navigation },
  { id: 5, label: 'T-Curve', icon: Activity },
] as const

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-center min-w-0">
      <div className="text-sky-400 font-mono font-semibold text-sm truncate">{value}</div>
      <div className="text-slate-500 text-xs mt-0.5">{label}</div>
    </div>
  )
}

function Slider({ label, unit, value, min, max, onChange }:
  { label: string; unit: string; value: number; min: number; max: number; onChange: (v: number) => void; color?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="font-mono text-2xl font-bold text-sky-400">{value.toFixed(0)} <span className="text-sm text-slate-400">{unit}</span></span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-sky-500"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span><span>0</span><span>{max}</span>
      </div>
    </div>
  )
}

export function ControlTab() {
  const { status, send } = useMotorStore()
  const [motorOn, setMotorOn] = useState(false)
  const [selectedMode, setSelectedMode] = useState(2)
  const [currentMa, setCurrentMa] = useState(0)
  const [speedRpm, setSpeedRpm] = useState(0)
  const [position, setPosition] = useState(0)

  const canMaster = status?.canMaster ?? false

  // Motor state commands: firmware uses STOP, CALI, and SET state <n>
  const setMotorState = useCallback(async (state: number) => {
    if (state === 0) await send('STOP')
    else if (state === 1) await send('CALI')
    else await send(`SET state ${state}`)  // firmware SET command for live fields
  }, [send])

  const handleModeSelect = useCallback(async (modeId: number) => {
    setSelectedMode(modeId)
    if (motorOn) await setMotorState(modeId)
  }, [motorOn, setMotorState])

  const toggleMotor = useCallback(async () => {
    if (motorOn) {
      await setMotorState(0)
      setMotorOn(false)
    } else {
      await setMotorState(selectedMode)
      setMotorOn(true)
    }
  }, [motorOn, selectedMode, setMotorState])

  const handleCurrentChange = useCallback(async (v: number) => {
    setCurrentMa(v)
    if (motorOn) await send(`SET cal_current ${Math.round(v / 161.2)}`)
  }, [motorOn, send])

  const handleSpeedChange = useCallback(async (v: number) => {
    setSpeedRpm(v)
    if (motorOn) await send(`SET cal_speed ${(v / 60 * 65536).toFixed(0)}`)
  }, [motorOn, send])

  const handlePositionChange = useCallback(async (v: number) => {
    setPosition(v)
    if (motorOn) await send(`SET cal_pos ${v}`)
  }, [motorOn, send])

  if (!status) return null

  return (
    <div className="space-y-4">
      {canMaster && (
        <div className="card border-orange-500/40 bg-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="font-semibold text-orange-400 text-sm">CAN/SystemCore is Master</div>
              <div className="text-xs text-orange-300/70 mt-0.5">USB motor control is disabled. Power cycle to use USB.</div>
            </div>
          </div>
        </div>
      )}

      {/* Status grid */}
      <div className="grid grid-cols-4 gap-2">
        <StatusTile label="State" value={status.stateString} />
        <StatusTile label="Voltage" value={`${status.voltage.toFixed(1)}V`} />
        <StatusTile label="Temp" value={`${status.temperature.toFixed(1)}°C`} />
        <StatusTile label="Current" value={`${status.current.toFixed(0)}mA`} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <StatusTile label="Position" value={`${status.position}`} />
        <StatusTile label="Speed" value={`${status.speed.toFixed(0)} RPM`} />
        <StatusTile label="Encoder" value={`${status.encoder}`} />
        <StatusTile label="Errors" value={status.errorFlag ? `0x${status.errorFlag.toString(16).toUpperCase()}` : 'None'} />
      </div>

      {/* Motor control */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode buttons */}
          <div className="flex gap-1 flex-wrap flex-1">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleModeSelect(id)}
                disabled={canMaster}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border', {
                  'bg-sky-500/20 border-sky-500/50 text-sky-300': selectedMode === id && !motorOn,
                  'bg-green-500/20 border-green-500/50 text-green-300': selectedMode === id && motorOn,
                  'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200': selectedMode !== id,
                  'opacity-50 cursor-not-allowed': canMaster,
                })}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* ON/OFF toggle */}
          <button
            onClick={toggleMotor}
            disabled={canMaster}
            className={clsx('flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all border-2', {
              'bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30': motorOn,
              'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20': !motorOn,
              'opacity-40 cursor-not-allowed': canMaster,
            })}
          >
            {motorOn ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            {motorOn ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Mode-specific control */}
        <div className="pt-2 border-t border-slate-800">
          {selectedMode === 2 && (
            <Slider label="Target Current" unit="mA" value={currentMa} min={-5000} max={5000}
              onChange={handleCurrentChange} color="sky" />
          )}
          {selectedMode === 3 && (
            <Slider label="Target Speed" unit="RPM" value={speedRpm} min={-10000} max={10000}
              onChange={handleSpeedChange} color="emerald" />
          )}
          {(selectedMode === 4 || selectedMode === 5) && (
            <Slider label="Target Position" unit="" value={position} min={-5000} max={5000}
              onChange={handlePositionChange} color="violet" />
          )}
        </div>
      </div>
    </div>
  )
}
