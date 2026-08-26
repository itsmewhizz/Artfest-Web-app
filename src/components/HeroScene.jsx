import { useRef, useEffect, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// GLB models loaded from public directory at runtime
const MODELS = {
  leaf: '/hero/object_leaf.glb',
  lens: '/hero/object_lens.glb',
  seedPod: '/hero/object_seedpod.glb',
  treeSlice: '/hero/object_treeslice.glb',
  herbarium: '/hero/object_herbarium.glb',
}

// Object definitions matching current image positions
const OBJECTS = [
  {
    name: 'leaf',
    model: MODELS.leaf,
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
    rotation: [0, 0, 0],
    parallax: 0.28,
  },
  {
    name: 'treeSlice',
    model: MODELS.treeSlice,
    entranceStep: 6,
    position: [-1.8, -1.0, 0],
    scale: 1.5,
    rotation: [0, 0, 0],
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
    name: 'lens',
    model: MODELS.lens,
    entranceStep: 8,
    position: [1.8, 0.1, -1],
    scale: 1.5,
    rotation: [0, 0, 0],
    parallax: 0.45,
  },
]

function GLBModel({ name, modelPath, entranceStep, position, scale, rotation, parallax, entranceProgress, mousePos }) {
  const { scene } = useGLTF(modelPath)
  const ref = useRef()
  const opacityRef = useRef(0)
  const clonedScene = useMemo(() => scene.clone(), [scene])

  // Interaction state
  const isDragging = useRef(false)
  const rotationVelocity = useRef(0)
  const lastPointerX = useRef(0)

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.material.transparent = false
        child.material.depthWrite = true
        child.material.blending = THREE.NormalBlending
        child.material.color = new THREE.Color(1, 1, 1)
      }
    })
  }, [clonedScene])

  const handlePointerDown = (e) => {
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

    // Fixed entrance logic: Use a simpler visibility check
    const visible = entranceProgress >= entranceStep
    const target = visible ? 1 : 0
    opacityRef.current += (target - opacityRef.current) * 0.05

    // Parallax: Apply offset to the position relative to the base slot position
    const px = position[0] + mousePos.targetX * parallax * 0.15
    const py = position[1] - mousePos.targetY * parallax * 0.12

    ref.current.position.set(px, py, position[2])

    ref.current.rotation.z = rotation[2] + mousePos.targetX * parallax * 0.03

    // Turntable Rotation Logic
    if (!isDragging.current) {
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
      onPointerOver={() => (document.body.style.cursor = 'grab')}
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

function LoadingFallback() {
  return null
}

export default function HeroScene({ entranceStep, mousePos }) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-auto">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.NoToneMapping }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.6} />
        <hemisphereLight intensity={0.5} color="#ffffff" groundColor="#000000" />
        <directionalLight position={[0, 0, 5]} intensity={1.0} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
        <directionalLight position={[-3, 2, 4]} intensity={0.4} color="#01B998" />
        <pointLight position={[0, 0, 3]} intensity={0.8} color="#AEE515" />

        <Suspense fallback={<LoadingFallback />}>
          {OBJECTS.map((obj) => (
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
            />
          ))}
        </Suspense>

        <CameraController mousePos={mousePos} />
      </Canvas>
    </div>
  )
}

// Preload all models
OBJECTS.forEach((obj) => {
  useGLTF.preload(obj.model)
})
