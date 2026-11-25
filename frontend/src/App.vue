<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const globe = ref<HTMLDivElement | null>(null)
const errorMessage = ref('')
let viewer: Cesium.Viewer | null = null

onMounted(async () => {
  try {
    if (!globe.value) return

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN
    if (token) Cesium.Ion.defaultAccessToken = token

    // const terrain = Cesium.Terrain.fromWorldBathymetry({
    //   requestVertexNormals: true,
    // })
    const terrain = Cesium.Terrain.fromWorldTerrain({
      requestWaterMask: true,
    })

    terrain.readyEvent.addEventListener(() => {
      console.info('World Bathymetry 地形服务已就绪')
    })
    terrain.errorEvent.addEventListener((error) => {
      console.error('World Bathymetry服务初始化失败', error)
    })

    viewer = new Cesium.Viewer(globe.value, {
      terrain,
      baseLayerPicker: false,
      geocoder: false,
      animation: false,
      timeline: false,
      sceneModePicker: false,
      homeButton: false,
      navigationHelpButton: false,
    })
    viewer.scene.globe.showWaterEffect = true
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(120.8, 22.5, 15000),
      orientation: {
        heading: Cesium.Math.toRadians(90),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
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
  position: fixed;
  inset: 0;
}
</style>
