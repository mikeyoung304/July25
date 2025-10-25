import fs from 'node:fs'
import path from 'node:path'

const LIMIT_BYTES = 100 * 1024 // 100KB
const clientDist = path.resolve('client/dist/js')

if (!fs.existsSync(clientDist)) {
  console.error('Bundle budget: client/dist/js not found. Did you build the client?')
  process.exit(1)
}

const files = fs.readdirSync(clientDist)
const main = files.find(f => f.includes('main') && f.endsWith('.js')) ||
             files.find(f => f.endsWith('.js'))

if (!main) {
  console.error('Bundle budget: no main JS found in client/dist/assets')
  process.exit(1)
}

const size = fs.statSync(path.join(clientDist, main)).size
const kb = (size / 1024).toFixed(2)
const ok = size <= LIMIT_BYTES

console.log(`Bundle budget: ${main} ${kb}KB (limit 100KB) -> ${ok ? 'OK' : 'FAIL'}`)
process.exit(ok ? 0 : 1)