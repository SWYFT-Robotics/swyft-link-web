// WebSerial type declarations
declare global {
  interface Navigator {
    serial: {
      requestPort(options?: { filters?: { usbVendorId?: number; usbProductId?: number }[] }): Promise<SerialPort>
    }
  }
  interface SerialPort {
    open(options: { baudRate: number }): Promise<void>
    close(): Promise<void>
    readable: ReadableStream<Uint8Array> | null
    writable: WritableStream<Uint8Array> | null
  }
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface SerialOptions {
  baudRate: number
  onData: (data: string) => void
  onStateChange: (state: ConnectionState) => void
}

export class SerialConnection {
  private port: SerialPort | null = null
  private reader: ReadableStreamDefaultReader<string> | null = null
  private writer: WritableStreamDefaultWriter<string> | null = null
  private state: ConnectionState = 'disconnected'
  private opts: SerialOptions

  constructor(opts: SerialOptions) {
    this.opts = opts
  }

  get isConnected() { return this.state === 'connected' }
  get connectionState() { return this.state }

  static isSupported(): boolean {
    return 'serial' in navigator
  }

  private setState(s: ConnectionState) {
    this.state = s
    this.opts.onStateChange(s)
  }

  async connect(): Promise<void> {
    if (!SerialConnection.isSupported()) throw new Error('WebSerial not supported')
    this.setState('connecting')
    try {
      this.port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x0483 },  // STM32
        ]
      })
      await this.port.open({ baudRate: this.opts.baudRate })

      const textDecoder = new TextDecoderStream()
      this.port.readable!.pipeTo(textDecoder.writable)
      this.reader = textDecoder.readable.getReader()

      const textEncoder = new TextEncoderStream()
      textEncoder.readable.pipeTo(this.port.writable!)
      this.writer = textEncoder.writable.getWriter()

      this.setState('connected')
      this.readLoop()
    } catch (e) {
      this.setState('error')
      throw e
    }
  }

  private async readLoop() {
    let buffer = ''
    while (this.reader) {
      try {
        const { value, done } = await this.reader.read()
        if (done) break
        if (value) {
          buffer += value
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed) this.opts.onData(trimmed)
          }
        }
      } catch {
        break
      }
    }
    this.setState('disconnected')
  }

  async send(data: string): Promise<void> {
    if (!this.writer) throw new Error('Not connected')
    await this.writer.write(data + '\n')
  }

  async disconnect(): Promise<void> {
    try {
      this.reader?.cancel()
      this.reader = null
      this.writer?.close()
      this.writer = null
      await this.port?.close()
      this.port = null
    } finally {
      this.setState('disconnected')
    }
  }
}
