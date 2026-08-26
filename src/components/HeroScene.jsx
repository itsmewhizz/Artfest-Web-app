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
    position: [-0.65, 0.35, 0],
    scale: 1.8,
    rotation: [0, 0, -0.21],
    parallax: 0.35,
  },
  {
    name: 'seedPod',
    model: MODELS.seedPod,
    entranceStep: 5,
    position: [0.65, 0.4, 0],
    scale: 1.2,
    rotation: [0, 0, 0.26],
    parallax: 0.28,
  },
  {
    name: 'treeSlice',
    model: MODELS.treeSlice,
    entranceStep: 6,
    position: [-0.55, -0.4, 0],
    scale: 1.1,
    rotation: [0, 0, -0.14],
    parallax: 0.22,
  },
  {
    name: 'herbarium',
    model: MODELS.herbarium,
    entranceStep: 7,
    position: [0.6, -0.35, 0],
    scale: 1.3,
    rotation: [0, 0, 0.1],
    parallax: 0.25,
  },
  {
    name: 'lens',
    model: MODELS.lens,
    entranceStep: 8,
    position: [-0.4, 0.15, 2],
    scale: 1.1,
    rotation: [0, 0, -0.31],
    parallax: 0.45,
  },
]

function GLBModel({ name, modelPath, entranceStep, position, scale, rotation, parallax, entranceProgress, mousePos }) {
  const { scene } = useGLTF(modelPath)
  const ref = useRef()
  const opacityRef = useRef(0)
  const clonedScene = useMemo(() => scene.clone(), [scene])

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.material.transparent = true
        child.material.depthWrite = false
        child.material.blending = THREE.AdditiveBlending
        child.material.color = new THREE.Color(1, 1, 1)
      }
    })
  }, [clonedScene])

  useFrame(() => {
    if (!ref.current) return

    const visible = entranceProgress >= entranceStep
    const target = visible ? 1 : 0
    opacityRef.current += (target - opacityRef.current) * 0.04

    const scaleVal = visible ? scale : scale * 0.85
    const currentScale = ref.current.scale.x
    const newScale = currentScale + (scaleVal - currentScale) * 0.04

    ref.current.scale.set(newScale, newScale, newScale)

    const px = position[0] + mousePos.targetX * parallax * 0.08
    const py = position[1] - mousePos.targetY * parallax * 0.06
    ref.current.position.x += (px - ref.current.position.x) * 0.05
    ref.current.position.y += (py - ref.current.position.y) * 0.05

    ref.current.rotation.z = rotation[2] + mousePos.targetX * parallax * 0.03

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
    <div className="absolute inset-0 z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.NoToneMapping }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
        <directionalLight position={[-3, 2, 4]} intensity={0.4} color="#01B998" />
        <pointLight position={[0, 0, 3]} intensity={0.5} color="#AEE515" />

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
