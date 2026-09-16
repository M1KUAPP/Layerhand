/*
 * The 3D object below is a port of Canvas UI's Glass Object, vanilla build,
 * trimmed to the SVG path this section needs: model and bitmap loading, the
 * backdrop image and the Draco decoder are gone; everything else is as
 * published. Under prefers-reduced-motion it renders one still frame instead
 * of looping.
 * Source: https://canvasui.dev/r/glass-object-vanilla.json
 * Licence: MIT + Commons Clause, David Haz
 * https://github.com/DavidHDev/canvas-ui/blob/main/LICENSE.md
 */

// bun-types declares no *.svg module; Bun bundles it as text.
// @ts-expect-error
import layersText from '../assets/landing/layers.svg' with { type: 'text' }

// Type-only: erased by the bundler, so first paint never waits on three.
import type * as THREE from 'three'

interface GlassModules {
  THREE: typeof import('three')
  OrbitControls: typeof import('three/addons/controls/OrbitControls.js').OrbitControls
  SVGLoader: typeof import('three/addons/loaders/SVGLoader.js').SVGLoader
  toCreasedNormals: typeof import('three/addons/utils/BufferGeometryUtils.js').toCreasedNormals
}

export interface GlassObjectOptions {
  /** URL of the SVG to display. */
  src?: string
  /** Index of refraction of the glass (1 to 2.33). */
  ior?: number
  /** Thickness of the glass volume in scene units. Drives how strongly light bends. */
  thickness?: number
  /** Surface roughness (0 to 1). Higher values frost the glass. */
  roughness?: number
  /** Chromatic dispersion of the refraction (0 to 2). Splits light into rainbow fringes like real glass. */
  dispersion?: number
  /** Clearcoat layer on top of the glass (0 to 1). */
  clearcoat?: number
  /** Tint color of the glass volume as any CSS color. Empty string keeps the glass clear. */
  tint?: string
  /** How strongly the tint absorbs light through the volume. */
  tintDensity?: number
  /** Extrusion depth of 2D assets (SVG or image) as a fraction of their longest side. */
  depth?: number
  /** Edge rounding of extruded 2D assets (0 to 1). Higher values melt the edges into a liquid lip. */
  bevel?: number
  /** Accent color of the ring light in the studio environment. */
  highlight?: string
  /** Brightness of the studio environment lighting. */
  environmentIntensity?: number
  /** Size of the longest side of the asset in scene units. The camera sits about 4 units away. */
  scale?: number
  /** Horizontal offset of the asset in scene units. */
  xOffset?: number
  /** Vertical offset of the asset in scene units. */
  yOffset?: number
  /** Strength of the floating bob animation (0 disables). */
  floatIntensity?: number
  /** Strength of the idle rocking rotation (0 disables). */
  rotationIntensity?: number
  /** Speed of the float and rocking animation. */
  floatSpeed?: number
  /** Let the user orbit the camera by dragging. */
  orbit?: boolean
  /** Let the user zoom with the scroll wheel or pinch. */
  zoom?: boolean
  /** Spin the camera around the asset turntable-style. */
  autoRotate?: boolean
  /** Turntable speed when autoRotate is on. */
  autoRotateSpeed?: number
  /** Camera field of view in degrees. */
  fov?: number
  /** Camera distance from the center of the asset. */
  cameraDistance?: number
  /** Called after an asset finishes loading. */
  onLoad?: (() => void) | null
  /** Called when an asset fails to load. */
  onError?: ((error: unknown) => void) | null
}

export interface GlassObjectElements {
  /** Canvas the scene renders to. */
  canvas: HTMLCanvasElement
}

export interface GlassObjectInstance {
  /** Update options live. Changing src loads the new asset. */
  setOptions: (options: GlassObjectOptions) => void
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void
  /** Stop the loop and release all GPU resources. */
  destroy: () => void
}

const GLASS_DEFAULTS: Required<GlassObjectOptions> = {
  src: '',
  ior: 1.75,
  thickness: 4,
  roughness: 0.25,
  dispersion: 1.5,
  clearcoat: 0.5,
  tint: '',
  tintDensity: 2,
  depth: 0.1,
  bevel: 1,
  highlight: '#066aff',
  environmentIntensity: 1,
  scale: 3,
  xOffset: 0,
  yOffset: 0,
  floatIntensity: 1,
  rotationIntensity: 1,
  floatSpeed: 2,
  orbit: true,
  zoom: false,
  autoRotate: false,
  autoRotateSpeed: 2,
  fov: 55,
  cameraDistance: 4,
  onLoad: null,
  onError: null
}

