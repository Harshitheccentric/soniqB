/**
 * Antigravity - Ambient particle animation using Three.js
 * 
 * A magnetic field simulation with configurable particles that create
 * a calming, observatory-like atmosphere. Designed to be non-interactive
 * and performant at 60fps.
 * 
 * Usage:
 * <Antigravity
 *   count={300}
 *   magnetRadius={6}
 *   color="#8d5a97"
 *   autoAnimate
 * />
 */

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AntigravityProps } from '../../types';

interface ParticleSystemProps extends Required<Omit<AntigravityProps, 'autoAnimate'>> {
  autoAnimate: boolean;
}

function ParticleSystem({
  count,
  ringRadius,
  waveSpeed,
  waveAmplitude,
  particleSize,
  lerpSpeed,
  color,
  autoAnimate,
  particleVariance,
  rotationSpeed,
  depthFactor,
  pulseSpeed,
  particleShape,
  fieldStrength,
}: ParticleSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const timeRef = useRef(0);

  // Create particle geometry based on shape
  const geometry = useMemo(() => {
    switch (particleShape) {
      case 'sphere':
        return new THREE.SphereGeometry(particleSize * 0.5, 8, 8);
      case 'box':
        return new THREE.BoxGeometry(particleSize, particleSize, particleSize);
      case 'capsule':
      default:
        return new THREE.CapsuleGeometry(particleSize * 0.3, particleSize, 4, 8);
    }
  }, [particleShape, particleSize]);

  // Create material with color
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.7,
      roughness: 0.5,
      metalness: 0.3,
    });
  }, [color]);

  // Initialize particle positions and velocities
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = ringRadius + (Math.random() - 0.5) * particleVariance;

      temp.push({
        position: new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi) * depthFactor
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        originalPosition: new THREE.Vector3(),
        scale: 0.8 + Math.random() * 0.4,
      });
      temp[i].originalPosition.copy(temp[i].position);
    }
    return temp;
  }, [count, ringRadius, particleVariance, depthFactor]);

  // Animation loop
  useFrame((_state, delta) => {
    if (!meshRef.current || !autoAnimate) return;

    timeRef.current += delta;
    const time = timeRef.current;

    const dummy = new THREE.Object3D();
    const magneticCenter = new THREE.Vector3(0, 0, 0);

    particles.forEach((particle, i) => {
      // Apply wave motion
      const waveOffset = Math.sin(time * waveSpeed + i * 0.1) * waveAmplitude;
      
      // Apply magnetic field force
      const distanceToCenter = particle.position.distanceTo(magneticCenter);
      const forceMagnitude = fieldStrength / (distanceToCenter * distanceToCenter + 1);
      
      const forceDirection = new THREE.Vector3()
        .subVectors(magneticCenter, particle.position)
        .normalize()
        .multiplyScalar(forceMagnitude * 0.01);

      // Add force to velocity
      particle.velocity.add(forceDirection);
      
      // Apply damping
      particle.velocity.multiplyScalar(0.95);
      
      // Update position
      particle.position.add(particle.velocity);
      
      // Apply wave to y-axis
      particle.position.y += waveOffset * 0.01;

      // Lerp back to original position (creates orbit-like behavior)
      particle.position.lerp(particle.originalPosition, lerpSpeed);

      // Apply rotation
      const rotationAmount = time * rotationSpeed;
      const rotatedPos = new THREE.Vector3(
        particle.position.x * Math.cos(rotationAmount) - particle.position.z * Math.sin(rotationAmount),
        particle.position.y,
        particle.position.x * Math.sin(rotationAmount) + particle.position.z * Math.cos(rotationAmount)
      );

      // Apply pulsing scale
      const pulseScale = particle.scale * (1 + Math.sin(time * pulseSpeed + i) * 0.2);

      dummy.position.copy(rotationSpeed > 0 ? rotatedPos : particle.position);
      dummy.scale.setScalar(pulseScale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false}>
      {/* Material is set via args */}
    </instancedMesh>
  );
}

export default function Antigravity({
  count = 300,
  magnetRadius = 6,
  ringRadius = 7,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 1.5,
  lerpSpeed = 0.05,
  color = '#8d5a97',
  autoAnimate = true,
  particleVariance = 1,
  rotationSpeed = 0,
  depthFactor = 1,
  pulseSpeed = 3,
  particleShape = 'capsule',
  fieldStrength = 10,
}: AntigravityProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <ParticleSystem
          count={count}
          magnetRadius={magnetRadius}
          ringRadius={ringRadius}
          waveSpeed={waveSpeed}
          waveAmplitude={waveAmplitude}
          particleSize={particleSize}
          lerpSpeed={lerpSpeed}
          color={color}
          autoAnimate={autoAnimate}
          particleVariance={particleVariance}
          rotationSpeed={rotationSpeed}
          depthFactor={depthFactor}
          pulseSpeed={pulseSpeed}
          particleShape={particleShape}
          fieldStrength={fieldStrength}
        />
      </Canvas>
    </div>
  );
}
