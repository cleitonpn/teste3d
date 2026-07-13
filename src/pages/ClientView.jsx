import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getProject, getModelUrl, createSubmission } from '../lib/projects';
import Viewer from '../viewer/Viewer.jsx';
import TutorialModal from '../TutorialModal.jsx';

export default function ClientView() {
  const { id } = useParams();
  const [project, setProject] = useState(undefined);
  const [modelUrl, setModelUrl] = useState(null);
  const [erro, setErro] = useState('');
  // login persistente: recupera o cliente salvo no navegador
  const [cliente, setCliente] = useState(() => {
    try { const s = localStorage.getItem('mv_cliente_' + id); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showTut, setShowTut] = useState(false);
  const editsRef = useRef({ arts: {}, colors: {}, furnitureChanged: false });
  const captureRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProject(id);
        if (!p) { setProject(null); return; }
        setProject(p);
        setModelUrl(await getModelUrl(p.glbPath));
      } catch (e) { setErro(e.code || e.message); setProject(null); }
    })();
  }, [id]);

  // mostra o tutorial na primeira vez que o cliente entra
  useEffect(() => {
    if (cliente && project && !localStorage.getItem('mv_tut_seen')) {
      setShowTut(true);
      localStorage.setItem('mv_tut_seen', '1');
    }
  }, [cliente, project]);

  if (project === undefined) return <div className="center">Carregando projeto…</div>;
  if (project === null) return (
    <div className="center"><div style={{ textAlign: 'center' }}>
      <p style={{ fontWeight: 700, fontSize: 18 }}>Projeto não encontrado</p>
      <p className="muted">{erro || 'Verifique o link.'}</p>
    </div></div>
  );

  const entrar = (e) => {
    e.preventDefault();
    const c = { nome, email };
    try { localStorage.setItem('mv_cliente_' + id, JSON.stringify(c)); } catch { /* ignore */ }
    setCliente(c);
  };

  if (!cliente) {
    return (
      <div className="page">
        <div className="topbar"><div className="brand">Maquete <span className="b">Viva</span></div></div>
        <div className="wrap" style={{ maxWidth: 440 }}>
          <div className="eyebrow">{project.nome}</div>
          <h1 className="title">Vamos personalizar seu estande</h1>
          <p className="muted" style={{ marginTop: 6, marginBottom: 18 }}>
            Identifique-se para começar. Assim conseguimos registrar a versão que você aprovar.
          </p>
          <form className="card" onSubmit={entrar}>
            <div className="field"><label>Seu nome</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
            <div className="field"><label>E-mail</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <button className="btn pri" type="submit" style={{ width: '100%' }}>Entrar no estande 3D</button>
          </form>
        </div>
      </div>
    );
  }

  const enviar = async () => {
    if (sending) return;
    setSending(true);
    try {
      const shot = captureRef.current ? captureRef.current() : null;
      await createSubmission(id, {
        cliente: cliente.nome, email: cliente.email,
        colors: editsRef.current.colors, artFiles: editsRef.current.arts,
        screenshotDataUrl: shot,
      });
      setSent(true);
    } catch (e) {
      alert('Não consegui enviar: ' + (e.code || e.message));
    } finally { setSending(false); }
  };

  const extraUI = (
    <>
      <button onClick={() => setShowTut(true)} title="Como funciona" style={{
        position: 'fixed', left: 16, bottom: 16, zIndex: 30, width: 46, height: 46, borderRadius: '50%',
        background: 'rgba(15,20,26,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
        fontSize: 20, fontWeight: 700, cursor: 'pointer',
      }}>?</button>
      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 30 }}>
        <button onClick={enviar} disabled={sending || sent} style={{
          background: sent ? '#2E9A67' : '#DB8A18', color: sent ? '#fff' : '#1b1305', border: 'none',
          padding: '12px 20px', borderRadius: 999, fontSize: 15, fontWeight: 700,
          cursor: sending || sent ? 'default' : 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>{sent ? '✓ Enviado!' : sending ? 'Enviando…' : 'Enviar aprovação'}</button>
      </div>
    </>
  );

  return (
    <>
      <Viewer
        modelUrl={modelUrl}
        artConfig={project.painelDeArte || []}
        colorConfig={project.corEditavel || []}
        movablePaths={(project.moveis || []).map((m) => m.path)}
        editable
        editsRef={editsRef}
        captureRef={captureRef}
        extraUI={extraUI}
      />
      <TutorialModal open={showTut} onClose={() => setShowTut(false)} />
    </>
  );
}