const MODEL_LIFT = 0.3

interface FormerDef {
  kind: 'ring' | 'box'
  intensity: number
  position: [number, number, number]
  scale: [number, number, number]
  lookAtCenter?: boolean
  withLight?: boolean
}

const ROOM_BLOCKS: Array<{
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}> = [
  {
    position: [-10.906, -1, 1.846],
    rotation: [0, -0.195, 0],
    scale: [2.328, 7.905, 4.651]
  },
  {
    position: [-5.607, -0.754, -0.758],
    rotation: [0, 0.994, 0],
    scale: [1.97, 1.534, 3.955]
  },
  {
    position: [6.167, -0.16, 7.803],
    rotation: [0, 0.561, 0],
    scale: [3.927, 6.285, 3.687]
  },
  {
    position: [-2.017, 0.018, 6.124],
    rotation: [0, 0.333, 0],
    scale: [2.002, 4.566, 2.064]
  },
  {
    position: [2.291, -0.756, -2.621],
    rotation: [0, -0.286, 0],
    scale: [1.546, 1.552, 1.496]
  },
  {
    position: [-2.193, -0.369, -5.547],
    rotation: [0, 0.516, 0],
    scale: [3.875, 3.487, 2.986]
  }
]

const ROOM_FORMERS: FormerDef[] = [
  {
    kind: 'ring',
    intensity: 15,
    position: [2, 3, -2],
    scale: [10, 10, 10],
    lookAtCenter: true
  },
  {
    kind: 'box',
    intensity: 80,
    position: [-14, 10, 8],
    scale: [0.1, 2.5, 2.5]
  },
  {
    kind: 'box',
    intensity: 80,
    position: [-14, 14, -4],
    scale: [0.1, 2.5, 2.5],
    withLight: true
  },
  {
    kind: 'box',
    intensity: 23,
    position: [14, 12, 0],
    scale: [0.1, 5, 5],
    withLight: true
  },
  {
    kind: 'box',
    intensity: 16,
    position: [0, 9, 14],
    scale: [5, 5, 0.1],
    withLight: true
  },
  {
    kind: 'box',
    intensity: 80,
    position: [7, 8, -14],
    scale: [2.5, 2.5, 0.1],
    withLight: true
  },
  {
    kind: 'box',
    intensity: 80,
    position: [-7, 16, -14],
    scale: [2.5, 2.5, 0.1],
    withLight: true
  },
  {
    kind: 'box',
    intensity: 1,
    position: [0, 20, 0],
    scale: [0.1, 0.1, 0.1],
    withLight: true
  },
  {
    kind: 'box',
    intensity: 20,
    position: [0, 15, 0],
    scale: [10, 1, 10],
    withLight: true
  }
]

