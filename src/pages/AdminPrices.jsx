import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getPrices, savePrices, listCatalog } from '../lib/projects';
import { PIECES } from '../modular/pieces.jsx';

export default function AdminPrices() {
  const { user } = useAuth();
  const [prices, setPrices] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try { setPrices(await getPrices()); setCatalog(await listCatalog()); }
      catch (e) { setErr(e.code || e.message); }
    })();
  }, []);

  const set = (key, v) => { setPrices((p) => ({ ...p, [key]: v === '' ? 0 : Number(v) })); setSaved(false); };
  const save = async () => {
    setSaving(true);
    try { await savePrices(prices); setSaved(true); }
    catch (e) { setErr('Falha ao salvar: ' + (e.code || e.message)); }
    finally { setSaving(false); }
  };

  const Row = ({ id, nome, cat }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{nome}</div>
        {cat && <div className="meta" style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>{cat}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="muted">R$</span>
        <input className="input" type="number" min="0" step="10" style={{ width: 120 }}
          value={prices[id] ?? ''} onChange={(e) => set(id, e.target.value)} placeholder="0" />
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">Maquete <span className="b">Viva</span></div>
        <div className="row"><span className="pill">{user?.email}</span><Link className="btn" to="/app">Voltar</Link></div>
      </div>
      <div className="wrap">
        <div className="eyebrow">Admin · tabela de preços</div>
        <h1 className="title">Preços do construtor</h1>
        <p className="muted" style={{ marginTop: 6 }}>Defina o valor de cada peça. O orçamento do cliente soma esses valores em tempo real.</p>
        {err && <div className="err">{err}</div>}

        <div className="card" style={{ marginTop: 18 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4 }}>Peças modulares</div>
          {PIECES.map((p) => <Row key={p.id} id={p.id} nome={`${p.icon} ${p.nome}`} cat={p.cat} />)}

          {catalog.length > 0 && (
            <>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '18px 0 4px' }}>Catálogo (.glb)</div>
              {catalog.map((c) => <Row key={c.id} id={c.id} nome={c.nome} cat={c.categoria} />)}
            </>
          )}

          <button className="btn pri" style={{ marginTop: 16 }} onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : saved ? '✓ Salvo' : 'Salvar preços'}
          </button>
        </div>
      </div>
    </div>
  );
}
