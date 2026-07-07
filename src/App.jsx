import React, { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import {
  Environment, Lightformer, Loader, AdaptiveDpr, OrbitControls,
  SoftShadows, ContactShadows, MeshReflectorMaterial,
} from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, SMAA } from '@react-three/postprocessing';
import Stand from './Stand.jsx';
import Player from './Player.jsx';
import Joystick from './Joystick.jsx';
import ArtEditor from './ArtEditor.jsx';

const isTouch = typeof window !== 'undefined' &&
  window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

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
  const [artPanels, setArtPanels] = useState([]);
  const [mode, setMode] = useState('orbit'); // 'orbit' | 'walk'
  const [quality, setQuality] = useState(isTouch ? 'balanced' : 'high');
  const [showHint, setShowHint] = useState(true);
  const moveRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ yaw: 0, pitch: 0 });
  const maxDim = bounds ? Math.max(bounds.size.x, bounds.size.y, bounds.size.z) : 10;

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
        gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 1.05 }}
        style={{ background: '#eae6de' }}
      >
        <AdaptiveDpr pixelated />
        <SoftShadows size={26} samples={12} focus={0.85} />

        <hemisphereLight args={[0xffffff, 0x9a9488, 0.5]} />
        <ambientLight intensity={0.14} />
        <directionalLight
          position={[7, 15, 7]}
          intensity={2.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0002}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
        />

        {/* Estúdio de luz (reflexos nos materiais) — sem depender de CDN */}
        <Environment resolution={512} background={false}>
          <Lightformer intensity={2.2} position={[0, 8, -4]} scale={[16, 8, 1]} />
          <Lightformer intensity={1.1} position={[-8, 5, 4]} scale={[8, 8, 1]} />
          <Lightformer intensity={1.1} position={[8, 5, 4]} scale={[8, 8, 1]} />
          <Lightformer intensity={0.8} position={[0, 6, 8]} scale={[12, 6, 1]} />
        </Environment>

        <Suspense fallback={null}>
          <Stand onReady={setBounds} onArtReady={setArtPanels} />
        </Suspense>

        {bounds && (
          <>
            {/* Piso com reflexo sutil, como nos renders */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[bounds.center.x, bounds.min.y - 0.015, bounds.center.z]}
              receiveShadow
            >
              <planeGeometry args={[400, 400]} />
              <MeshReflectorMaterial
                resolution={quality === 'high' ? 1024 : 512}
                mixBlur={6}
                mixStrength={quality === 'high' ? 1.4 : 0.8}
                blur={[400, 200]}
                roughness={0.85}
                depthScale={0.8}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.2}
                color="#e0dcd3"
                metalness={0.15}
              />
            </mesh>
            {/* Sombra de contato para "assentar" o estande no chão */}
            <ContactShadows
              position={[bounds.center.x, bounds.min.y + 0.005, bounds.center.z]}
              scale={maxDim * 1.8}
              resolution={1024}
              blur={2.6}
              opacity={0.55}
              far={maxDim}
            />
          </>
        )}

        {mode === 'orbit'
          ? <OrbitRig bounds={bounds} />
          : <Player bounds={bounds} mode="walk" move={moveRef} look={lookRef} />}

        {quality === 'high' && (
          <EffectComposer disableNormalPass multisampling={0}>
            <N8AO aoRadius={0.7} intensity={2.2} distanceFalloff={1} quality="medium" />
            <Bloom luminanceThreshold={0.75} intensity={0.5} mipmapBlur radius={0.6} />
            <SMAA />
          </EffectComposer>
        )}
      </Canvas>

      {mode === 'walk' && (
        <div style={{
          position: 'fixed', left: '50%', top: '50%', width: 8, height: 8,
          marginLeft: -4, marginTop: -4, borderRadius: '50%',
          background: 'rgba(255,255,255,0.7)', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)',
          pointerEvents: 'none', zIndex: 10,
        }} />
      )}

      {/* Botões */}
      <div style={{ position: 'fixed', right: 16, top: 16, zIndex: 30, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setQuality((q) => (q === 'high' ? 'balanced' : 'high'))}
          style={btnStyle}
        >
          {quality === 'high' ? '✨ Alta' : '⚡ Equilibrada'}
        </button>
        <button
          onClick={() => setMode((m) => (m === 'orbit' ? 'walk' : 'orbit'))}
          style={btnStyle}
        >
          {mode === 'orbit' ? '🔄 Órbita' : '🚶 Pessoa'}
        </button>
      </div>

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

      <ArtEditor panels={artPanels} />

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

const btnStyle = {
  background: 'rgba(15,20,26,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
  padding: '10px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
