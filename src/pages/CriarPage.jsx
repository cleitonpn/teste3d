import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import PieceMesh, { PIECES, PIECE_MAP } from '../modular/pieces.jsx';
import { getPrices, createOrcamento } from '../lib/projects';
import '../ui.css';

const uid = () => Math.random().toString(36).slice(2, 9);
const brl = (n) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 });
const inc = (kind) => (PIECE_MAP[kind]?.snap === 'free' ? Math.PI / 4 : Math.PI / 2);

// devolve {x,z,rotY,y} encaixado conforme o tipo da peça
function snapPiece(kind, pt, ghostRot, level) {
  const m = PIECE_MAP[kind];
  const y = level * 3 + (m.mount === 'floor' ? 0 : 0.1);
  if (m.snap === 'cell') {
    const rotated = Math.round(ghostRot / (Math.PI / 2)) % 2 !== 0;
    const w = rotated ? m.foot[1] : m.foot[0];
    const d = rotated ? m.foot[0] : m.foot[1];
    const x = w === 3 ? Math.floor(pt.x / 3) * 3 + 1.5 : Math.round(pt.x / 3) * 3;
    const z = d === 3 ? Math.floor(pt.z / 3) * 3 + 1.5 : Math.round(pt.z / 3) * 3;
    return { x, z, rotY: ghostRot, y };
  }
  if (m.snap === 'edge') {
    const rx = Math.round(pt.x / 3) * 3, rz = Math.round(pt.z / 3) * 3;
    if (Math.abs(pt.x - rx) < Math.abs(pt.z - rz)) return { x: rx, z: Math.floor(pt.z / 3) * 3 + 1.5, rotY: Math.PI / 2, y };
    return { x: Math.floor(pt.x / 3) * 3 + 1.5, z: rz, rotY: 0, y };
  }
  return { x: Math.round(pt.x / 0.5) * 0.5, z: Math.round(pt.z / 0.5) * 0.5, rotY: ghostRot, y };
}

function SelRing({ foot }) {
  const r = Math.max(foot[0], foot[1]) * 0.62;
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r, r + 0.12, 40]} />
      <meshBasicMaterial color="#ffb02e" transparent opacity={0.95} />
    </mesh>
  );
}

function Scene({ items, tool, ghostRot, level, selected, onPlace, onSelect, onMove, captureRef }) {
  const { camera, gl, scene } = useThree();
  const controls = useThree((s) => s.controls);
  const [ghost, setGhost] = useState(null);
  const drag = useRef(null);
  const rc = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    if (!captureRef) return undefined;
    captureRef.current = () => { gl.render(scene, camera); return gl.domElement.toDataURL('image/jpeg', 0.85); };
    return () => { if (captureRef) captureRef.current = null; };
  }, [gl, camera, scene, captureRef]);

  const ndc = (e) => { const r = gl.domElement.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }; };
  const onPlane = (e, y) => { rc.setFromCamera(ndc(e), camera); const p = new THREE.Vector3(); return rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null; };

  useEffect(() => {
    const onMoveW = (e) => { if (!drag.current) return; const p = onPlane(e, drag.current.y); if (p) onMove(drag.current.id, { x: p.x + drag.current.offX, z: p.z + drag.current.offZ }); };
    const onUp = () => { if (drag.current) { drag.current = null; if (controls) controls.enabled = true; } };
    window.addEventListener('pointermove', onMoveW);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMoveW); window.removeEventListener('pointerup', onUp); };
  }, [gl, controls, onMove]);

  return (
    <>
      <hemisphereLight args={[0xffffff, 0x9a9488, 0.7]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 18, 8]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
      <Environment resolution={128} background={false}><Lightformer intensity={1.6} position={[0, 8, 2]} scale={[12, 8, 1]} /></Environment>
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05}
        enableZoom={!(tool || selected)} target={[0, 1, 0]} />

      <gridHelper args={[60, 20, '#5a5f66', '#3a3e44']} position={[0, 0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow
        onPointerMove={(e) => { if (tool) setGhost(snapPiece(tool, e.point, ghostRot, level)); }}
        onPointerOut={() => setGhost(null)}
        onClick={(e) => { e.stopPropagation(); if (tool) onPlace(snapPiece(tool, e.point, ghostRot, level)); else onSelect(null); }}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2b2e33" roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.02, 0]} scale={44} blur={2} opacity={0.35} far={10} frames={90} />

      {items.map((it) => {
        const foot = PIECE_MAP[it.kind]?.foot || [1, 1];
        return (
          <group key={it.id} position={[it.x, it.y || 0, it.z]} rotation={[0, it.rotY || 0, 0]}
            onClick={(e) => { if (!tool) { e.stopPropagation(); onSelect(it.id); } }}
            onPointerDown={(e) => {
              if (tool || selected !== it.id) return;
              e.stopPropagation();
              const p = onPlane(e.nativeEvent, it.y || 0); if (!p) return;
              drag.current = { id: it.id, y: it.y || 0, offX: it.x - p.x, offZ: it.z - p.z };
              if (controls) controls.enabled = false;
            }}>
            <PieceMesh kind={it.kind} />
            {selected === it.id && <SelRing foot={foot} />}
          </group>
        );
      })}

      {tool && ghost && (
        <group position={[ghost.x, ghost.y, ghost.z]} rotation={[0, ghost.rotY, 0]}>
          <PieceMesh kind={tool} ghost />
        </group>
      )}
    </>
  );
}

