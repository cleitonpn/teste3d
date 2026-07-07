import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, listSubmissions, getFileUrl } from '../lib/projects';

export default function SubmissionsView() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [subs, setSubs] = useState(null);
  const [urls, setUrls] = useState({});
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setProject(await getProject(id));
        const list = await listSubmissions(id);
        setSubs(list);
        const u = {};
        for (const s of list) {
          if (s.screenshotPath) { try { u[s.id] = await getFileUrl(s.screenshotPath); } catch { /* ignore */ } }
        }
        setUrls(u);
      } catch (e) { setErr(e.code || e.message); setSubs([]); }
    })();
  }, [id]);

  const when = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString('pt-BR') : '';

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">Maquete <span className="b">Viva</span></div>
        <Link className="btn" to="/app">Voltar</Link>
      </div>
      <div className="wrap">
        <div className="eyebrow">Empresa · envios do cliente</div>
        <h1 className="title">{project?.nome || 'Projeto'}</h1>
        {err && <div className="err">{err}</div>}

        {subs === null ? <p className="muted" style={{ marginTop: 20 }}>Carregando…</p>
          : subs.length === 0 ? <p className="muted" style={{ marginTop: 20 }}>Nenhum envio ainda.</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginTop: 20 }}>
              {subs.map((s) => (
                <div className="card" key={s.id} style={{ padding: 0, overflow: 'hidden' }}>
                  {urls[s.id]
                    ? <img src={urls[s.id]} alt="preview" style={{ width: '100%', display: 'block', aspectRatio: '16/10', objectFit: 'cover' }} />
                    : <div style={{ aspectRatio: '16/10', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="muted">sem preview</div>}
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 700 }}>{s.cliente || 'Cliente'}</div>
                    <div className="meta" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)' }}>{s.email}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{when(s.criadoEm)}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="pill">{(s.artes || []).length} arte(s)</span>
                      <span className="pill">{Object.keys(s.colors || {}).length} cor(es)</span>
                      {Object.values(s.colors || {}).map((hex, i) => (
                        <span key={i} title={hex} style={{ width: 16, height: 16, borderRadius: 4, background: hex, border: '1px solid var(--line-strong)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
