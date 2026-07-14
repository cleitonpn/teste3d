import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';

// gera um token curto para o link público do cliente
const makeToken = () => Math.random().toString(36).slice(2, 10);

// Cria um projeto: sobe o .glb no Storage e grava o doc no Firestore.
// onProgress(0..100) para a barra de upload.
export async function createProject({ nome, file, uid, onProgress }) {
  const token = makeToken();
  const path = `models/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file, { contentType: 'model/gltf-binary' });

  await new Promise((resolve, reject) => {
    task.on('state_changed',
      (s) => onProgress?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      reject, resolve);
  });

  const docRef = await addDoc(collection(db, 'projetos'), {
    nome,
    dono: uid,
    glbPath: path,
    tokenPublico: token,
    criadoEm: serverTimestamp(),
    // configuração de edição (será preenchida na etapa de "marcar editáveis")
    painelDeArte: [],
    corEditavel: [],
    moveis: [],
  });
  return { id: docRef.id, token };
}

export async function listMyProjects(uid) {
  // sem orderBy no Firestore (evita índice composto) — ordena no cliente
  const q = query(collection(db, 'projetos'), where('dono', '==', uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
}

export async function getProject(id) {
  const snap = await getDoc(doc(db, 'projetos', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// URL para carregar o modelo no visualizador
export async function getModelUrl(glbPath) {
  return getDownloadURL(ref(storage, glbPath));
}

// Salva a configuração de edição marcada pelo projetista.
export async function updateProjectConfig(id, { painelDeArte, corEditavel, moveis }) {
  await updateDoc(doc(db, 'projetos', id), {
    ...(painelDeArte !== undefined ? { painelDeArte } : {}),
    ...(corEditavel !== undefined ? { corEditavel } : {}),
    ...(moveis !== undefined ? { moveis } : {}),
  });
}

// Exclui o projeto (arquivo no Storage + registro no Firestore).
export async function deleteProject(project) {
  try { if (project.glbPath) await deleteObject(ref(storage, project.glbPath)); }
  catch (e) { /* arquivo já pode não existir — segue removendo o registro */ }
  await deleteDoc(doc(db, 'projetos', project.id));
}

// Cliente envia sua versão: sobe artes trocadas + um preview (screenshot),
// grava as cores escolhidas e registra o envio.
export async function createSubmission(projectId, { cliente, email, colors, artFiles, screenshotDataUrl }) {
  const subId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  // guardado sob artes/ (regra de Storage já liberada)
  const base = `artes/envios/${projectId}/${subId}`;
  const artes = [];
  for (const [panelId, file] of Object.entries(artFiles || {})) {
    const path = `${base}/art_${panelId}.png`;
    await uploadBytes(ref(storage, path), file, { contentType: file.type || 'image/png' });
    artes.push({ panelId, path });
  }

  let screenshotPath = null;
  if (screenshotDataUrl) {
    const blob = await (await fetch(screenshotDataUrl)).blob();
    screenshotPath = `${base}/preview.jpg`;
    await uploadBytes(ref(storage, screenshotPath), blob, { contentType: 'image/jpeg' });
  }

  // grava tudo de uma vez (só "create", compatível com as regras)
  await setDoc(doc(db, 'projetos', projectId, 'envios', subId), {
    cliente: cliente || '', email: email || '', colors: colors || {}, artes, screenshotPath,
    criadoEm: serverTimestamp(),
  });
  return subId;
}

export async function listSubmissions(projectId) {
  const snap = await getDocs(collection(db, 'projetos', projectId, 'envios'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
}

export async function getFileUrl(path) {
  return getDownloadURL(ref(storage, path));
}

// ---- Catálogo de mobiliário ----
// Guardado sob models/{uid}/catalogo (reaproveita as regras existentes).
export async function createCatalogItem({ nome, categoria, file, uid, onProgress }) {
  const path = `models/${uid}/catalogo/${Date.now()}_${file.name}`;
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: 'model/gltf-binary' });
  await new Promise((resolve, reject) => {
    task.on('state_changed',
      (s) => onProgress?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      reject, resolve);
  });
  const docRef = await addDoc(collection(db, 'catalogo'), {
    nome, categoria: categoria || 'Outro', glbPath: path, dono: uid,
    tamanho: file.size, criadoEm: serverTimestamp(),
  });
  return docRef.id;
}

export async function listCatalog() {
  const snap = await getDocs(collection(db, 'catalogo'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
}

export async function deleteCatalogItem(item) {
  try { if (item.glbPath) await deleteObject(ref(storage, item.glbPath)); } catch (e) { /* ignore */ }
  await deleteDoc(doc(db, 'catalogo', item.id));
}
