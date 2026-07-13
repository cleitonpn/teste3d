import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  Environment, Lightformer, Loader, AdaptiveDpr, OrbitControls,
  SoftShadows, ContactShadows,
} from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, SMAA } from '@react-three/postprocessing';
import Stand from '../Stand.jsx';
import Player from '../Player.jsx';
import Joystick from '../Joystick.jsx';
import ArtEditor from '../ArtEditor.jsx';
import ColorEditor from '../ColorEditor.jsx';
import { resolvePath } from '../lib/nodePath.js';

// Arrastar móveis: clique-e-segure sobre uma peça marcada e mova pelo piso.
function FurnitureDrag({ enabled, movables, onSelect, editsRef }) {
  const { camera, gl } = useThree();
  const controls = useThree((s) => s.controls);
  const rc = useMemo(() => new THREE.Raycaster(), []);
  const drag = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const el = gl.domElement;
    const ndc = (e) => {
      const r = el.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
    };
    const findMovable = (obj) => { let n = obj; while (n) { if (movables.includes(n)) return n; n = n.parent; } return null; };
    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      rc.setFromCamera(ndc(e), camera);
      const hits = rc.intersectObjects(movables, true);
      if (!hits.length) return;
      const node = findMovable(hits[0].object);
      if (!node) return;
      onSelect(node);
      const grab = hits[0].point.clone();                       // ponto agarrado (mundo)
      const startWorld = node.getWorldPosition(new THREE.Vector3()); // posição atual (mundo)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grab.y); // plano horizontal na altura do clique
      drag.current = { node, plane, grab, startWorld };
      if (controls) controls.enabled = false;
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!drag.current) return;
      rc.setFromCamera(ndc(e), camera);
      const p = new THREE.Vector3();
      if (!rc.ray.intersectPlane(drag.current.plane, p)) return;
      const { node, grab, startWorld } = drag.current;
      // desloca em X/Z no MUNDO, mantém a altura (Y) fixa
      const desired = new THREE.Vector3(startWorld.x + (p.x - grab.x), startWorld.y, startWorld.z + (p.z - grab.z));
      if (node.parent) node.parent.worldToLocal(desired); // converte para o espaço local do pai
      node.position.copy(desired);
    };
    const onUp = () => { if (drag.current) { drag.current = null; if (controls) controls.enabled = true; if (editsRef?.current) editsRef.current.furnitureChanged = true; } };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (controls) controls.enabled = true;
    };
  }, [enabled, movables, camera, gl, controls, rc, onSelect, editsRef]);
  return null;
}

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

// Captura de imagem sob demanda: renderiza uma vez e lê o buffer no mesmo
// tick (funciona sem preserveDrawingBuffer, sem custo por quadro).
function Capture({ captureRef }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!captureRef) return undefined;
    captureRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/jpeg', 0.85);
    };
    return () => { if (captureRef) captureRef.current = null; };
  }, [gl, scene, camera, captureRef]);
  return null;
}

// contorno de seleção (caixa) que acompanha o objeto selecionado
function SelectionBox({ object }) {
  const helper = useMemo(() => (object ? new THREE.BoxHelper(object, 0x2f6bff) : null), [object]);
  useFrame(() => { helper?.update(); });
  useEffect(() => () => helper?.geometry?.dispose(), [helper]);
  return helper ? <primitive object={helper} /> : null;
}

