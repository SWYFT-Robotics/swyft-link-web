import { create } from 'zustand'
import { SerialConnection, ConnectionState } from '../api/SerialConnection'

export interface MotorStatus {
  state: number
  stateString: string
  voltage: number
  temperature: number
  swerveRaw: number
  swerveAngle: number
  encoder: number
  position: number
  speed: number
  current: number
  errorFlag: number
  canMaster: boolean
  robotEnabled: boolean
  heartbeatValid: boolean
  ledColor: string
}

export interface CanStatus {
  deviceType: number
  manufacturer: number
  deviceNumber: number
  heartbeatValid: boolean
  heartbeatTimeout: boolean
  robotEnabled: boolean
  canMaster: boolean
  matchNumber?: number
  replayNumber?: number
  matchTime?: number
  autonomous?: boolean
  testMode?: boolean
  redAlliance?: boolean
  watchdog?: boolean
}

const STATE_NAMES = ['Stop', 'Calibrate', 'Current', 'Speed', 'Position', 'T-Curve']

function parseStatus(line: string): MotorStatus | null {
  if (!line.startsWith('#S:')) return null
  const parts = line.substring(3).split(',')
  if (parts.length < 10) return null
  const state = parseInt(parts[0]) || 0
  const ledHex = parts.length > 11 ? parts[11].replace('0x', '') : '0000FF'
  return {
    state,
    stateString: STATE_NAMES[state] ?? 'Unknown',
    voltage: (parseInt(parts[1]) || 0) / 100,
    temperature: (parseInt(parts[2]) || 0) / 10,
    swerveRaw: parseInt(parts[3]) || 0,
    swerveAngle: (parseInt(parts[4]) || 0) / 100,
    encoder: parseInt(parts[5]) || 0,
    position: parseInt(parts[6]) || 0,
    speed: (parseInt(parts[7]) || 0) / 100,
    current: parseInt(parts[8]) || 0,
    errorFlag: parseInt(parts[9].replace('0x', ''), 16) || 0,
    canMaster: parts.length > 10 && parts[10] === '1',
    robotEnabled: parts.length > 12 && parts[12] === '1',
    heartbeatValid: parts.length > 13 && parts[13] === '1',
    ledColor: `#${ledHex.padStart(6, '0')}`,
  }
}

function parseCanStatus(line: string): Partial<CanStatus> | null {
  if (!line.startsWith('#CAN:')) return null
  const result: Partial<CanStatus> = {}
  line.substring(5).split(',').forEach(part => {
    const [k, v] = part.split('=')
    switch (k) {
      case 'dev': result.deviceType = parseInt(v); break
      case 'mfr': result.manufacturer = parseInt(v); break
      case 'num': result.deviceNumber = parseInt(v); break
      case 'hb_valid': result.heartbeatValid = v === '1'; break
      case 'hb_timeout': result.heartbeatTimeout = v === '1'; break
      case 'enabled': result.robotEnabled = v === '1'; break
      case 'can_master': result.canMaster = v === '1'; break
      case 'match': result.matchNumber = parseInt(v); break
      case 'time': result.matchTime = parseInt(v); break
      case 'auto': result.autonomous = v === '1'; break
      case 'test': result.testMode = v === '1'; break
      case 'red': result.redAlliance = v === '1'; break
      case 'wdog': result.watchdog = v === '1'; break
    }
  })
  return result
}

interface MotorStore {
  conn: SerialConnection | null
  connectionState: ConnectionState
  status: MotorStatus | null
  canStatus: CanStatus
  log: string[]
  firmwareVersion: string | null
  firmwareBuildDate: string | null

  connect: () => Promise<void>
  disconnect: () => Promise<void>
  send: (cmd: string) => Promise<void>
  clearLog: () => void
}

export const useMotorStore = create<MotorStore>((set, get) => ({
  conn: null,
  connectionState: 'disconnected',
  status: null,
  canStatus: {
    deviceType: 2, manufacturer: 18, deviceNumber: 0,
    heartbeatValid: false, heartbeatTimeout: false,
    robotEnabled: false, canMaster: false
  },
  log: [],
  firmwareVersion: null,
  firmwareBuildDate: null,

  connect: async () => {
    const conn = new SerialConnection({
      baudRate: 115200,
      onStateChange: (connectionState) => set({ connectionState }),
      onData: (line) => {
        const status = parseStatus(line)
        if (status) { set({ status }); return }

        const can = parseCanStatus(line)
        if (can) {
          set(s => ({ canStatus: { ...s.canStatus, ...can } }))
          return
        }

        set(s => {
          const log = [...s.log.slice(-499), line]
          let fv = s.firmwareVersion
          let fb = s.firmwareBuildDate
          const clean = line.startsWith('< ') ? line.substring(2) : line
          if (clean.startsWith('Version:')) fv = clean.substring(8).trim()
          if (clean.startsWith('Build:')) fb = clean.substring(6).trim()
          return { log, firmwareVersion: fv, firmwareBuildDate: fb }
        })
      }
    })
    set({ conn })
    await conn.connect()
    // Request status and version
    await conn.send('VERSION')
    await conn.send('CANSTATUS')
  },

  disconnect: async () => {
    await get().conn?.disconnect()
    set({ conn: null, status: null, firmwareVersion: null, firmwareBuildDate: null })
  },

  send: async (cmd) => {
    const { conn } = get()
    if (!conn) return
    set(s => ({ log: [...s.log.slice(-499), `> ${cmd}`] }))
    await conn.send(cmd)
  },

  clearLog: () => set({ log: [] }),
}))
