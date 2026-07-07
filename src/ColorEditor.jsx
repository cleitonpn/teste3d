import React, { useState } from 'react';

// Troca a cor das superfícies marcadas como "cor editável".
export default function ColorEditor({ surfaces, onChange }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({});

  if (!surfaces || surfaces.length === 0) return null;

  const apply = (s, i, hex) => {
    s.material.color.set(hex);
    s.material.needsUpdate = true;
    setVals((v) => ({ ...v, [i]: hex }));
    onChange?.(s.material.name, hex);
  };
  const reset = (s, i) => {
    s.material.color.set('#' + s.originalColor);
    s.material.needsUpdate = true;
    setVals((v) => { const n = { ...v }; delete n[i]; return n; });
    onChange?.(s.material.name, null);
  };

  return (
    <div style={{ maxWidth: 300 }}>
      <button onClick={() => setOpen((o) => !o)} style={btn}>🎨 Cores {open ? '▲' : '▼'}</button>
      {open && (
        <div style={card}>
          {surfaces.map((s, i) => (
            <div key={i} style={row}>
              <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              <input type="color" value={vals[i] || ('#' + s.originalColor)} onChange={(e) => apply(s, i, e.target.value)}
                style={{ width: 34, height: 30, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
              {vals[i] && <button onClick={() => reset(s, i)} style={rmBtn}>↺</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btn = { background: 'rgba(15,20,26,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', padding: '10px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const card = { marginTop: 8, background: 'rgba(15,20,26,0.92)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: 12, color: '#fff' };
const row = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' };
const rmBtn = { background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer' };
