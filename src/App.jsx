import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, Loader, AdaptiveDpr } from '@react-three/drei';
import Stand from './Stand.jsx';
import Player from './Player.jsx';
import Joystick from './Joystick.jsx';

const isTouch = typeof window !== 'undefined' &&
  window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

export default function App() {
  const [bounds, setBounds] = useState(null);
  const [showHint, setShowHint] = useState(true);
  const moveRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 72, near: 0.05, far: 200, position: [0, 1.6, 0] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: '#e9e5dd' }}
      >
        <AdaptiveDpr pixelated />
        <hemisphereLight args={[0xffffff, 0x8a8578, 0.9]} />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[6, 12, 6]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />

        {/* Ambiente procedural (reflexos nos metais/LED) — sem depender de CDN. */}
        <Environment resolution={256} background={false}>
          <Lightformer intensity={2} position={[0, 5, -2]} scale={[10, 5, 1]} />
          <Lightformer intensity={1.2} position={[-5, 3, 2]} scale={[5, 5, 1]} />
          <Lightformer intensity={1.2} position={[5, 3, 2]} scale={[5, 5, 1]} />
        </Environment>

        <Suspense fallback={null}>
          <Stand onReady={setBounds} />
        </Suspense>

        {/* Chão amplo para não "flutuar" ao olhar pela frente aberta */}
        {bounds && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[bounds.center.x, bounds.min.y - 0.02, bounds.center.z]}
            receiveShadow
          >
            <planeGeometry args={[300, 300]} />
            <meshStandardMaterial color="#e2ded5" />
          </mesh>
        )}

        <Player bounds={bounds} move={moveRef} look={lookRef} />
      </Canvas>

      {/* Mira central */}
      <div style={{
        position: 'fixed', left: '50%', top: '50%', width: 8, height: 8,
        marginLeft: -4, marginTop: -4, borderRadius: '50%',
        background: 'rgba(255,255,255,0.7)', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)',
        pointerEvents: 'none', zIndex: 10,
      }} />

      {/* Instruções */}
      {showHint && (
        <div style={{
          position: 'fixed', left: '50%', top: 22, transform: 'translateX(-50%)',
          background: 'rgba(15,20,26,0.82)', color: '#fff', padding: '10px 16px',
          borderRadius: 999, fontSize: 14, zIndex: 15, whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          {isTouch
            ? '👆 Arraste para olhar  •  🕹️ joystick para andar'
            : '🖱️ Clique para olhar  •  ⌨️ WASD / setas para andar'}
        </div>
      )}

      {isTouch && <Joystick moveRef={moveRef} />}

      <Loader
        containerStyles={{ background: '#0b0f14' }}
        innerStyles={{ width: 220 }}
        barStyles={{ background: '#ff7a00' }}
        dataInterpolation={(p) => `Carregando estande… ${p.toFixed(0)}%`}
      />
    </>
  );
}
