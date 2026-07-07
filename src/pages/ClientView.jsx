import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getProject, getModelUrl, createSubmission } from '../lib/projects';
import Viewer from '../viewer/Viewer.jsx';

export default function ClientView() {
  const { id } = useParams();
  const [project, setProject] = useState(undefined); // undefined=carregando, null=nao existe
  const [modelUrl, setModelUrl] = useState(null);
  const [erro, setErro] = useState('');
  const [cliente, setCliente] = useState(null); // {nome,email}
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const editsRef = useRef({ arts: {}, colors: {}, furnitureChanged: false });

  useEffect(() => {
    (async () => {
      try {
        const p = await getProject(id);
        if (!p) { setProject(null); return; }
        setProject(p);
        setModelUrl(await getModelUrl(p.glbPath));
      } catch (e) {
        setErro(e.code || e.message);
        setProject(null);
      }
    })();
  }, [id]);

  if (project === undefined) return <div className="center">Carregando projeto…</div>;
  if (project === null) return (
    <div className="center"><div style={{ textAlign: 'center' }}>
      <p style={{ fontWeight: 700, fontSize: 18 }}>Projeto não encontrado</p>
      <p className="muted">{erro || 'Verifique o link.'}</p>
    </div></div>
  );

  // login leve do cliente
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
          <form className="card" onSubmit={(e) => { e.preventDefault(); setCliente({ nome, email }); }}>
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
      const canvas = document.querySelector('canvas');
      const shot = canvas ? canvas.toDataURL('image/jpeg', 0.85) : null;
      await createSubmission(id, {
        cliente: cliente.nome, email: cliente.email,
        colors: editsRef.current.colors, artFiles: editsRef.current.arts,
        screenshotDataUrl: shot,
      });
      setSent(true);
    } catch (e) {
      alert('Não consegui enviar: ' + (e.code || e.message));
    } finally {
      setSending(false);
    }
  };

  const extraUI = (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 30 }}>
      <button onClick={enviar} disabled={sending || sent} style={{
        background: sent ? '#2E9A67' : '#DB8A18', color: sent ? '#fff' : '#1b1305', border: 'none',
        padding: '12px 20px', borderRadius: 999, fontSize: 15, fontWeight: 700,
        cursor: sending || sent ? 'default' : 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>{sent ? '✓ Enviado!' : sending ? 'Enviando…' : 'Enviar aprovação'}</button>
    </div>
  );

  return (
    <Viewer
      modelUrl={modelUrl}
      artConfig={project.painelDeArte || []}
      colorConfig={project.corEditavel || []}
      editable
      editsRef={editsRef}
      extraUI={extraUI}
    />
  );
}