function createGlassObject(
  mods: GlassModules,
  elements: GlassObjectElements,
  options: GlassObjectOptions = {}
): GlassObjectInstance | null {
  const { THREE, OrbitControls, SVGLoader, toCreasedNormals } = mods
  const { canvas } = elements
  const config: Required<GlassObjectOptions> = { ...GLASS_DEFAULTS, ...options }

  const CAMERA_DIR = new THREE.Vector3(0, -1, 4).normalize()

  function flattenCapNormals(geometry: THREE.BufferGeometry) {
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    const cb = new THREE.Vector3()
    const ab = new THREE.Vector3()
    for (const group of geometry.groups) {
      if (group.materialIndex !== 0) continue
      for (let i = group.start; i < group.start + group.count; i += 3) {
        a.fromBufferAttribute(position, i)
        b.fromBufferAttribute(position, i + 1)
        c.fromBufferAttribute(position, i + 2)
        cb.subVectors(c, b)
        ab.subVectors(a, b)
        cb.cross(ab).normalize()
        for (let j = 0; j < 3; j++) normal.setXYZ(i + j, cb.x, cb.y, cb.z)
      }
    }
    normal.needsUpdate = true
  }

  function disposeObject(root: THREE.Object3D, keep?: THREE.Material) {
    root.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        if (!material || material === keep) continue
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose()
        }
        material.dispose()
      }
    })
  }

  function roundLoopCorners(points: THREE.Vector2[], radius: number): THREE.Vector2[] {
    const n = points.length
    if (n < 3) return points
    const out: THREE.Vector2[] = []
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n]!
      const curr = points[i]!
      const next = points[(i + 1) % n]!
      const inDir = curr.clone().sub(prev)
      const outDir = next.clone().sub(curr)
      const lenIn = inDir.length()
      const lenOut = outDir.length()
      if (lenIn < 1e-9 || lenOut < 1e-9) continue
      inDir.divideScalar(lenIn)
      outDir.divideScalar(lenOut)
      const angle = Math.acos(Math.min(Math.max(inDir.dot(outDir), -1), 1))
      if (angle < 0.1) {
        out.push(curr.clone())
        continue
      }
      const trim = Math.min(radius, lenIn * 0.5, lenOut * 0.5)
      const p0 = curr.clone().addScaledVector(inDir, -trim)
      const p1 = curr.clone().addScaledVector(outDir, trim)
      const steps = Math.max(2, Math.ceil(angle / 0.3))
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const a2 = (1 - t) * (1 - t)
        const b2 = 2 * (1 - t) * t
        const c2 = t * t
        out.push(new THREE.Vector2(a2 * p0.x + b2 * curr.x + c2 * p1.x, a2 * p0.y + b2 * curr.y + c2 * p1.y))
      }
    }
    return out.length >= 3 ? out : points
  }

  function dedupeClosingPoint(points: THREE.Vector2[]): THREE.Vector2[] {
    if (points.length > 1 && points[0]!.distanceToSquared(points[points.length - 1]!) < 1e-12) {
      return points.slice(0, -1)
    }
    return points
  }

  function roundShapeCorners(shapes: THREE.Shape[], radius: number): THREE.Shape[] {
    if (radius < 1e-6) return shapes
    return shapes.map((shape) => {
      const extracted = shape.extractPoints(24)
      const rounded = new THREE.Shape(roundLoopCorners(dedupeClosingPoint(extracted.shape), radius))
      for (const hole of extracted.holes) {
        rounded.holes.push(new THREE.Path(roundLoopCorners(dedupeClosingPoint(hole), radius)))
      }
      return rounded
    })
  }

  function shapesFromSvg(text: string): THREE.Shape[] {
    const parsed = new SVGLoader().parse(text)
    const shapes: THREE.Shape[] = []
    for (const path of parsed.paths) {
      const style = path.userData?.style as { fill?: string } | undefined
      if (style?.fill === 'none') continue
      shapes.push(...path.toShapes())
    }
    if (shapes.length === 0) {
      for (const path of parsed.paths) {
        shapes.push(...path.toShapes())
      }
    }
    if (shapes.length === 0) throw new Error('No fillable shapes in the SVG')
    return shapes
  }

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
  } catch {
    return null
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(config.fov, 1, 0.1, 200)
  camera.position.copy(CAMERA_DIR).multiplyScalar(config.cameraDistance)

  const floatGroup = new THREE.Group()
  floatGroup.position.y = MODEL_LIFT
  const fitGroup = new THREE.Group()
  floatGroup.add(fitGroup)
  scene.add(floatGroup)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false

  const glass = new THREE.MeshPhysicalMaterial({
    color: 'white',
    metalness: 0,
    transmission: 1,
    clearcoatRoughness: 0.06,
    specularIntensity: 1
  })

  const pmrem = new THREE.PMREMGenerator(renderer)
  let roomScene: THREE.Scene | null = null
  let ringMaterial: THREE.MeshBasicMaterial | null = null
  let envTarget: THREE.WebGLRenderTarget | null = null
  let envDirty = true

  function buildRoom() {
    roomScene = new THREE.Scene()
    const room = new THREE.Group()
    room.position.set(0, -0.5, 0)
    roomScene.add(room)

    for (const [x, z] of [
      [-15, 15],
      [15, 15],
      [15, -15],
      [-15, -15]
    ]) {
      const spot = new THREE.SpotLight('white', 2, 0, 0.2, 1, 0)
      spot.position.set(x!, 20, z!)
      room.add(spot, spot.target)
    }
    const center = new THREE.PointLight('white', 100, 28, 2)
    center.position.set(0.5, 14, 0.5)
    room.add(center)

    const box = new THREE.BoxGeometry()
    const shell = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 'gray', side: THREE.BackSide }))
    shell.position.set(0, 13.2, 0)
    shell.scale.set(31.5, 28.5, 31.5)
    room.add(shell)

    const white = new THREE.MeshStandardMaterial({ color: 'white' })
    for (const def of ROOM_BLOCKS) {
      const mesh = new THREE.Mesh(box, white)
      mesh.position.set(...def.position)
      mesh.rotation.set(...def.rotation)
      mesh.scale.set(...def.scale)
      room.add(mesh)
    }

    for (const def of ROOM_FORMERS) {
      const geometry = def.kind === 'ring' ? new THREE.RingGeometry(0.5, 1, 64) : new THREE.BoxGeometry()
      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        toneMapped: false
      })
      material.color.set(def.kind === 'ring' ? config.highlight : 'white').multiplyScalar(def.intensity)
      if (def.kind === 'ring') ringMaterial = material
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...def.position)
      mesh.scale.set(...def.scale)
      if (def.lookAtCenter) mesh.lookAt(0, 0, 0)
      room.add(mesh)
      if (def.withLight) {
        const light = new THREE.PointLight('white', 100, 28, 2)
        light.position.set(...def.position)
        room.add(light)
      }
    }
  }

  function refreshEnvironment() {
    if (!roomScene) buildRoom()
    if (ringMaterial) {
      ringMaterial.color.set(config.highlight).multiplyScalar(15)
    }
    envTarget?.dispose()
    envTarget = pmrem.fromScene(roomScene!, 0.6, 0.1, 1000)
    scene.environment = envTarget.texture
  }

  let model: THREE.Object3D | null = null
  let modelMaxDim = 1
  let assetShapes: THREE.Shape[] | null = null
  let builtDepth = -1
  let builtBevel = -1
  let loadedSrc: string | null = null
  let loadToken = 0
  let disposed = false

  function applyFit() {
    if (!model) return
    fitGroup.scale.setScalar(config.scale / modelMaxDim)
    glass.thickness = Math.max(config.thickness, 0) / fitGroup.scale.x
  }

  function clearModel() {
    if (!model) return
    fitGroup.remove(model)
    disposeObject(model, glass)
    model = null
  }

  function clearAsset() {
    assetShapes = null
    builtDepth = -1
    builtBevel = -1
    clearModel()
  }

  function mountModel(next: THREE.Object3D) {
    clearModel()
    model = next
    const bounds = new THREE.Box3().setFromObject(model)
    const size = bounds.getSize(new THREE.Vector3())
    const offset = bounds.getCenter(new THREE.Vector3())
    modelMaxDim = Math.max(size.x, size.y, size.z, 1e-4)
    model.position.sub(offset)
    applyFit()
    fitGroup.add(model)
  }

  function buildModel() {
    if (!assetShapes) return

    const depth = Math.min(Math.max(config.depth, 0.02), 1)
    const bevel = Math.min(Math.max(config.bevel, 0), 1)
    if (model && depth === builtDepth && bevel === builtBevel) return
    builtDepth = depth
    builtBevel = bevel

    const box = new THREE.Box2()
    for (const shape of assetShapes) {
      for (const point of shape.getPoints(4)) box.expandByPoint(point)
    }
    const size2d = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, 1e-4)
    const depthUnits = depth * size2d
    const bevelAmount = bevel * depthUnits * 0.5

    const shapes = roundShapeCorners(assetShapes, bevelAmount * 1.25)
    let geometry: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shapes, {
      depth: Math.max(depthUnits - bevelAmount * 2, depthUnits * 0.1),
      bevelEnabled: bevelAmount > 1e-4,
      bevelThickness: bevelAmount,
      bevelSize: bevelAmount * 0.9,
      bevelOffset: 0,
      bevelSegments: 12,
      curveSegments: 24
    })
    geometry = toCreasedNormals(geometry, Math.PI / 7)
    flattenCapNormals(geometry)
    geometry.rotateX(Math.PI)
    mountModel(new THREE.Mesh(geometry, glass))
  }

  async function loadAsset() {
    const src = config.src
    if (src === loadedSrc) return
    loadedSrc = src
    const token = ++loadToken
    if (!src) {
      clearAsset()
      return
    }
    try {
      const response = await fetch(src)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const text = await response.text()
      if (disposed || token !== loadToken) return
      clearAsset()
      assetShapes = shapesFromSvg(text)
      buildModel()
      config.onLoad?.()
    } catch (error) {
      if (disposed || token !== loadToken) return
      config.onError?.(error)
    }
  }

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let reducedMotion = motionQuery.matches
  const onMotionChange = () => {
    reducedMotion = motionQuery.matches
    if (reducedMotion) floatGroup.rotation.set(0, 0, 0)
    applyOptions()
    if (!reducedMotion) startLoop()
  }
  motionQuery.addEventListener('change', onMotionChange)

  function applyOptions() {
    scene.background = null
    renderer.setClearColor('black', 0)
    scene.environmentIntensity = config.environmentIntensity
    controls.enableRotate = config.orbit
    controls.enableZoom = config.zoom
    controls.autoRotate = config.autoRotate && !reducedMotion
    controls.autoRotateSpeed = config.autoRotateSpeed
    camera.fov = config.fov
    camera.updateProjectionMatrix()
    floatGroup.position.x = config.xOffset
    floatGroup.position.y = MODEL_LIFT + config.yOffset

    glass.ior = Math.min(Math.max(config.ior, 1), 2.333)
    glass.roughness = Math.min(Math.max(config.roughness, 0), 1)
    glass.dispersion = Math.max(config.dispersion, 0)
    glass.clearcoat = Math.min(Math.max(config.clearcoat, 0), 1)
    if (config.tint) {
      glass.attenuationColor.set(config.tint)
      glass.attenuationDistance = 1.5 / Math.max(config.tintDensity, 0.01)
    } else {
      glass.attenuationColor.set('white')
      glass.attenuationDistance = Infinity
    }

    applyFit()
    buildModel()
  }

  function resize() {
    const width = Math.max(canvas.clientWidth, 1)
    const height = Math.max(canvas.clientHeight, 1)
    const pr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(pr)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()
  applyOptions()
  loadAsset()

  let inView = true
  let loopRunning = false

  function tick(time: number) {
    if (!inView) {
      lastTime = 0
      stopLoop()
      return
    }
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0
    lastTime = time
    if (envDirty) {
      envDirty = false
      refreshEnvironment()
    }
    controls.update()

    if (!reducedMotion) {
      elapsed += delta * config.floatSpeed
      floatGroup.rotation.x = (Math.cos(elapsed / 4) / 8) * config.rotationIntensity
      floatGroup.rotation.y = (Math.sin(elapsed / 4) / 8) * config.rotationIntensity
      floatGroup.rotation.z = (Math.sin(elapsed / 4) / 20) * config.rotationIntensity
      floatGroup.position.y = MODEL_LIFT + config.yOffset + (Math.sin(elapsed / 1.5) / 10) * config.floatIntensity
    }

    renderer.render(scene, camera)
    if (reducedMotion && model) stopLoop()
  }

  function startLoop() {
    if (loopRunning || !inView || disposed) return
    loopRunning = true
    renderer.setAnimationLoop(tick)
  }

  function stopLoop() {
    if (!loopRunning) return
    loopRunning = false
    renderer.setAnimationLoop(null)
  }

  const viewObserver =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          inView = entries[entries.length - 1]?.isIntersecting ?? true
          if (inView) {
            startLoop()
          } else {
            stopLoop()
          }
        })
      : null
  viewObserver?.observe(canvas)

  let lastTime = 0
  let elapsed = Math.random() * 100

  startLoop()

  return {
    setOptions(next: GlassObjectOptions) {
      let changed = false
      for (const [key, value] of Object.entries(next)) {
        if (typeof value === 'function') continue
        if (config[key as keyof GlassObjectOptions] !== value) {
          changed = true
          break
        }
      }
      if (!changed) {
        Object.assign(config, next)
        return
      }

      const previousHighlight = config.highlight
      const previousDistance = config.cameraDistance
      Object.assign(config, next)
      if (config.highlight !== previousHighlight) envDirty = true
      if (config.cameraDistance !== previousDistance) {
        camera.position.copy(CAMERA_DIR).multiplyScalar(config.cameraDistance)
      }
      applyOptions()
      loadAsset()
      startLoop()
    },
    resize,
    destroy() {
      disposed = true
      loadToken += 1
      stopLoop()
      observer.disconnect()
      viewObserver?.disconnect()
      motionQuery.removeEventListener('change', onMotionChange)
      controls.dispose()
      clearAsset()
      if (roomScene) disposeObject(roomScene)
      envTarget?.dispose()
      pmrem.dispose()
      glass.dispose()
      renderer.dispose()
    }
  }
}

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag)
  if (className) result.className = className
  if (text !== undefined) result.textContent = text
  return result
}

