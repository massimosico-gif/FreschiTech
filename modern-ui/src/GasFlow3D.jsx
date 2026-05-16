import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshTransmissionMaterial, Environment, Sphere, PerspectiveCamera, Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

const Pipe = ({ path, color = "#ffffff" }) => {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(...p)))
  }, [path])

  return (
    <mesh>
      <tubeGeometry args={[curve, 100, 0.15, 12, false]} />
      <MeshTransmissionMaterial 
        backside
        samples={4}
        thickness={0.2}
        chromaticAberration={0.02}
        anisotropy={0.1}
        distortion={0.1}
        distortionScale={0.1}
        temporalDistortion={0.1}
        clearcoat={1}
        attenuationDistance={0.5}
        attenuationColor={color}
        color={color}
      />
    </mesh>
  )
}

const GasParticles = ({ path, count = 200 }) => {
  const points = useRef()
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(...p)))
  }, [path])

  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
      temp.push({
        t: Math.random(),
        speed: 0.0005 + Math.random() * 0.0015,
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08
        )
      })
    }
    return temp
  }, [count])

  const dummy = new THREE.Object3D()
  const meshRef = useRef()

  useFrame(() => {
    particles.forEach((p, i) => {
      p.t += p.speed
      if (p.t > 1) p.t = 0
      
      const pos = curve.getPointAt(p.t)
      dummy.position.copy(pos).add(p.offset)
      dummy.scale.setScalar(Math.sin(p.t * Math.PI) * 0.03 + 0.01)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial 
        color="#00ffff" 
        emissive="#00ffff" 
        emissiveIntensity={2} 
        transparent 
        opacity={0.8} 
      />
    </instancedMesh>
  )
}

const LeakEffect = ({ position }) => {
  const mesh = useRef()
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    mesh.current.scale.setScalar(1 + Math.sin(t * 8) * 0.2)
  })

  return (
    <group position={position}>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial 
          color="#ff3333" 
          emissive="#ff3333" 
          emissiveIntensity={4} 
          transparent 
          opacity={0.3} 
        />
      </mesh>
      <Points count={30}>
        <PointMaterial 
          transparent 
          vertexColors 
          size={0.1} 
          sizeAttenuation={true} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending} 
        />
      </Points>
    </group>
  )
}

const GasFlow3D = () => {
  const path = [
    [-6, -2, -3],
    [-2, 1, -1],
    [1, -1, 0],
    [4, 2, 1],
    [8, -1, 3]
  ]

  const leakPos = [1, -1, 0]

  return (
    <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
      <Canvas 
        style={{ height: '100vh', width: '100vw' }}
        camera={{ position: [0, 0, 10], fov: 40 }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, 10, 10]} intensity={2} />
        
        <Environment preset="city" />
        
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
          <group rotation={[0.1, 0.2, 0]}>
            <Pipe path={path} />
            <GasParticles path={path} count={250} />
            <LeakEffect position={leakPos} />
          </group>
        </Float>
      </Canvas>
    </div>
  )
}

export default GasFlow3D
