/**
 * Pure tests: delivery layer resolve + layer sound URLs.
 */
import {
  layerSoundUrl,
  resolveLayerFromDelivery,
  resolveOrderLayer,
} from '../src/utils/deliveryLayer.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg)
    process.exit(1)
  }
}

// --- OrderFormatter::resolveLayer parity ---
assert(resolveLayerFromDelivery(null) === null, 'null delivery')
assert(resolveLayerFromDelivery({}) === null, 'empty delivery')
assert(resolveLayerFromDelivery({ layer: 2 }) === 2, 'layer 2 raw')
assert(resolveLayerFromDelivery({ layer: '3' }) === 3, 'layer string 3')
assert(
  resolveLayerFromDelivery({ layer: 1, subzone_code: 1 }) === 0,
  'layer1 + subzone1 → 0',
)
assert(
  resolveLayerFromDelivery({ layer: 1, subzone_code: 2 }) === 1,
  'layer1 + subzone2 → 1',
)
assert(
  resolveLayerFromDelivery({ layer: 1, subzone_code: 3 }) === 1,
  'layer1 + other subzone → 1',
)
assert(resolveLayerFromDelivery({ layer: 1 }) === 1, 'layer1 no subzone → 1')
assert(resolveLayerFromDelivery({ layer: 0 }) === 0, 'layer 0')

// --- order payload shapes ---
assert(resolveOrderLayer({ layer: 2 }) === 2, 'API resolved layer')
assert(resolveOrderLayer({ layer: 'Слой 1' }) === null, 'label string not a number')
assert(
  resolveOrderLayer({
    delivery_detail: { layer: 1, subzone_code: 1 },
  }) === 0,
  'pusher nested delivery_detail',
)
assert(
  resolveOrderLayer({
    delivery_details: { layer: '2', subzone_code: null },
  }) === 2,
  'delivery_details object',
)

// --- sound URLs + files on disk ---
assert(layerSoundUrl(0) === '/sounds/layer-0.mp3', 'url 0')
assert(layerSoundUrl(3) === '/sounds/layer-3.mp3', 'url 3')
assert(layerSoundUrl(4) === null, 'no clip for layer 4')
assert(layerSoundUrl(null) === null, 'null layer no url')
assert(layerSoundUrl(-1) === null, 'negative no url')

const soundsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/sounds',
)
for (let i = 0; i <= 3; i++) {
  const f = path.join(soundsDir, `layer-${i}.mp3`)
  assert(fs.existsSync(f), `public/sounds/layer-${i}.mp3 exists`)
}
// no russian-named leftovers
const leftover = fs
  .readdirSync(soundsDir)
  .filter((n) => /слой/i.test(n) || /\d\s/.test(n))
assert(leftover.length === 0, `no RU sound names left: ${leftover.join(',')}`)

console.log('PASS test-delivery-layer')