// The flat fallback needs the markup inlined: an <img> could not see the
// page's custom properties, which carry the slab colours.
function flatArt(): SVGSVGElement | null {
  const parsed = new DOMParser().parseFromString(layersText, 'image/svg+xml')
  const art = parsed.documentElement
  if (!(art instanceof SVGSVGElement) || art.querySelector('parsererror')) return null
  art.classList.add('glass__art')
  return art
}

const FACTS: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: 'hgi-layer-mask-01',
    title: 'Repaint a mask',
    body: 'Masks stay separate from the pixels, so fixing an edge is a brush stroke, not a redo.'
  },
  {
    icon: 'hgi-sliders-horizontal',
    title: 'Retune an adjustment',
    body: 'An adjustment is a setting on its own layer. Change the number and the photograph follows.'
  },
  {
    icon: 'hgi-view-off',
    title: 'Hide a layer',
    body: 'Every edit sits on a layer of its own. Turn one off and the rest stay as they were.'
  }
]

// three arrives only after the flat SVG is on the page, so first paint and
// the hero never wait on it, and any failure leaves the fallback in place.
async function mountGlass(host: HTMLElement, fallback: SVGSVGElement | null): Promise<void> {
  const probe = document.createElement('canvas')
  if (!(probe.getContext('webgl2') ?? probe.getContext('webgl'))) return

  let mods: GlassModules
  try {
    const [three, orbit, svg, buffers] = await Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
      import('three/addons/loaders/SVGLoader.js'),
      import('three/addons/utils/BufferGeometryUtils.js')
    ])
    mods = {
      THREE: three,
      OrbitControls: orbit.OrbitControls,
      SVGLoader: svg.SVGLoader,
      toCreasedNormals: buffers.toCreasedNormals
    }
  } catch {
    return
  }

  const canvas = document.createElement('canvas')
  canvas.className = 'glass__canvas'
  const src = URL.createObjectURL(new Blob([layersText], { type: 'image/svg+xml' }))
  const highlight = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  try {
    host.append(canvas)
    const instance = createGlassObject(
      mods,
      { canvas },
      {
        src,
        orbit: false,
        highlight: highlight || undefined,
        onLoad: () => fallback?.remove(),
        onError: () => {
          canvas.remove()
          URL.revokeObjectURL(src)
        }
      }
    )
    if (!instance) {
      canvas.remove()
      URL.revokeObjectURL(src)
    }
  } catch {
    canvas.remove()
    URL.revokeObjectURL(src)
  }
}

