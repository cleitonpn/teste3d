import React, { useRef, useState } from 'react';
import { applyArtFile, resetArt } from './artSwap';

// Painel para trocar as artes (logos/lonas/imagens) e ver aplicadas ao vivo.
export default function ArtEditor({ panels }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [changed, setChanged] = useState({});
  const inputs = useRef({});

  if (!panels || panels.length === 0) return null;

  const pick = (id) => inputs.current[id]?.click();

  const onFile = async (panel, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(panel.id);
    try {
      await applyArtFile(panel, file);
      setChanged((c) => ({ ...c, [panel.id]: true }));
    } catch (err) {
      alert('Não consegui aplicar essa imagem. Use um PNG ou JPG.');
    } finally {
      setBusy(null);
    }
  };

  const onReset = (panel) => {
    resetArt(panel);
    setChanged((c) => ({ ...c, [panel.id]: false }));
  };

  return (
    <div style={{ position: 'fixed', left: 16, top: 16, zIndex: 30, maxWidth: 300 }}>
      <button onClick={() => setOpen((o) => !o)} style={btn}>
        🎨 Trocar artes {open ? '▲' : '▼'}
      </button>

      {open && (
        <div style={card}>
          {panels.map((p) => (
            <div key={p.id} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                {changed[p.id] && <div style={{ fontSize: 11, color: '#7CFC9A' }}>arte trocada</div>}
              </div>
              <input
                ref={(el) => (inputs.current[p.id] = el)}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => onFile(p, e)}
              />
              <button onClick={() => pick(p.id)} disabled={busy === p.id} style={miniBtn}>
                {busy === p.id ? '...' : 'Trocar'}
              </button>
              {changed[p.id] && (
                <button onClick={() => onReset(p)} style={{ ...miniBtn, background: 'rgba(255,255,255,0.1)' }}>↺</button>
              )}
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#aab', marginTop: 6, lineHeight: 1.4 }}>
            Dica: use a arte na mesma proporção do painel para não distorcer.
          </div>
        </div>
      )}
    </div>
  );
}

const btn = {
  background: 'rgba(15,20,26,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
  padding: '10px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const card = {
  marginTop: 8, background: 'rgba(15,20,26,0.92)', border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 14, padding: 12, color: '#fff',
};
const row = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' };
const miniBtn = {
  background: '#ff7a00', color: '#fff', border: 'none', padding: '6px 10px',
  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
};
