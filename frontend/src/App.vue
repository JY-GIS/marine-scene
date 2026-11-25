<script setup lang="ts">
import {
  Cartesian3,
  Viewer,
} from 'cesium'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const globe = ref<HTMLDivElement | null>(null)
const errorMessage = ref('')
let viewer: Viewer | undefined

onMounted(async () => {
  try {
    if (!globe.value) return

    viewer = new Viewer(globe.value, {
      baseLayerPicker: false,
      geocoder: false,
      animation: false,
      timeline: false,
      sceneModePicker: false,
      homeButton: false,
      navigationHelpButton: false,
    })

    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(142, 24, 17_000_000),
    })
  } catch (error) {
    console.error('Cesium 初始化失败', error)
    errorMessage.value = '地球加载失败，请检查浏览器的 WebGL 支持和本地影像资源。'
  }
})

onBeforeUnmount(() => {
  viewer?.destroy()
})
</script>

<template>
  <main class="scene" aria-label="Marine Scene">
    <div ref="globe" class="globe" />
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
  </main>
</template>

<style>
html,
body,
#app,
.scene,
.globe {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

.scene {
  display: grid;
  place-items: center;
  background: #080e19;
}

.globe,
.error {
  grid-area: 1 / 1;
}

.error {
  z-index: 1;
  margin: 1rem;
  padding: 0.75rem 1rem;
  color: #fff;
  background: #182538;
  font: 1rem/1.5 system-ui, sans-serif;
}
</style>