export function renderGlass(): HTMLElement {
  const section = node('section', 'glass')
  section.dataset.section = 'glass'
  section.setAttribute('aria-labelledby', 'glass-title')

  const object = node('div', 'glass__object')
  object.setAttribute('aria-hidden', 'true')
  const art = flatArt()
  if (art) object.append(art)

  const copy = node('div', 'glass__copy')
  copy.append(node('p', 'glass__eyebrow', 'After the run'))
  const title = node('h2', 'glass__title', 'Still yours to edit.')
  title.id = 'glass-title'
  copy.append(title)
  copy.append(
    node('p', 'glass__body', 'Nothing in the file is baked in. Open the PSD and carry on where the agent stopped.')
  )
  const facts = node('ul', 'glass__facts')
  for (const fact of FACTS) {
    const item = node('li', 'glass__fact')
    const icon = node('i', `glass__fact-icon hgi-stroke ${fact.icon}`)
    icon.setAttribute('aria-hidden', 'true')
    item.append(icon, node('h3', 'glass__fact-title', fact.title), node('p', 'glass__fact-body', fact.body))
    facts.append(item)
  }
  copy.append(facts)

  section.append(object, copy)

  // The renderer starts a beat after the entrance gate is done, so three's
  // parse and first renders never contend with the hero reveal or with
  // whatever the visitor does in the first second after it. The flat SVG
  // covers the wait.
  const root = document.documentElement
  const start = () => window.setTimeout(() => void mountGlass(object, art), 1000)
  if (root.dataset.enter === 'done') {
    start()
  } else {
    const gate = new MutationObserver(() => {
      if (root.dataset.enter === 'done') {
        gate.disconnect()
        start()
      }
    })
    gate.observe(root, { attributes: true, attributeFilter: ['data-enter'] })
  }
  return section
}
