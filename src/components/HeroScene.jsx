import { useRef, useEffect, Suspense, useMemo, useState, Component } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// GLB models loaded from public directory at runtime
const MODELS = {
  leaf: '/hero/object_leaf.glb',
  lens: '/hero/object_lens.glb',
  seedPod: '/hero/object_seedpod.glb',
  treeSlice: '/hero/object_treeslice.glb',
  herbarium: '/hero/object_herbarium.glb',
}

// Object definitions with refined forward-facing rotations
const OBJECTS = [
  {
    name: 'treeSlice',
    model: MODELS.treeSlice,
    entranceStep: 4,
    position: [-2.2, 1.2, 0],
    scale: 2.0,
    rotation: [0, 0, 0],
    parallax: 0.35,
  },
  {
    name: 'seedPod',
    model: MODELS.seedPod,
    entranceStep: 5,
    position: [2.2, 1.2, 0],
    scale: 2.0,
    rotation: [0, Math.PI / 2, 0],
    parallax: 0.28,
  },
  {
    name: 'lens',
    model: MODELS.lens,
    entranceStep: 6,
    position: [-1.8, -1.0, 0],
    scale: 1.5,
    rotation: [Math.PI / 2, 0, 0],
    parallax: 0.22,
  },
  {
    name: 'herbarium',
    model: MODELS.herbarium,
    entranceStep: 7,
    position: [2.2, -1.2, 0],
    scale: 2.0,
    rotation: [0, 0, 0],
    parallax: 0.25,
  },
  {
    name: 'leaf',
    model: MODELS.leaf,
    entranceStep: 8,
    position: [1.8, 0.1, -1],
    scale: 1.5,
    rotation: [0, Math.PI, 0],
    parallax: 0.45,
  },
]

function GLBModel({ name, modelPath, entranceStep, position, scale, rotation, parallax, entranceProgress, mousePos, debugMode, debugIndex }) {
  const { scene } = useGLTF(modelPath)
  const ref = useRef()
  const opacityRef = useRef(0)
  const clonedScene = useMemo(() => scene.clone(), [scene])

  const isDragging = useRef(false)
  const rotationVelocity = useRef(0)
  const lastPointerX = useRef(0)

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        // FORCE HIGH-VISIBILITY MATERIALS
        child.material = new THREE.MeshStandardMaterial({
          color: child.material.color || new THREE.Color(0xffffff),
          map: child.material.map,
          normalMap: child.material.normalMap,
          roughness: 0.5,
          metalness: 0.2,
          transparent: false,
          depthWrite: true,
          blending: THREE.NormalBlending,
        })
      }
    })
  }, [clonedScene])

  const handlePointerDown = (e) => {
    if (debugMode) return
    e.stopPropagation()
    isDragging.current = true
    lastPointerX.current = e.clientX

    const handleMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - lastPointerX.current
      const sensitivity = 0.005
      if (ref.current) {
        ref.current.rotation.y += deltaX * sensitivity
        rotationVelocity.current = deltaX * sensitivity
      }
      lastPointerX.current = moveEvent.clientX
    }

    const handleUp = () => {
      isDragging.current = false
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  useFrame(() => {
    if (!ref.current) return

    const visible = entranceProgress >= entranceStep
    const target = visible ? 1 : 0
    opacityRef.current += (target - opacityRef.current) * 0.05

    if (debugMode) {
      ref.current.position.set(0, 0, 0)
    } else {
      const px = position[0] + mousePos.targetX * parallax * 0.15
      const py = position[1] - mousePos.targetY * parallax * 0.12
      ref.current.position.set(px, py, position[2])
    }

    ref.current.rotation.z = rotation[2] + (debugMode ? 0 : mousePos.targetX * parallax * 0.03)

    if (!isDragging.current && !debugMode) {
      ref.current.rotation.y += rotationVelocity.current
      rotationVelocity.current *= 0.95
      if (Math.abs(rotationVelocity.current) < 0.001) {
        ref.current.rotation.y += 0.002
      }
    }

    ref.current.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = opacityRef.current
      }
    })
  })

  return (
    <primitive
      ref={ref}
      object={clonedScene}
      position={position}
      rotation={rotation}
      scale={[scale, scale, scale]}
      onPointerDown={handlePointerDown}
      onPointerOver={() => (document.body.style.cursor = debugMode ? 'default' : 'grab')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    />
  )
}

