<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { addPolylineRain } from './polylineRain'

const globe = ref<HTMLDivElement | null>(null)
const errorMessage = ref('')
const rainReady = ref(false)
const rain = reactive({ enabled: true, shaderEnabled: true, intensity: 65, speed: 8, tilt: 12 })
let viewer: Cesium.Viewer | null = null
let removeRain: (() => void) | undefined

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
    removeRain = addPolylineRain(viewer.scene, rain)
    rainReady.value = true
  } catch (error) {
    console.error('Cesium 初始化失败', error)
    errorMessage.value = '地球加载失败，请检查浏览器的 WebGL 支持和本地影像资源。'
  }
})

onBeforeUnmount(() => {
  removeRain?.()
  viewer?.destroy()
})
</script>

<template>
  <main class="scene" aria-label="Marine Scene">
    <div ref="globe" class="globe" />
    <aside v-if="rainReady" class="rain-panel" aria-label="三维降雨设置">
      <label class="rain-title">
        <span>降雨</span>
        <input v-model="rain.enabled" type="checkbox" aria-label="开启降雨" />
      </label>

      <button
        class="rain-shader-toggle"
        type="button"
        :aria-pressed="rain.shaderEnabled"
        @click="rain.shaderEnabled = !rain.shaderEnabled"
      >
        <span>雨丝 Shader</span>
        <span aria-hidden="true">{{ rain.shaderEnabled ? '开启' : '关闭' }}</span>
      </button>

      <label class="rain-control">
        <span>强度</span>
        <span aria-hidden="true">{{ rain.intensity }}%</span>
        <input v-model.number="rain.intensity" type="range" min="0" max="100" />
      </label>

      <label class="rain-control">
        <span>雨滴速度</span>
        <span aria-hidden="true">{{ rain.speed }} m/s</span>
        <input v-model.number="rain.speed" type="range" min="2" max="16" />
      </label>

      <label class="rain-control">
        <span>东西向倾斜</span>
        <span aria-hidden="true">{{ rain.tilt }}°</span>
        <input v-model.number="rain.tilt" type="range" min="-45" max="45" />
      </label>
    </aside>
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

.rain-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  width: min(210px, calc(100% - 24px));
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #475569;
  border-radius: 8px;
  background: #17212e;
  color: #f1f5f9;
  font: 14px/1.4 system-ui, sans-serif;
  accent-color: #7dd3fc;
}

.rain-title,
.rain-shader-toggle,
.rain-control {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
}

.rain-title {
  font-weight: 600;
}

.rain-shader-toggle {
  width: 100%;
  margin-top: 10px;
  padding: 4px 7px;
  border: 1px solid #475569;
  border-radius: 4px;
  background: #243243;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.rain-shader-toggle[aria-pressed='true'] span:last-child {
  color: #7dd3fc;
}

.rain-control {
  margin-top: 10px;
  font-variant-numeric: tabular-nums;
}

.rain-control input {
  grid-column: 1 / -1;
  width: 100%;
  margin: 2px 0 0;
}
</style>
