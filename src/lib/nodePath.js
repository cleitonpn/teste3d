import * as THREE from 'three';

// Raiz do modelo glTF (o objeto cujo pai é a cena do r3f).
export function gltfRoot(node) {
  let n = node;
  while (n.parent && n.parent.type !== 'Scene') n = n.parent;
  return n;
}

// A partir da malha clicada, sobe até um "grupo de móvel" razoável: para de subir
// quando o pai fica grande demais (estrutura do estande), evitando selecionar tudo.
export function furnitureNode(hitMesh) {
  const root = gltfRoot(hitMesh);
  const rootSize = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  const standMax = Math.max(rootSize.x, rootSize.y, rootSize.z) || 1;
  const box = new THREE.Box3();
  const s = new THREE.Vector3();
  let node = hitMesh;
  while (node.parent && node.parent !== root && node.parent.type !== 'Scene') {
    box.setFromObject(node.parent); box.getSize(s);
    if (Math.max(s.x, s.y, s.z) > standMax * 0.5) break;
    node = node.parent;
  }
  return { node, root };
}

// Caminho (índices de filhos) da raiz até o nó — estável entre recarregamentos.
export function pathFromRoot(node, root) {
  const idx = [];
  let n = node;
  while (n !== root && n.parent) { idx.unshift(n.parent.children.indexOf(n)); n = n.parent; }
  return idx;
}

// Resolve um caminho de volta para o objeto, a partir da raiz.
export function resolvePath(root, path) {
  let n = root;
  for (const i of path) { if (!n || !n.children[i]) return null; n = n.children[i]; }
  return n;
}
