import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  Environment, Lightformer, Loader, AdaptiveDpr, OrbitControls,
  SoftShadows, ContactShadows, MeshReflectorMaterial, TransformControls,
} from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, SMAA } from '@react-three/postprocessing';
import Stand from '../Stand.jsx';
import Player from '../Player.jsx';
import Joystick from '../Joystick.jsx';
import ArtEditor from '../ArtEditor.jsx';
import ColorEditor from '../ColorEditor.jsx';

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
    <OrbitControls ref={ctrl} makeDefault enableDamping dampingFactor={0.08}
      rotateSpeed={0.7} zoomSpeed={0.9} panSpeed={0.7}
      minDistance={1.2} maxDistance={maxDim * 4} maxPolarAngle={Math.PI / 2}
      target={bounds ? [bounds.center.x, bounds.center.y, bounds.center.z] : [0, 0, 0]} />
  );
}

// contorno de seleção (caixa) que acompanha o objeto selecionado
function SelectionBox({ object }) {
  const helper = useMemo(() => (object ? new THREE.BoxHelper(object, 0x2f6bff) : null), [object]);
  useFrame(() => { helper?.update(); });
  useEffect(() => () => helper?.geometry?.dispose(), [helper]);
  return helper ? <primitive object={helper} /> : null;
}