function CameraController({ mousePos }) {
  const { camera } = useThree()
  useFrame(() => {
    camera.position.x += (mousePos.targetX * 0.15 - camera.position.x) * 0.03
    camera.position.y += (-mousePos.targetY * 0.1 - camera.position.y) * 0.03
    camera.lookAt(0, 0, 0)
  })
  return null
}

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#01B998]/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64D431" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className="text-[#64D431]/70 text-sm font-mono">3D scene unavailable</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function HeroScene({ entranceStep, mousePos }) {
  const [debugMode, setDebugMode] = useState(false)
  const [debugIndex, setDebugIndex] = useState(0)
  const containerRef = useRef(null)
  const glRef = useRef(null)
  const [webglFailed, setWebglFailed] = useState(false)

  const handleCreated = ({ gl, scene, camera }) => {
    glRef.current = gl

    // If WebGL context was lost, attempt to restore
    gl.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
    }, { passive: false })

    gl.domElement.addEventListener('webglcontextrestored', () => {
      gl.setClearColor(0x000000, 0)
      gl.render(scene, camera)
    }, { passive: true })
  }

  // Detect WebGL context creation failure (happens on some mobile GPUs)
  useEffect(() => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      setWebglFailed(true)
    }
  }, [])

  if (webglFailed) {
    return (
      <div className="absolute inset-0 z-10 pointer-events-auto w-full h-full flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#01B998]/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64D431" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <p className="text-[#64D431]/70 text-sm font-mono">3D scene requires WebGL</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 pointer-events-auto w-full h-full">
      {debugMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4 bg-black/80 p-4 rounded-xl text-white font-mono text-xs border border-white/20">
          <p className="font-bold text-sm uppercase tracking-widest text-[#AEE515]">Debug Mode: Model Orientation</p>
          <div className="flex gap-2">
            {OBJECTS.map((obj, i) => (
              <button
                key={obj.name}
                onClick={() => setDebugIndex(i)}
                className={`px-2 py-1 rounded ${debugIndex === i ? 'bg-[#AEE515] text-black' : 'bg-white/10'}`}
              >
                {obj.name}
              </button>
            ))}
          </div>
          <p>Use Mouse to Rotate. Note the angles in the console.</p>
          <button onClick={() => setDebugMode(false)} className="mt-2 px-4 py-2 bg-red-500 rounded font-bold">Exit Debug</button>
        </div>
      )}

      <CanvasErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 50 }}
          gl={{
            alpha: true,
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
          dpr={[1, 1.5]}
          onCreated={handleCreated}
        >
          {/* STUDIO LIGHTING SETUP */}
          <ambientLight intensity={1.0} />
          <hemisphereLight intensity={0.8} color="#ffffff" groundColor="#000000" />
          <directionalLight position={[0, 0, 10]} intensity={2.0} color="#ffffff" />
          <directionalLight position={[10, 10, 10]} intensity={1.0} color="#ffffff" />
          <directionalLight position={[-10, 10, 10]} intensity={1.0} color="#ffffff" />
          <directionalLight position={[0, 10, 0]} intensity={0.5} color="#ffffff" />
          <pointLight position={[0, 0, 5]} intensity={1.5} color="#AEE515" />

          <Suspense fallback={null}>
            {debugMode ? (
              <>
                <GLBModel
                  name={OBJECTS[debugIndex].name}
                  modelPath={OBJECTS[debugIndex].model}
                  entranceStep={0}
                  position={[0, 0, 0]}
                  scale={2}
                  rotation={OBJECTS[debugIndex].rotation}
                  parallax={0}
                  entranceProgress={11}
                  mousePos={mousePos}
                  debugMode={true}
                  debugIndex={debugIndex}
                />
                <OrbitControls enablePan={false} enableZoom={true} />
              </>
            ) : (
              OBJECTS.map((obj) => (
                <GLBModel
                  key={obj.name}
                  name={obj.name}
                  modelPath={obj.model}
                  entranceStep={obj.entranceStep}
                  position={obj.position}
                  scale={obj.scale}
                  rotation={obj.rotation}
                  parallax={obj.parallax}
                  entranceProgress={entranceStep}
                  mousePos={mousePos}
                  debugMode={false}
                  debugIndex={0}
                />
              ))
            )}
          </Suspense>
          {!debugMode && <CameraController mousePos={mousePos} />}
        </Canvas>
      </CanvasErrorBoundary>

      {import.meta.env.DEV && (
        <button
          onClick={() => setDebugMode(true)}
          className="absolute bottom-4 right-4 z-50 opacity-20 hover:opacity-100 bg-white/10 text-white text-[10px] px-2 py-1 rounded"
        >
          Debug Rotations
        </button>
      )}
    </div>
  )
}

OBJECTS.forEach((obj) => {
  useGLTF.preload(obj.model)
})
