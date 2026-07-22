<script setup>
defineProps({
  metrics: {
    type: Object,
    default: null,
  },
})
</script>

<template>
  <aside v-if="metrics" class="vp-debug" aria-label="Viewport debug">
    <div class="vp-debug__title">viewport debug</div>
    <dl class="vp-debug__grid">
      <dt>inner</dt>
      <dd>{{ metrics.innerWidth }}×{{ metrics.innerHeight }}</dd>
      <dt>screen</dt>
      <dd>{{ metrics.screenWidth }}×{{ metrics.screenHeight }}</dd>
      <dt>dpr</dt>
      <dd>{{ Number(metrics.devicePixelRatio).toFixed(2) }}</dd>
      <dt>layout</dt>
      <dd>
        {{ metrics.layoutWidth ?? '—' }}{{ metrics.halfWidthHd ? ' · halfHD' : '' }}
      </dd>
      <dt>root</dt>
      <dd>{{ Number(metrics.rootPx).toFixed(2) }}px</dd>
      <dt>scale</dt>
      <dd>{{ Number(metrics.scale).toFixed(3) }}× (design {{ metrics.designWidth }})</dd>
    </dl>
    <p class="vp-debug__hint">?debug=1 or localStorage dashDebug=1</p>
  </aside>
</template>

<style scoped>
.vp-debug {
  position: fixed;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 9999;
  max-width: 16rem;
  padding: 0.55rem 0.65rem;
  border-radius: 0.5rem;
  background: rgba(20, 21, 40, 0.88);
  color: #f3f4f8;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.35;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.vp-debug__title {
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9aa0b5;
  margin-bottom: 0.35rem;
}

.vp-debug__grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15rem 0.55rem;
  margin: 0;
}

.vp-debug__grid dt {
  margin: 0;
  color: #9aa0b5;
}

.vp-debug__grid dd {
  margin: 0;
  font-weight: 600;
  text-align: right;
}

.vp-debug__hint {
  margin: 0.4rem 0 0;
  color: #7a8094;
  font-size: 0.65rem;
}
</style>
