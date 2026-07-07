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
  const [mode, setMode] = useState('walk'); // 'walk' | 'drone'
  const [showHint, setShowHint] = useState(true);
  const moveRef = useRef({ x: 0, y: 0 });
  const vertRef = useRef(0);
  const lookRef = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(t);
  }, [mode]);

  // Atalho de teclado "V" alterna Pessoa/Drone (útil no desktop com mouse travado).
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyV') setMode((m) => (m === 'walk' ? 'drone' : 'walk'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const holdVert = (v) => ({
    onPointerDown: (e) => { e.preventDefault(); vertRef.current = v; },
    onPointerUp: () => { vertRef.current = 0; },
    onPointerLeave: () => { vertRef.current = 0; },
    onPointerCancel: () => { vertRef.current = 0; },
  });

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 72, near: 0.05, far: 400, position: [0, 1.6, 0] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: '#e9e5dd' }}
      >
        <AdaptiveDpr pixelated />
        <hemisphereLight args={[0xffffff, 0x8a8578, 0.85]} />
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[6, 14, 6]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
        />

        <Environment resolution={256} background={false}>
          <Lightformer intensity={2} position={[0, 6, -3]} scale={[12, 6, 1]} />
          <Lightformer intensity={1.2} position={[-6, 4, 3]} scale={[6, 6, 1]} />
          <Lightformer intensity={1.2} position={[6, 4, 3]} scale={[6, 6, 1]} />
        </Environment>

        <Suspense fallback={null}>
          <Stand onReady={setBounds} />
        </Suspense>

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

        <Player bounds={bounds} mode={mode} move={moveRef} vertical={vertRef} look={lookRef} />
      </Canvas>

      {/* Mira central (só no modo Pessoa) */}
      {mode === 'walk' && (
        <div style={{
          position: 'fixed', left: '50%', top: '50%', width: 8, height: 8,
          marginLeft: -4, marginTop: -4, borderRadius: '50%',
          background: 'rgba(255,255,255,0.7)', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)',
          pointerEvents: 'none', zIndex: 10,
        }} />
      )}

      {/* Botão de alternar modo */}
      <button
        onClick={() => setMode((m) => (m === 'walk' ? 'drone' : 'walk'))}
        style={{
          position: 'fixed', right: 16, top: 16, zIndex: 30,
          background: 'rgba(15,20,26,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
          padding: '10px 16px', borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {mode === 'walk' ? '🚶 Pessoa  →  🚁 Drone' : '🚁 Drone  →  🚶 Pessoa'}
      </button>

      {/* Instruções */}
      {showHint && (
        <div style={{
          position: 'fixed', left: '50%', top: 22, transform: 'translateX(-50%)',
          background: 'rgba(15,20,26,0.82)', color: '#fff', padding: '10px 16px',
          borderRadius: 999, fontSize: 14, zIndex: 15, textAlign: 'center', maxWidth: '92vw',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          {isTouch
            ? (mode === 'walk'
                ? '👆 Arraste para olhar  •  🕹️ joystick para andar'
                : '👆 Arraste para olhar  •  🕹️ mover  •  ↑↓ subir/descer')
            : (mode === 'walk'
                ? '🖱️ Clique para olhar  •  ⌨️ WASD / setas para andar  •  V = modo drone'
                : '🖱️ WASD para voar  •  Espaço = sobe, Shift = desce  •  V = modo pessoa')}
        </div>
      )}

      {isTouch && <Joystick moveRef={moveRef} />}

      {/* Botões de altitude (celular, modo drone) */}
      {isTouch && mode === 'drone' && (
        <div style={{ position: 'fixed', right: 24, bottom: 28, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[['↑', 1], ['↓', -1]].map(([label, v]) => (
            <div key={label} {...holdVert(v)} style={{
              width: 66, height: 66, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.3)',
              color: '#fff', fontSize: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'none', userSelect: 'none',
            }}>{label}</div>
          ))}
        </div>
      )}

      <Loader
        containerStyles={{ background: '#0b0f14' }}
        innerStyles={{ width: 220 }}
        barStyles={{ background: '#ff7a00' }}
        dataInterpolation={(p) => `Carregando estande… ${p.toFixed(0)}%`}
      />
    </>
  );
}