export default function CriarPage() {
  const [items, setItems] = useState([]);
  const [tool, setTool] = useState(null);
  const [ghostRot, setGhostRot] = useState(0);
  const [level, setLevel] = useState(0);
  const [selected, setSelected] = useState(null);
  const [prices, setPrices] = useState({});
  const [hist, setHist] = useState([]);
  const [orc, setOrc] = useState(false);
  const [form, setForm] = useState({ cliente: '', email: '', telefone: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showTut, setShowTut] = useState(true);
  const captureRef = useRef(null);

  useEffect(() => { getPrices().then(setPrices).catch(() => {}); }, []);

  const place = (s) => { const it = { id: uid(), kind: tool, x: s.x, y: s.y, z: s.z, rotY: s.rotY }; setItems((a) => [...a, it]); setHist((h) => [...h, { t: 'add', id: it.id }]); };
  const move = useCallback((id, p) => setItems((a) => a.map((x) => (x.id === id ? { ...x, x: p.x, z: p.z } : x))), []);
  const del = () => { if (!selected) return; const it = items.find((x) => x.id === selected); setItems((a) => a.filter((x) => x.id !== selected)); setHist((h) => [...h, { t: 'del', item: it }]); setSelected(null); };
  const rotate = () => { if (selected) setItems((a) => a.map((x) => (x.id === selected ? { ...x, rotY: (x.rotY || 0) + inc(x.kind) } : x))); else if (tool) setGhostRot((r) => r + inc(tool)); };
  const undo = () => { const last = hist[hist.length - 1]; if (!last) return; setHist((h) => h.slice(0, -1)); if (last.t === 'add') setItems((a) => a.filter((x) => x.id !== last.id)); else if (last.t === 'del') setItems((a) => [...a, last.item]); };
  const limpar = () => { if (confirm('Apagar tudo e recomeçar?')) { setItems([]); setHist([]); setSelected(null); setTool(null); } };
  const pick = (id) => { setSelected(null); setTool((t) => (t === id ? null : id)); };

  // ESC = cancelar / orbitar livre ; scroll = girar peça
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setTool(null); setSelected(null); } };
    const onWheel = (e) => { if (tool || selected) { e.preventDefault(); if (e.deltaY < 0 || e.deltaY > 0) rotate(); } };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('wheel', onWheel); };
  }, [tool, selected, items]);

  const total = useMemo(() => items.reduce((s, it) => s + (prices[it.kind] || 0), 0), [items, prices]);
  const semPreco = items.some((it) => !prices[it.kind]);

  const enviarOrc = async () => {
    setSending(true);
    try {
      const shot = captureRef.current ? captureRef.current() : null;
      await createOrcamento({ ...form, items: items.map(({ kind, x, y, z, rotY }) => ({ kind, x, y, z, rotY })), total, screenshotDataUrl: shot });
      setSent(true);
    } catch (e) { alert('Não consegui enviar: ' + (e.code || e.message)); }
    finally { setSending(false); }
  };

  const cats = [...new Set(PIECES.map((p) => p.cat))];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#2f333a' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 50, position: [14, 11, 16], near: 0.1, far: 500 }}
        gl={{ antialias: true, toneMappingExposure: 1 }}
        onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault()); }}>
        <Scene items={items} tool={tool} ghostRot={ghostRot} level={level} selected={selected}
          onPlace={place} onSelect={setSelected} onMove={move} captureRef={captureRef} />
      </Canvas>

      <div style={S.palette}>
        <div style={S.brand}>Monte seu estande</div>
        {cats.map((c) => (
          <div key={c} style={{ marginBottom: 10 }}>
            <div style={S.catLabel}>{c}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {PIECES.filter((p) => p.cat === c).map((p) => (
                <button key={p.id} onClick={() => pick(p.id)} style={{ ...S.pieceBtn, ...(tool === p.id ? S.pieceOn : {}) }}>
                  <span style={{ fontSize: 18 }}>{p.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{p.nome}</span>
                  {prices[p.id] ? <span style={S.price}>{brl(prices[p.id])}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={S.actions}>
        <select value={level} onChange={(e) => setLevel(Number(e.target.value))} style={S.act}>
          <option value={0}>Nível: Térreo</option>
          <option value={1}>Nível: Mezanino (3m)</option>
          <option value={2}>Nível: Mezanino (6m)</option>
        </select>
        <button style={S.act} onClick={rotate} title="Girar (ou scroll)">↻ Girar</button>
        <button style={S.act} onClick={undo} disabled={!hist.length}>↩ Desfazer</button>
        <button style={{ ...S.act, ...(selected ? {} : S.dis) }} onClick={del} disabled={!selected}>🗑 Excluir</button>
        <button style={S.act} onClick={limpar}>🧹 Limpar</button>
      </div>

      <div style={S.hint}>
        {tool ? '👆 Clique no chão p/ colocar • 🖱️ scroll gira • ESC cancela'
          : selected ? '✋ Arraste p/ mover • scroll gira • ESC libera a câmera'
          : '👈 Escolha uma peça • arraste p/ girar a câmera'}
      </div>

      <div style={S.budget}>
        <div style={{ fontSize: 12, color: '#9fb0bc', fontFamily: 'var(--mono)' }}>ORÇAMENTO ESTIMADO</div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{brl(total)}</div>
        <div style={{ fontSize: 11, color: semPreco ? '#E0A24A' : '#8aa' }}>
          {items.length} pe{items.length === 1 ? 'ça' : 'ças'}{semPreco ? ' • itens sem preço' : ''}
        </div>
        <button style={S.orcBtn} disabled={!items.length} onClick={() => setOrc(true)}>Solicitar orçamento</button>
      </div>

      <button onClick={() => setShowTut(true)} title="Como funciona" style={S.help}>?</button>

      {showTut && (
        <div style={S.modalBg} onClick={() => setShowTut(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Monte seu estande</h2>
            <p style={{ color: '#9fb0bc', fontSize: 14, marginBottom: 14 }}>Sem conhecimento técnico — é só clicar.</p>
            {[['1️⃣', 'Escolha uma peça', 'Clique numa peça da lista à esquerda.'],
              ['2️⃣', 'Coloque no chão', 'Clique no chão para posicionar. Encaixa sozinho na grade. Use o scroll para girar.'],
              ['3️⃣', 'Ajuste', 'Clique numa peça para arrastar/girar/excluir. Aperte ESC para girar a câmera livremente.'],
              ['4️⃣', 'Orçamento', 'O preço soma sozinho. No fim, clique em Solicitar orçamento.']].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 20 }}>{s[0]}</div>
                <div><b>{s[1]}</b><div style={{ color: '#aebac4', fontSize: 13 }}>{s[2]}</div></div>
              </div>
            ))}
            <button style={S.orcBtn} onClick={() => setShowTut(false)}>Começar</button>
          </div>
        </div>
      )}

      {orc && (
        <div style={S.modalBg} onClick={() => !sending && setOrc(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40 }}>✅</div>
                <h2 style={{ fontSize: 20 }}>Pedido enviado!</h2>
                <p style={{ color: '#9fb0bc' }}>Recebemos seu projeto e o orçamento de {brl(total)}. Entraremos em contato.</p>
                <button style={S.orcBtn} onClick={() => setOrc(false)}>Fechar</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, margin: '0 0 4px' }}>Solicitar orçamento</h2>
                <p style={{ color: '#9fb0bc', fontSize: 14, marginBottom: 12 }}>Total estimado: <b style={{ color: '#fff' }}>{brl(total)}</b></p>
                {['cliente', 'email', 'telefone'].map((k) => (
                  <input key={k} placeholder={k === 'cliente' ? 'Seu nome' : k === 'email' ? 'E-mail' : 'Telefone / WhatsApp'}
                    value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} style={S.input} />
                ))}
                <button style={{ ...S.orcBtn, opacity: sending ? 0.6 : 1 }} disabled={sending || !form.cliente || !form.email} onClick={enviarOrc}>{sending ? 'Enviando…' : 'Enviar pedido'}</button>
                <button style={S.ghostBtn} onClick={() => setOrc(false)}>Cancelar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const panel = { background: 'rgba(20,25,31,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, color: '#eef2f5' };
const S = {
  palette: { ...panel, position: 'fixed', left: 14, top: 14, bottom: 14, width: 210, padding: 12, overflowY: 'auto', zIndex: 20 },
  brand: { fontWeight: 800, fontSize: 15, marginBottom: 10 },
  catLabel: { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#7c8b96', margin: '4px 0 6px' },
  pieceBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#eef2f5', borderRadius: 9, padding: '7px 9px', fontSize: 12.5, cursor: 'pointer', fontWeight: 600 },
  pieceOn: { background: 'rgba(52,152,219,0.22)', borderColor: '#3498db', color: '#fff' },
  price: { fontFamily: 'var(--mono)', fontSize: 10, color: '#8aa' },
  actions: { position: 'fixed', right: 14, top: 14, zIndex: 20, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 'calc(100vw - 250px)' },
  act: { ...panel, padding: '9px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  dis: { opacity: 0.45 },
  hint: { position: 'fixed', left: '50%', top: 16, transform: 'translateX(-50%)', ...panel, padding: '8px 16px', fontSize: 13, zIndex: 20, whiteSpace: 'nowrap', maxWidth: '90vw', overflow: 'hidden', textOverflow: 'ellipsis' },
  budget: { ...panel, position: 'fixed', right: 14, bottom: 14, width: 240, padding: 16, zIndex: 20 },
  orcBtn: { width: '100%', marginTop: 10, background: '#ff7a00', color: '#1b1305', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  ghostBtn: { width: '100%', marginTop: 8, background: 'transparent', color: '#9fb0bc', border: 'none', padding: '8px', cursor: 'pointer' },
  help: { position: 'fixed', left: 234, bottom: 14, width: 42, height: 42, borderRadius: '50%', ...panel, fontSize: 20, fontWeight: 700, cursor: 'pointer', zIndex: 20 },
  modalBg: { position: 'fixed', inset: 0, background: 'rgba(8,12,16,0.72)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: 'min(460px,94vw)', ...panel, padding: 22 },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, marginBottom: 8 },
};
