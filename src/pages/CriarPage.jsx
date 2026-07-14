import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import PieceMesh, { PIECES, PIECE_MAP } from '../modular/pieces.jsx';
import { getPrices, createOrcamento } from '../lib/projects';
import '../ui.css';

const uid = () => Math.random().toString(36).slice(2, 9);
const brl = (n) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 });

function SelBox({ foot }) {
  return (
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(foot[0], foot[1]) * 0.62, Math.max(foot[0], foot[1]) * 0.7, 32]} />
      <meshBasicMaterial color="#ffb02e" transparent opacity={0.9} />
    </mesh>
  );
}

function Scene({ items, tool, rotY, selected, onPlace, onSelect, onMove, captureRef }) {
  const { camera, gl, scene } = useThree();
  const controls = useThree((s) => s.controls);
  const [ghost, setGhost] = useState(null);
  const drag = useRef(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const rc = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    if (!captureRef) return undefined;
    captureRef.current = () => { gl.render(scene, camera); return gl.domElement.toDataURL('image/jpeg', 0.85); };
    return () => { if (captureRef) captureRef.current = null; };
  }, [gl, camera, scene, captureRef]);

  const snap = (pt) => { const s = PIECE_MAP[tool]?.snap || 0.5; return { x: Math.round(pt.x / s) * s, z: Math.round(pt.z / s) * s }; };
  const ndc = (e) => { const r = gl.domElement.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }; };
  const groundPoint = (e) => { rc.setFromCamera(ndc(e), camera); const p = new THREE.Vector3(); return rc.ray.intersectPlane(plane, p) ? p : null; };

  // arrastar peça selecionada
  useEffect(() => {
    const el = gl.domElement;
    const onMoveW = (e) => {
      if (!drag.current) return;
      const p = groundPoint(e); if (!p) return;
      onMove(drag.current.id, { x: p.x + drag.current.offX, z: p.z + drag.current.offZ });
    };
    const onUp = () => { if (drag.current) { drag.current = null; if (controls) controls.enabled = true; } };
    window.addEventListener('pointermove', onMoveW);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMoveW); window.removeEventListener('pointerup', onUp); };
  }, [gl, controls, onMove]);

  return (
    <>
      <hemisphereLight args={[0xffffff, 0x9a9488, 0.7]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 16, 8]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25} />
      <Environment resolution={128} background={false}>
        <Lightformer intensity={1.6} position={[0, 8, 2]} scale={[12, 8, 1]} />
      </Environment>

      <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.1}
        target={[0, 1, 0]} />

      <gridHelper args={[60, 20, '#5a5f66', '#3a3e44']} position={[0, 0.01, 0]} />
      {/* chão para posicionar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow
        onPointerMove={(e) => { if (tool) setGhost(snap(e.point)); }}
        onPointerOut={() => setGhost(null)}
        onClick={(e) => { e.stopPropagation(); if (tool) { onPlace(snap(e.point)); } else { onSelect(null); } }}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2b2e33" roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.02, 0]} scale={40} blur={2} opacity={0.35} far={8} frames={60} />

      {/* peças colocadas */}
      {items.map((it) => {
        const foot = PIECE_MAP[it.kind]?.foot || [1, 1];
        return (
          <group key={it.id} position={[it.x, 0, it.z]} rotation={[0, it.rotY || 0, 0]}
            onClick={(e) => { if (!tool) { e.stopPropagation(); onSelect(it.id); } }}
            onPointerDown={(e) => {
              if (tool || selected !== it.id) return;
              e.stopPropagation();
              const p = groundPoint(e.nativeEvent); if (!p) return;
              drag.current = { id: it.id, offX: it.x - p.x, offZ: it.z - p.z };
              if (controls) controls.enabled = false;
            }}>
            <PieceMesh kind={it.kind} />
            {selected === it.id && <SelBox foot={foot} />}
          </group>
        );
      })}

      {/* preview (ghost) */}
      {tool && ghost && (
        <group position={[ghost.x, 0, ghost.z]} rotation={[0, rotY, 0]}>
          <PieceMesh kind={tool} ghost />
        </group>
      )}
    </>
  );
}

