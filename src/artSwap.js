import * as THREE from 'three';

const loader = new THREE.TextureLoader();

// Aplica uma imagem (arquivo do usuário) como nova textura do painel,
// preservando o mapeamento (UV/repeat/offset) da arte original.
export async function applyArtFile(panel, file) {
  const url = URL.createObjectURL(file);
  try {
    const tex = await loader.loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false; // convenção glTF
    const ref = panel.originalMap || panel.material.map;
    if (ref) {
      tex.wrapS = ref.wrapS;
      tex.wrapT = ref.wrapT;
      tex.repeat.copy(ref.repeat);
      tex.offset.copy(ref.offset);
      tex.center.copy(ref.center);
      tex.rotation = ref.rotation;
    }
    tex.anisotropy = 8;
    tex.needsUpdate = true;

    const cur = panel.material.map;
    if (cur && cur !== panel.originalMap) cur.dispose();
    panel.material.map = tex;
    panel.material.needsUpdate = true;
    return tex.image ? { w: tex.image.width, h: tex.image.height } : null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Restaura a arte original do painel.
export function resetArt(panel) {
  const cur = panel.material.map;
  if (cur && cur !== panel.originalMap) cur.dispose();
  panel.material.map = panel.originalMap;
  panel.material.needsUpdate = true;
}