export default function Viewer({
  modelUrl, artConfig, colorConfig = [], extraUI = null,
  editable = false, editsRef, picking = false, onPick,
}) {
  const [bounds, setBounds] = useState(null);
  const [artPanels, setArtPanels] = useState([]);
  const [colorSurfaces, setColorSurfaces] = useState([]);
  const [mode, setMode] = useState('orbit');
  const [quality, setQuality] = useState(isTouch ? 'balanced' : 'high');
  const [showHint, setShowHint] = useState(true);
  const [furniture, setFurniture] = useState(false);
  const [selected, setSelected] = useState(null);
  const moveRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ yaw: 0, pitch: 0 });
  const sceneRef = useRef(null);
  const maxDim = bounds ? Math.max(bounds.size.x, bounds.size.y, bounds.size.z) : 10;

  useEffect(() => { setShowHint(true); const t = setTimeout(() => setShowHint(false), 7000); return () => clearTimeout(t); }, [mode, furniture]);
  useEffect(() => {
    const onKey = (e) => { if (e.code === 'KeyV') setMode((m) => (m === 'orbit' ? 'walk' : 'orbit')); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // sobe até o objeto de topo (filho direto da cena) para pegar a peça inteira
  const topLevel = (obj) => {
    const root = sceneRef.current;
    let o = obj;
    while (o && o.parent && o.parent !== root && o.parent.type !== 'Scene') o = o.parent;
    return o;
  };

  const handlePick = (info) => {
    if (picking) { onPick?.(info); return; }
    if (furniture && info.object) setSelected(topLevel(info.object));
  };

  const dupSelected = () => {
    if (!selected) return;
    const clone = selected.clone(true);
    clone.position.x += Math.min(0.4, maxDim * 0.05);
    clone.position.z += Math.min(0.4, maxDim * 0.05);
    selected.parent.add(clone);
    setSelected(clone);
    if (editsRef?.current) editsRef.current.furnitureChanged = true;
  };
  const delSelected = () => {
    if (!selected) return;
    selected.removeFromParent();
    setSelected(null);
    if (editsRef?.current) editsRef.current.furnitureChanged = true;
  };

  const onArtChange = (id, file) => { if (editsRef?.current) { if (file) editsRef.current.arts[id] = file; else delete editsRef.current.arts[id]; } };
  const onColorChange = (mat, hex) => { if (editsRef?.current) { if (hex) editsRef.current.colors[mat] = hex; else delete editsRef.current.colors[mat]; } };

  const pickEnabled = picking || (editable && furniture);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows dpr={[1, 2]}
        camera={{ fov: 55, near: 0.05, far: 400, position: [10, 6, 12] }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 1.05, preserveDrawingBuffer: true }}
        style={{ background: '#eae6de' }}>
        <AdaptiveDpr pixelated />
        <SoftShadows size={26} samples={12} focus={0.85} />
        <hemisphereLight args={[0xffffff, 0x8a8578, 0.85]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[7, 15, 7]} intensity={2.4} castShadow
          shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002}
          shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} />
        <Environment resolution={512} background={false}>
          <Lightformer intensity={2.2} position={[0, 8, -4]} scale={[16, 8, 1]} />
          <Lightformer intensity={1.1} position={[-8, 5, 4]} scale={[8, 8, 1]} />
          <Lightformer intensity={1.1} position={[8, 5, 4]} scale={[8, 8, 1]} />
          <Lightformer intensity={0.8} position={[0, 6, 8]} scale={[12, 6, 1]} />
        </Environment>

        <Suspense fallback={null}>
          <Stand url={modelUrl} artConfig={artConfig} colorConfig={colorConfig}
            onReady={setBounds} onArtReady={setArtPanels} onColorReady={setColorSurfaces}
            onScene={(s) => { sceneRef.current = s; }}
            onPick={pickEnabled ? handlePick : undefined} />
        </Suspense>

        {bounds && (
          <>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.center.x, bounds.min.y - 0.015, bounds.center.z]} receiveShadow>
              <planeGeometry args={[400, 400]} />
              <MeshReflectorMaterial resolution={quality === 'high' ? 1024 : 512} mixBlur={6}
                mixStrength={quality === 'high' ? 1.4 : 0.8} blur={[400, 200]} roughness={0.85}
                depthScale={0.8} minDepthThreshold={0.4} maxDepthThreshold={1.2} color="#e0dcd3" metalness={0.15} />
            </mesh>
            <ContactShadows position={[bounds.center.x, bounds.min.y + 0.005, bounds.center.z]}
              scale={maxDim * 1.8} resolution={1024} blur={2.6} opacity={0.55} far={maxDim} />
          </>
        )}

        {mode === 'orbit'
          ? <OrbitRig bounds={bounds} />
          : <Player bounds={bounds} mode="walk" move={moveRef} look={lookRef} />}

        {editable && furniture && selected && <SelectionBox object={selected} />}
        {editable && furniture && selected && (
          <TransformControls object={selected} mode="translate" showY={false} size={0.8}
            onMouseUp={() => { if (editsRef?.current) editsRef.current.furnitureChanged = true; }} />
        )}

        {quality === 'high' && (
          <EffectComposer disableNormalPass multisampling={0}>
            <N8AO aoRadius={0.7} intensity={2.2} distanceFalloff={1} quality="medium" />
            <Bloom luminanceThreshold={0.75} intensity={0.5} mipmapBlur radius={0.6} />
            <SMAA />
          </EffectComposer>
        )}
      </Canvas>

      {mode === 'walk' && !furniture && (
        <div style={{ position: 'fixed', left: '50%', top: '50%', width: 8, height: 8, marginLeft: -4, marginTop: -4,
          borderRadius: '50%', background: 'rgba(255,255,255,0.7)', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)', pointerEvents: 'none', zIndex: 10 }} />
      )}

      {/* botões topo-direita */}
      <div style={{ position: 'fixed', right: 16, top: 16, zIndex: 30, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button onClick={() => setQuality((q) => (q === 'high' ? 'balanced' : 'high'))} style={btnStyle}>{quality === 'high' ? '✨ Alta' : '⚡ Equilibrada'}</button>
        <button onClick={() => setMode((m) => (m === 'orbit' ? 'walk' : 'orbit'))} style={btnStyle}>{mode === 'orbit' ? '🔄 Órbita' : '🚶 Pessoa'}</button>
        {editable && (
          <button onClick={() => { setFurniture((f) => !f); setSelected(null); }}
            style={{ ...btnStyle, ...(furniture ? { background: '#2f6bff', borderColor: '#2f6bff' } : {}) }}>🪑 Móveis</button>
        )}
      </div>

      {/* painéis de edição do cliente (arte + cor) */}
      {editable && !furniture && (
        <div style={{ position: 'fixed', left: 16, top: 16, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 8, width: 300, maxWidth: '92vw', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
          <ArtEditor panels={artPanels} onChange={onArtChange} />
          <ColorEditor surfaces={colorSurfaces} onChange={onColorChange} />
        </div>
      )}

      {/* controles de mobiliário */}
      {editable && furniture && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 30, display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(15,20,26,0.9)', padding: 10, borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '94vw' }}>
          <span style={{ color: '#cbd5dd', fontSize: 13, padding: '0 6px' }}>
            {selected ? 'Arraste as setas para mover' : 'Clique numa peça (mesa, cadeira, balcão)'}
          </span>
          <button onClick={dupSelected} disabled={!selected} style={fBtn}>Duplicar</button>
          <button onClick={delSelected} disabled={!selected} style={{ ...fBtn, background: '#C0392B' }}>Excluir</button>
          {selected && <button onClick={() => setSelected(null)} style={{ ...fBtn, background: 'rgba(255,255,255,0.12)' }}>Desmarcar</button>}
        </div>
      )}

      {showHint && !furniture && (
        <div style={{ position: 'fixed', left: '50%', top: 22, transform: 'translateX(-50%)', background: 'rgba(15,20,26,0.82)', color: '#fff', padding: '10px 16px', borderRadius: 999, fontSize: 14, zIndex: 15, textAlign: 'center', maxWidth: '92vw', border: '1px solid rgba(255,255,255,0.12)' }}>
          {isTouch
            ? (mode === 'orbit' ? '👆 1 dedo gira • ✌️ 2 dedos zoom/mover' : '👆 Arraste p/ olhar • 🕹️ joystick p/ andar')
            : (mode === 'orbit' ? '🖱️ Arraste = girar • Scroll = zoom • Botão direito = mover • V = pessoa' : '🖱️ Clique p/ olhar • WASD p/ andar • V = órbita')}
        </div>
      )}

      {isTouch && mode === 'walk' && !furniture && <Joystick moveRef={moveRef} />}
      {extraUI}

      <Loader containerStyles={{ background: '#0b0f14' }} innerStyles={{ width: 220 }}
        barStyles={{ background: '#ff7a00' }} dataInterpolation={(p) => `Carregando estande… ${p.toFixed(0)}%`} />
    </div>
  );
}

const btnStyle = { background: 'rgba(15,20,26,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', padding: '10px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const fBtn = { background: '#DB8A18', color: '#1b1305', border: 'none', padding: '9px 14px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' };
