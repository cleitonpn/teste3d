import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { getProject, getModelUrl, updateProjectConfig } from '../lib/projects';
import { furnitureNode, pathFromRoot } from '../lib/nodePath';
import Viewer from '../viewer/Viewer.jsx';

const slug = () => Math.random().toString(36).slice(2, 8);

export default function ProjetistaEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [project, setProject] = useState(undefined);
  const [modelUrl, setModelUrl] = useState(null);
  const [erro, setErro] = useState('');
  const [picked, setPicked] = useState(null);
  const [name, setName] = useState('');
  const [artPanels, setArtPanels] = useState([]);
  const [colors, setColors] = useState([]);
  const [moveis, setMoveis] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const hl = useRef(null); // {mat, emissive, intensity}

  useEffect(() => {
    (async () => {
      try {
        const p = await getProject(id);
        if (!p) { setProject(null); return; }
        setProject(p);
        setArtPanels(p.painelDeArte || []);
        setColors(p.corEditavel || []);
        setMoveis(p.moveis || []);
        setModelUrl(await getModelUrl(p.glbPath));
      } catch (e) { setErro(e.code || e.message); setProject(null); }
    })();
  }, [id]);

  const onPick = (info) => {
    // realça a superfície clicada
    const mat = info.material;
    if (hl.current && hl.current.mat && hl.current.mat.emissive) {
      hl.current.mat.emissive.setHex(hl.current.emissive);
      hl.current.mat.emissiveIntensity = hl.current.intensity;
    }
    if (mat && mat.emissive) {
      hl.current = { mat, emissive: mat.emissive.getHex(), intensity: mat.emissiveIntensity ?? 1 };
      mat.emissive.setHex(0x2f6bff);
      mat.emissiveIntensity = 0.5;
    }
    setPicked(info);
    setName(info.materialName || info.meshName || '');
    setSaved(false);
  };

  const already = (list, m) => list.some((x) => x.material === m);

  const markArt = () => {
    if (!picked?.materialName) return;
    if (already(artPanels, picked.materialName)) return;
    setArtPanels([...artPanels, { id: slug(), name: name || picked.materialName, material: picked.materialName }]);
    setSaved(false);
  };
  const markColor = () => {
    if (!picked?.materialName) return;
    if (already(colors, picked.materialName)) return;
    setColors([...colors, { material: picked.materialName, name: name || picked.materialName }]);
    setSaved(false);
  };
  const markMovel = () => {
    if (!picked?.object) return;
    const { node, root } = furnitureNode(picked.object);
    const path = pathFromRoot(node, root);
    const key = path.join('/');
    if (moveis.some((x) => x.path.join('/') === key)) return;
    setMoveis([...moveis, { path, name: name || picked.meshName || 'Móvel' }]);
    setSaved(false);
  };
  const rmArt = (m) => setArtPanels(artPanels.filter((x) => x.material !== m));
  const rmColor = (m) => setColors(colors.filter((x) => x.material !== m));
  const rmMovel = (key) => setMoveis(moveis.filter((x) => x.path.join('/') !== key));

  const save = async () => {
    setSaving(true);
    try {
      await updateProjectConfig(id, { painelDeArte: artPanels, corEditavel: colors, moveis });
      setSaved(true);
    } catch (e) { setErro('Falha ao salvar: ' + (e.code || e.message)); }
    finally { setSaving(false); }
  };

  if (project === undefined) return <div className="center">Carregando…</div>;
  if (project === null) return <div className="center">Projeto não encontrado. {erro}</div>;

  return (
    <>
      {modelUrl && <Viewer modelUrl={modelUrl} artConfig={[]} picking onPick={onPick} />}

      {/* Painel de marcação */}
      <div style={panel}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: '#DB8A18', textTransform: 'uppercase' }}>
          Projetista · marcar editáveis
        </div>
        <div style={{ fontWeight: 800, fontSize: 17, margin: '4px 0 2px' }}>{project.nome}</div>
        <div style={{ fontSize: 12.5, color: '#9fb0bc', marginBottom: 10 }}>
          Clique numa superfície do estande e diga o que ela é.
        </div>

        {picked ? (
          <div style={box}>
            <div style={{ fontSize: 12, color: '#9fb0bc' }}>Superfície selecionada</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5, margin: '3px 0 8px', wordBreak: 'break-all' }}>
              {picked.materialName || <em>(sem nome de material)</em>} {picked.hasMap ? '· tem textura' : ''}
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome amigável (ex.: Lona do fundo / Cadeira)"
              style={input} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={btnArt} disabled={!picked.materialName} onClick={markArt}>+ Arte</button>
              <button style={btnColor} disabled={!picked.materialName} onClick={markColor}>+ Cor</button>
              <button style={btnMovel} disabled={!picked.object} onClick={markMovel}>+ Móvel</button>
            </div>
            {!picked.materialName && <div style={{ color: '#9fb0bc', fontSize: 11.5, marginTop: 6 }}>
              Sem nome de material (só afeta Arte/Cor). "+ Móvel" funciona por peça.
            </div>}
          </div>
        ) : <div style={{ ...box, color: '#9fb0bc', fontSize: 13 }}>Nenhuma superfície selecionada ainda.</div>}

        <Section title={`Artes (${artPanels.length})`} items={artPanels}
          render={(x) => x.name} onRemove={(x) => rmArt(x.material)} empty="Nenhuma arte marcada." />
        <Section title={`Cores (${colors.length})`} items={colors}
          render={(x) => x.name} onRemove={(x) => rmColor(x.material)} empty="Nenhuma cor marcada." />
        <Section title={`Móveis (${moveis.length})`} items={moveis}
          render={(x) => x.name} onRemove={(x) => rmMovel(x.path.join('/'))} empty="Nenhum móvel marcado." />

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => nav('/app')} style={{ flex: 1 }}>Voltar</button>
          <button className="btn pri" onClick={save} disabled={saving} style={{ flex: 1.4 }}>
            {saving ? 'Salvando…' : saved ? '✓ Salvo' : 'Salvar'}
          </button>
        </div>
        {erro && <div className="err">{erro}</div>}
      </div>
    </>
  );
}

function Section({ title, items, render, onRemove, empty }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: '#9fb0bc', textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
      {items.length === 0 ? <div style={{ fontSize: 12, color: '#6c808e' }}>{empty}</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {items.map((x, i) => (
            <div key={i} style={rowItem}>
              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{render(x)}</span>
              <button onClick={() => onRemove(x)} style={rmBtn}>remover</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const panel = {
  position: 'fixed', left: 16, top: 16, zIndex: 40, width: 320, maxWidth: '92vw',
  maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
  background: 'rgba(15,20,26,0.92)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 14, padding: 16, fontFamily: 'system-ui,sans-serif',
};
const box = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, marginTop: 6 };
const input = { width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '9px 11px', color: '#fff', fontSize: 14 };
const btnArt = { flex: 1, background: '#DB8A18', color: '#1b1305', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 700, cursor: 'pointer' };
const btnColor = { flex: 1, background: '#2f6bff', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 700, cursor: 'pointer' };
const btnMovel = { flex: 1, background: '#2E9A67', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 700, cursor: 'pointer' };
const rowItem = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 7, padding: '7px 10px' };
const rmBtn = { background: 'transparent', border: 'none', color: '#E4685A', fontSize: 12, cursor: 'pointer' };
