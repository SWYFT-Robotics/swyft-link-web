# SWYFT Link Web

Browser-based interface for the SWYFT Thunder Motor Controller.  
No installation required — works in Chrome, Edge, and Opera using the **WebSerial API**.

## Live App

🌐 **[app.swyftrobotics.com](https://app.swyftrobotics.com)** *(deploy to GitHub Pages)*

## Features

- 🔌 WebSerial — direct USB-CDC connection, no drivers needed
- ⚡ Real-time motor status (voltage, temperature, speed, position, current)
- 🎛 Motor control with sliders (Current / Speed / Position / T-Curve)
- 📡 CAN Bus status and robot state
- 🔧 Firmware information and DFU update
- 📋 Live log console with quick commands
- 📱 PWA — installable as a desktop/mobile app

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome 89+ | ✅ Full |
| Edge 89+ | ✅ Full |
| Opera 75+ | ✅ Full |
| Firefox | ❌ WebSerial not supported |
| Safari | ❌ WebSerial not supported |

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
# Deploy dist/ to GitHub Pages or any static host
```

## Protocol

Communicates over USB CDC serial at 115200 baud using the SWYFT text protocol.  
Future versions will use the unified SWYFT binary protocol (same as CAN).
