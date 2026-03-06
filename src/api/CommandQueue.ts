/**
 * Module-level command queue - avoids Zustand state race conditions.
 * Commands are spaced 80ms apart to prevent USB CDC buffer merging.
 */
import type { SerialConnection } from './SerialConnection'

let queue: string[] = []
let busy = false
let conn: SerialConnection | null = null

export function setQueueConnection(c: SerialConnection | null) {
  conn = c
  if (!c) { queue = []; busy = false }
}

export async function enqueueCommand(cmd: string): Promise<void> {
  queue.push(cmd)
  if (!busy) flush()
}

async function flush() {
  busy = true
  while (queue.length > 0 && conn) {
    const cmd = queue.shift()!
    try { await conn.send(cmd) } catch { /* ignore */ }
    if (queue.length > 0) await delay(80)
  }
  busy = false
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
