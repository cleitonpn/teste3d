import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createCatalogItem, listCatalog, deleteCatalogItem } from '../lib/projects';

const CATEGORIAS = ['Mesa', 'Cadeira', 'Banqueta', 'Sofá / Poltrona', 'Balcão', 'Estante', 'Decoração', 'Estrutura', 'Outro'];

export default function AdminCatalog() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [categoria, setCategoria] = useState('Cadeira');
  const [rows, setRows] = useState([]); // {name, status, pct, before, after}
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');

  const refresh = async () => {
    try { setItems(await listCatalog()); }
    catch (e) { setErr('Não consegui listar: ' + (e.code || e.message)); setItems([]); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const mb = (n) => (n / 1048576).toFixed(1);

  const processAll = async () => {
    if (!files.length) { setErr('Escolha um ou mais arquivos .glb.'); return; }
    setErr(''); setRunning(true);
    const { optimizeGlb } = await import('../lib/optimize.js');
    const initial = files.map((f) => ({ name: f.name, status: 'na fila', pct: 0 }));
    setRows(initial);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const upd = (patch) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
      try {
        if (!file.name.toLowerCase().endsWith('.glb')) { upd({ status: 'ignorado (não é .glb)' }); continue; }
        upd({ status: 'otimizando…' });
        const { file: opt, before, after } = await optimizeGlb(file, (s) => upd({ status: 'otimizando… ' + s }));
        upd({ status: 'enviando…', before, after });
        await createCatalogItem({
          nome: file.name.replace(/\.glb$/i, ''), categoria, file: opt, uid: user.uid,
          onProgress: (pct) => upd({ pct }),
        });
        upd({ status: `ok (${mb(before)}→${mb(after)} MB)`, pct: 100 });
      } catch (e) {
        upd({ status: 'erro: ' + (e.code || e.message) });
      }
    }
    setRunning(false);
    setFiles([]);
    await refresh();
  };

  const remove = async (it) => {
    if (!confirm(`Remover "${it.nome}" do catálogo?`)) return;
    try { await deleteCatalogItem(it); await refresh(); }
    catch (e) { setErr('Não consegui remover: ' + (e.code || e.message)); }
  };

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">Maquete <span className="b">Viva</span></div>
        <div className="row"><span className="pill">{user?.email}</span><Link className="btn" to="/app">Voltar</Link></div>
      </div>

      <div className="wrap">
        <div className="eyebrow">Admin · catálogo de mobiliário</div>
        <h1 className="title">Biblioteca de móveis</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Suba vários <b>.glb</b> de uma vez. Cada um é otimizado automaticamente (Meshopt + texturas) antes de entrar no catálogo.
        </p>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="field">
            <label>Categoria (para este lote)</label>
            <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Arquivos .glb (pode selecionar vários)</label>
            <input className="input" type="file" accept=".glb,model/gltf-binary" multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </div>
          <button className="btn pri" onClick={processAll} disabled={running || !files.length}>
            {running ? 'Processando…' : `Adicionar ${files.length || ''} ao catálogo`}
          </button>
          {err && <div className="err">{err}</div>}

          {rows.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  <span className="muted" style={{ flexShrink: 0 }}>{r.status}{r.pct ? ` ${r.pct}%` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>
          No catálogo {items ? `(${items.length})` : ''}
        </h2>
        {items === null ? <p className="muted" style={{ marginTop: 12 }}>Carregando…</p>
          : items.length === 0 ? <p className="muted" style={{ marginTop: 12 }}>Vazio. Suba os primeiros móveis acima.</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginTop: 12 }}>
              {items.map((it) => (
                <div className="proj" key={it.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div className="n" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nome}</div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="pill">{it.categoria}</span>
                    <span className="meta">{it.tamanho ? (it.tamanho / 1048576).toFixed(1) + ' MB' : ''}</span>
                  </div>
                  <button className="btn" onClick={() => remove(it)}
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>Remover</button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