export default function CriarPage() {
  const [items, setItems] = useState([]);
  const [tool, setTool] = useState(null);
  const [rotY, setRotY] = useState(0);
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

  const place = (p) => {
    const it = { id: uid(), kind: tool, x: p.x, z: p.z, rotY };
    setItems((a) => [...a, it]);
    setHist((h) => [...h, { t: 'add', id: it.id }]);
  };
  const move = useCallback((id, p) => setItems((a) => a.map((x) => (x.id === id ? { ...x, x: p.x, z: p.z } : x))), []);
  const del = () => {
    if (!selected) return;
    const it = items.find((x) => x.id === selected);
    setItems((a) => a.filter((x) => x.id !== selected));
    setHist((h) => [...h, { t: 'del', item: it }]);
    setSelected(null);
  };
  const rotateSel = () => {
    if (selected) setItems((a) => a.map((x) => (x.id === selected ? { ...x, rotY: (x.rotY || 0) + Math.PI / 4 } : x)));
    else setRotY((r) => r + Math.PI / 4);
  };
  const undo = () => {
    const last = hist[hist.length - 1]; if (!last) return;
    setHist((h) => h.slice(0, -1));
    if (last.t === 'add') setItems((a) => a.filter((x) => x.id !== last.id));
    else if (last.t === 'del') setItems((a) => [...a, last.item]);
  };
  const limpar = () => { if (confirm('Apagar tudo e recomeçar?')) { setItems([]); setHist([]); setSelected(null); } };

  const total = useMemo(() => items.reduce((s, it) => s + (prices[it.kind] || 0), 0), [items, prices]);
  const semPreco = items.some((it) => !prices[it.kind]);

  const pick = (id) => { setSelected(null); setTool((t) => (t === id ? null : id)); };

  const enviarOrc = async () => {
    setSending(true);
    try {
      const shot = captureRef.current ? captureRef.current() : null;
      await createOrcamento({ ...form, items: items.map(({ kind, x, z, rotY: r }) => ({ kind, x, z, rotY: r })), total, screenshotDataUrl: shot });
      setSent(true);
    } catch (e) { alert('Não consegui enviar: ' + (e.code || e.message)); }
    finally { setSending(false); }
  };

  const cats = [...new Set(PIECES.map((p) => p.cat))];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#2f333a' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 50, position: [12, 10, 14], near: 0.1, far: 500 }}
        gl={{ antialias: true, toneMappingExposure: 1 }}
        onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault()); }}>
        <Scene items={items} tool={tool} rotY={rotY} selected={selected}
          onPlace={place} onSelect={setSelected} onMove={move} captureRef={captureRef} />
      </Canvas>

      {/* Paleta (esquerda) */}
      <div style={S.palette}>
        <div style={S.brand}>Monte seu estande</div>
        {cats.map((c) => (
          <div key={c} style={{ marginBottom: 10 }}>
            <div style={S.catLabel}>{c}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PIECES.filter((p) => p.cat === c).map((p) => (
                <button key={p.id} onClick={() => pick(p.id)}
                  style={{ ...S.pieceBtn, ...(tool === p.id ? S.pieceOn : {}) }}>
                  <span style={{ fontSize: 20 }}>{p.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{p.nome}</span>
                  {prices[p.id] ? <span style={S.price}>{brl(prices[p.id])}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Ações (topo direito) */}
      <div style={S.actions}>
        <button style={S.act} onClick={rotateSel} title="Girar">↻ Girar</button>
        <button style={S.act} onClick={undo} disabled={!hist.length}>↩ Desfazer</button>
        <button style={{ ...S.act, ...(selected ? {} : S.dis) }} onClick={del} disabled={!selected}>🗑 Excluir</button>
        <button style={S.act} onClick={limpar}>🧹 Limpar</button>
      </div>

      {/* dica */}
      <div style={S.hint}>
        {tool ? '👆 Clique no chão para posicionar • ↻ gira'
          : selected ? '✋ Arraste a peça para mover • 🗑 exclui'
          : '👈 Escolha uma peça na lista para começar'}
      </div>

      {/* Orçamento ao vivo */}
      <div style={S.budget}>
        <div style={{ fontSize: 12, color: '#9fb0bc', fontFamily: 'var(--mono)' }}>ORÇAMENTO ESTIMADO</div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{brl(total)}</div>
        <div style={{ fontSize: 11, color: semPreco ? '#E0A24A' : '#8aa' }}>
          {items.length} pe{items.length === 1 ? 'ça' : 'ças'}{semPreco ? ' • alguns itens sem preço definido' : ''}
        </div>
        <button style={S.orcBtn} disabled={!items.length} onClick={() => setOrc(true)}>Solicitar orçamento</button>
      </div>

      <button onClick={() => setShowTut(true)} title="Como funciona" style={S.help}>?</button>

      {showTut && (
        <div style={S.modalBg} onClick={() => setShowTut(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Monte seu estande em 3 passos</h2>
            <p style={{ color: '#9fb0bc', fontSize: 14, marginBottom: 14 }}>Sem conhecimento técnico — é só clicar.</p>
            {[['1️⃣', 'Escolha uma peça', 'Clique numa peça da lista à esquerda (módulo, parede, móvel…).'],
              ['2️⃣', 'Posicione no chão', 'Mova o mouse e clique no chão para colocar. Ela encaixa sozinha na grade.'],
              ['3️⃣', 'Ajuste e veja o preço', 'Clique numa peça para movê-la ou excluir. O orçamento atualiza sozinho.']].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 22 }}>{s[0]}</div>
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
                    value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                    style={S.input} />
                ))}
                <button style={{ ...S.orcBtn, opacity: sending ? 0.6 : 1 }} disabled={sending || !form.cliente || !form.email}
                  onClick={enviarOrc}>{sending ? 'Enviando…' : 'Enviar pedido'}</button>
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
  pieceBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#eef2f5', borderRadius: 9, padding: '8px 10px', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  pieceOn: { background: 'rgba(52,152,219,0.22)', borderColor: '#3498db', color: '#fff' },
  price: { fontFamily: 'var(--mono)', fontSize: 10.5, color: '#8aa' },
  actions: { position: 'fixed', right: 14, top: 14, zIndex: 20, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  act: { ...panel, padding: '9px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  dis: { opacity: 0.45 },
  hint: { position: 'fixed', left: '50%', top: 16, transform: 'translateX(-50%)', ...panel, padding: '8px 16px', fontSize: 13, zIndex: 20, whiteSpace: 'nowrap' },
  budget: { ...panel, position: 'fixed', right: 14, bottom: 14, width: 240, padding: 16, zIndex: 20 },
  orcBtn: { width: '100%', marginTop: 10, background: '#ff7a00', color: '#1b1305', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  ghostBtn: { width: '100%', marginTop: 8, background: 'transparent', color: '#9fb0bc', border: 'none', padding: '8px', cursor: 'pointer' },
  help: { position: 'fixed', left: 234, bottom: 14, width: 42, height: 42, borderRadius: '50%', ...panel, fontSize: 20, fontWeight: 700, cursor: 'pointer', zIndex: 20 },
  modalBg: { position: 'fixed', inset: 0, background: 'rgba(8,12,16,0.72)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: 'min(460px,94vw)', ...panel, padding: 22 },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, marginBottom: 8 },
};