export default function Viewer({
  modelUrl, artConfig, colorConfig = [], movablePaths = [], extraUI = null,
  editable = false, editsRef, captureRef, picking = false, onPick,
}) {
  const [bounds, setBounds] = useState(null);
  const [artPanels, setArtPanels] = useState([]);
  const [colorSurfaces, setColorSurfaces] = useState([]);
  const [mode, setMode] = useState('orbit');
  const [quality, setQuality] = useState('balanced');
  const [showHint, setShowHint] = useState(true);
  const [furniture, setFurniture] = useState(false);
  const [selected, setSelected] = useState(null);
  const [movables, setMovables] = useState([]);
  const moveRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ yaw: 0, pitch: 0 });
  const sceneRef = useRef(null);
  const maxDim = bounds ? Math.max(bounds.size.x, bounds.size.y, bounds.size.z) : 10;

  const handleSelect = useCallback((n) => setSelected(n), []);
  const onSceneReady = useCallback((s) => {
    sceneRef.current = s;
    setMovables((movablePaths || []).map((p) => resolvePath(s, p)).filter(Boolean));
  }, [movablePaths]);

  useEffect(() => { setShowHint(true); const t = setTimeout(() => setShowHint(false), 7000); return () => clearTimeout(t); }, [mode, furniture]);
  useEffect(() => {
    const onKey = (e) => { if (e.code === 'KeyV') setMode((m) => (m === 'orbit' ? 'walk' : 'orbit')); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const dupSelected = () => {
    if (!selected) return;
    const clone = selected.clone(true);
    clone.position.x += Math.min(0.4, maxDim * 0.05);
    clone.position.z += Math.min(0.4, maxDim * 0.05);
    selected.parent.add(clone);
    setMovables((m) => [...m, clone]);
    setSelected(clone);
    if (editsRef?.current) editsRef.current.furnitureChanged = true;
  };
  const delSelected = () => {
    if (!selected) return;
    selected.removeFromParent();
    setMovables((m) => m.filter((x) => x !== selected));
    setSelected(null);
    if (editsRef?.current) editsRef.current.furnitureChanged = true;
  };

  const onArtChange = (id, file) => { if (editsRef?.current) { if (file) editsRef.current.arts[id] = file; else delete editsRef.current.arts[id]; } };
  const onColorChange = (mat, hex) => { if (editsRef?.current) { if (hex) editsRef.current.colors[mat] = hex; else delete editsRef.current.colors[mat]; } };

  const handlePick = (info) => { if (picking) onPick?.(info); };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows dpr={[1, 2]}
        camera={{ fov: 55, near: 0.05, far: 400, position: [10, 6, 12] }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 0.98 }}
        style={{ background: '#2f333a' }}
        onCreated={({ gl }) => {
          // evita que uma perda de contexto WebGL vire tela preta permanente
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
        }}>
        <AdaptiveDpr pixelated />
        <SoftShadows size={22} samples={8} focus={0.85} />
        <hemisphereLight args={[0xffffff, 0x8a8578, 0.85]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[7, 15, 7]} intensity={2.4} castShadow
          shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002}
          shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} />
        <Environment resolution={256} background={false}>
          <Lightformer intensity={2.2} position={[0, 8, -4]} scale={[16, 8, 1]} />
          <Lightformer intensity={1.1} position={[-8, 5, 4]} scale={[8, 8, 1]} />
          <Lightformer intensity={1.1} position={[8, 5, 4]} scale={[8, 8, 1]} />
          <Lightformer intensity={0.8} position={[0, 6, 8]} scale={[12, 6, 1]} />
        </Environment>

        <Suspense fallback={null}>
          <Stand url={modelUrl} artConfig={artConfig} colorConfig={colorConfig}
            onReady={setBounds} onArtReady={setArtPanels} onColorReady={setColorSurfaces}
            onScene={onSceneReady}
            onPick={picking ? handlePick : undefined} />
        </Suspense>

        {bounds && (
          <>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.center.x, bounds.min.y - 0.015, bounds.center.z]} receiveShadow>
              <planeGeometry args={[400, 400]} />
              <meshStandardMaterial color="#3a3e45" roughness={0.98} metalness={0} />
            </mesh>
            <ContactShadows position={[bounds.center.x, bounds.min.y + 0.005, bounds.center.z]}
              scale={maxDim * 1.8} resolution={512} blur={2.6} opacity={0.5} far={maxDim} />
          </>
        )}

        <Capture captureRef={captureRef} />


        {mode === 'orbit'
          ? <OrbitRig bounds={bounds} />
          : <Player bounds={bounds} mode="walk" move={moveRef} look={lookRef} />}

        {editable && furniture && (
          <FurnitureDrag enabled movables={movables} onSelect={handleSelect} editsRef={editsRef} />
        )}
        {editable && furniture && selected && <SelectionBox object={selected} />}

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
            {movables.length === 0
              ? 'Nenhum móvel disponível neste projeto'
              : selected ? 'Segure e arraste para mover • ou duplique/exclua' : 'Clique e segure numa peça e arraste'}
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
