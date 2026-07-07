import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Loader, AdaptiveDpr, OrbitControls } from '@react-three/drei';
import Stand from './Stand.jsx';
import Player from './Player.jsx';
import Joystick from './Joystick.jsx';

const isTouch = typeof window !== 'undefined' &&
  window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

// Câmera de órbita (estilo SketchUp/Sketchfab): arrasta gira, scroll zoom,
// botão direito faz pan. Damping ligado = movimento fluido.
function OrbitRig({ bounds }) {
  const { camera } = useThree();
  const ctrl = useRef();
  const maxDim = bounds ? Math.max(bounds.size.x, bounds.size.y, bounds.size.z) : 10;

  useEffect(() => {
    if (!bounds || !ctrl.current) return;
    const { center } = bounds;
    camera.position.set(center.x + maxDim * 0.75, center.y + maxDim * 0.5, center.z + maxDim * 1.05);
    ctrl.current.target.set(center.x, center.y, center.z);
    ctrl.current.update();
  }, [bounds, camera, maxDim]);

  return (
    <OrbitControls
      ref={ctrl}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      zoomSpeed={0.9}
      panSpeed={0.7}
      minDistance={1.2}
      maxDistance={maxDim * 4}
      maxPolarAngle={Math.PI / 2}
      target={bounds ? [bounds.center.x, bounds.center.y, bounds.center.z] : [0, 0, 0]}
    />
  );
}

export default function App() {
  const [bounds, setBounds] = useState(null);
  const [mode, setMode] = useState('orbit'); // 'orbit' | 'walk'
  const [showHint, setShowHint] = useState(true);
  const moveRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 7000);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyV') setMode((m) => (m === 'orbit' ? 'walk' : 'orbit'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 55, near: 0.05, far: 400, position: [10, 6, 12] }}
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

        {mode === 'orbit'
          ? <OrbitRig bounds={bounds} />
          : <Player bounds={bounds} mode="walk" move={moveRef} look={lookRef} />}
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
        onClick={() => setMode((m) => (m === 'orbit' ? 'walk' : 'orbit'))}
        style={{
          position: 'fixed', right: 16, top: 16, zIndex: 30,
          background: 'rgba(15,20,26,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
          padding: '10px 16px', borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {mode === 'orbit' ? '🔄 Órbita  →  🚶 Pessoa' : '🚶 Pessoa  →  🔄 Órbita'}
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
            ? (mode === 'orbit'
                ? '👆 1 dedo gira  •  ✌️ 2 dedos zoom / mover'
                : '👆 Arraste para olhar  •  🕹️ joystick para andar')
            : (mode === 'orbit'
                ? '🖱️ Arraste = girar  •  Scroll = zoom  •  Botão direito = mover  •  V = modo pessoa'
                : '🖱️ Clique para olhar  •  ⌨️ WASD / setas para andar  •  V = modo órbita')}
        </div>
      )}

      {isTouch && mode === 'walk' && <Joystick moveRef={moveRef} />}

      <Loader
        containerStyles={{ background: '#0b0f14' }}
        innerStyles={{ width: 220 }}
        barStyles={{ background: '#ff7a00' }}
        dataInterpolation={(p) => `Carregando estande… ${p.toFixed(0)}%`}
      />
    </>
  );
}
