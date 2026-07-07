// Otimização de .glb no próprio navegador — SEM fundir peças (preserva cada
// objeto para permitir seleção, movimentação e medição).
//   metalRough  -> materiais spec/gloss viram metallic-roughness (render correto)
//   dedup/prune/weld -> remove redundância e solda vértices duplicados
//   texturas    -> reduz (máx 2K) e recomprime em WebP via canvas
//   reorder+quantize+Meshopt -> comprime a geometria (amigável ao navegador)
import { WebIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { metalRough, dedup, prune, weld, reorder, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const MAX_TEX = 2048;

let ioPromise = null;
async function getIO() {
  if (ioPromise) return ioPromise;
  ioPromise = (async () => {
    await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
    return new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    });
  })();
  return ioPromise;
}

async function resizeTexturesWebP(doc, onStage) {
  const textures = doc.getRoot().listTextures();
  for (let i = 0; i < textures.length; i++) {
    const tex = textures[i];
    const image = tex.getImage();
    if (!image) continue;
    const mime = tex.getMimeType() || 'image/png';
    let bmp;
    try { bmp = await createImageBitmap(new Blob([image], { type: mime })); } catch { continue; }
    const scale = Math.min(1, MAX_TEX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.85));
    if (blob) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      tex.setImage(buf).setMimeType('image/webp');
    }
    onStage?.(`texturas ${i + 1}/${textures.length}`);
  }
}

// Retorna { file, before, after, failed?, error? }. Se falhar, devolve o original.
export async function optimizeGlb(file, onStage = () => {}) {
  const before = file.size;
  try {
    const io = await getIO();
    onStage('lendo modelo');
    const doc = await io.readBinary(new Uint8Array(await file.arrayBuffer()));

    onStage('materiais e limpeza');
    await doc.transform(metalRough(), dedup(), prune(), weld());

    onStage('otimizando texturas');
    await resizeTexturesWebP(doc, onStage);

    onStage('comprimindo geometria');
    doc.createExtension(EXTMeshoptCompression).setRequired(true)
      .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize());

    onStage('finalizando');
    const out = await io.writeBinary(doc);
    const blob = new Blob([out.buffer || out], { type: 'model/gltf-binary' });
    const name = (file.name || 'modelo').replace(/\.glb$/i, '') + '_opt.glb';
    return { file: new File([blob], name, { type: 'model/gltf-binary' }), before, after: blob.size };
  } catch (e) {
    console.error('Otimização falhou — enviando arquivo original.', e);
    return { file, before, after: before, failed: true, error: e?.message || String(e) };
  }
}
