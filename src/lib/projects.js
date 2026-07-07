import {
  collection, doc, addDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
  const q = query(collection(db, 'projetos'), where('dono', '==', uid), orderBy('criadoEm', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProject(id) {
  const snap = await getDoc(doc(db, 'projetos', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// URL para carregar o modelo no visualizador
export async function getModelUrl(glbPath) {
  return getDownloadURL(ref(storage, glbPath));
}
