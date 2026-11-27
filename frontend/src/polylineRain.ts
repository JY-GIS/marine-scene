import {
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  Math as CesiumMath,
  Material,
  Matrix4,
  PolylineCollection,
  SceneMode,
  Transforms,
  type Polyline,
  type Scene,
} from 'cesium'
import rainStreakSource from './rainStreak.glsl?raw'

interface RainSettings {
  enabled: boolean
  shaderEnabled: boolean
  intensity: number
  speed: number
  tilt: number
}

interface RainDrop {
  line: Polyline
  positions: [Cartesian3, Cartesian3]
  length: number
}

const rainRadius = 68
const rainRadiusSquared = rainRadius * rainRadius
const maximumDrops = 1250

const rainFabric = {
  type: 'MarineSceneRainStreak',
  source: rainStreakSource,
}
const plainRainColor = new Color(0.80, 0.88, 0.97, 0.36)

function createRainMaterial(shaderEnabled: boolean) {
  // Each polyline owns its material. Equal materials still batch together.
  return shaderEnabled
    ? new Material({ fabric: rainFabric, translucent: true })
    : Material.fromType(Material.ColorType, { color: plainRainColor })
}

export function addPolylineRain(scene: Scene, settings: RainSettings) {
  const globe = scene.globe
  const originalTerrainDepthTest = globe.depthTestAgainstTerrain
  const lines = scene.primitives.add(new PolylineCollection({ show: false }))
  const drops: RainDrop[] = []
  const drawRange = new DistanceDisplayCondition(5, rainRadius)
  const center = new Cartesian3()
  const frameOrigin = new Cartesian3()
  const localFrame = new Matrix4()
  const localUpstream = new Cartesian3()
  const upstream = new Cartesian3()
  const north = new Cartesian3()
  const acrossWind = new Cartesian3()
  const offset = new Cartesian3()
  const displacement = new Cartesian3()
  let previousTilt = Number.NaN
  let previousTime = performance.now()
  let visibleDrops = 0
  let shaderEnabled = settings.shaderEnabled

  function placeDrop(head: Cartesian3, fillVolume: boolean) {
    const azimuth = Math.random() * CesiumMath.TWO_PI
    const radius = rainRadius * Math.sqrt(Math.random())
    const halfLength = Math.sqrt(rainRadiusSquared - radius * radius)
    const alongWind = halfLength * (fillVolume ? 2 * Math.random() - 1 : 0.997)
    Cartesian3.multiplyByScalar(north, radius * Math.cos(azimuth), head)
    Cartesian3.multiplyByScalar(acrossWind, radius * Math.sin(azimuth), offset)
    Cartesian3.add(head, offset, head)
    Cartesian3.multiplyByScalar(upstream, alongWind, offset)
    Cartesian3.add(head, offset, head)
    Cartesian3.add(center, head, head)
  }

  function positionTail([tail, head]: RainDrop['positions'], length: number) {
    Cartesian3.multiplyByScalar(upstream, length, tail)
    Cartesian3.add(head, tail, tail)
  }

  const removeUpdate = scene.preUpdate.addEventListener(() => {
    const now = performance.now()
    const deltaSeconds = Math.min((now - previousTime) / 1000, 0.1)
    previousTime = now

    const camera = scene.camera
    const altitudeScale = CesiumMath.clamp((80_000 - camera.positionCartographic.height) / 40_000, 0, 1)
    const count = Math.round(maximumDrops * settings.intensity / 100 * altitudeScale)
    const visible = settings.enabled && count > 0 && scene.mode === SceneMode.SCENE3D
    const wasVisible = lines.show
    if (visible !== wasVisible) {
      lines.show = visible
      globe.depthTestAgainstTerrain = visible || originalTerrainDepthTest
    }
    if (!visible) return

    if (shaderEnabled !== settings.shaderEnabled) {
      shaderEnabled = settings.shaderEnabled
      for (const { line } of drops) {
        const previousMaterial = line.material
        line.material = createRainMaterial(shaderEnabled)
        previousMaterial.destroy()
      }
    }

    const cameraPosition = camera.positionWC
    const reseed = !wasVisible || Cartesian3.distanceSquared(center, cameraPosition) > rainRadiusSquared
    Cartesian3.clone(cameraPosition, center)

    const refreshFrame = reseed || Cartesian3.distanceSquared(frameOrigin, center) > rainRadiusSquared
    if (refreshFrame) {
      Cartesian3.clone(center, frameOrigin)
      Transforms.eastNorthUpToFixedFrame(frameOrigin, globe.ellipsoid, localFrame)
      Matrix4.multiplyByPointAsVector(localFrame, Cartesian3.UNIT_Y, north)
    }

    if (refreshFrame || settings.tilt !== previousTilt) {
      const angle = CesiumMath.toRadians(settings.tilt)
      // Positive tilt moves the head east as it falls.
      localUpstream.x = -Math.sin(angle)
      localUpstream.z = Math.cos(angle)
      Matrix4.multiplyByPointAsVector(localFrame, localUpstream, upstream)
      Cartesian3.cross(north, upstream, acrossWind)
      previousTilt = settings.tilt
    }

    Cartesian3.multiplyByScalar(upstream, -settings.speed * deltaSeconds, displacement)

    for (let index = 0; index < count; index++) {
      if (index === drops.length) {
        const positions: RainDrop['positions'] = [new Cartesian3(), new Cartesian3()]
        const length = CesiumMath.randomBetween(0.55, 1.55)
        placeDrop(positions[1], true)
        positionTail(positions, length)
        const line = lines.add({
          positions,
          width: CesiumMath.randomBetween(1.8, 2.6),
          material: createRainMaterial(shaderEnabled),
          distanceDisplayCondition: drawRange,
        })
        drops.push({ line, positions, length })
        continue
      }

      const drop = drops[index]
      const head = drop.positions[1]
      if (reseed || index >= visibleDrops) {
        placeDrop(head, true)
        drop.line.show = true
      } else {
        Cartesian3.add(head, displacement, head)
        if (Cartesian3.distanceSquared(head, center) > rainRadiusSquared) placeDrop(head, false)
      }
      positionTail(drop.positions, drop.length)
      drop.line.positions = drop.positions
    }

    for (let index = count; index < visibleDrops; index++) {
      drops[index].line.show = false
    }
    visibleDrops = count
  })

  return () => {
    removeUpdate()
    if (lines.show) globe.depthTestAgainstTerrain = originalTerrainDepthTest
    scene.primitives.remove(lines)
  }
}
