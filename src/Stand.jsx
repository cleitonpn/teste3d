import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = `${import.meta.env.BASE_URL}models/estande.glb`;
const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`;

// Superfícies de arte editáveis (identificadas pelo nome do material no .glb).
// Para outros projetos, esta lista é o que precisaria ser mapeado (1x por projeto).
export const ART_PANELS = [
  { id: 'lona_avion', name: 'Lona avião (pôr do sol)', material: 'F05_Fresh_Green' },
  { id: 'foto_pista', name: 'Foto avião (pista)', material: 'L05_Cherry_Flame' },
  { id: 'infografico', name: 'Painel infográfico', material: 'L06_Crimson_Glow' },
  { id: 'logo_avant', name: 'Logo AVANT', material: 'Material-325' },
];

export default function Stand({ onReady, onArtReady }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);

  useEffect(() => {
    const byName = {};
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { if (m && m.name) byName[m.name] = m; });
      }
    });

    // monta a lista de painéis de arte encontrados, guardando a textura original
    const panels = ART_PANELS
      .map((p) => {
        const material = byName[p.material];
        if (!material) return null;
        return { ...p, material, originalMap: material.map || null };
      })
      .filter(Boolean);
    onArtReady?.(panels);

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    onReady?.({ min: box.min.clone(), max: box.max.clone(), size, center });
  }, [scene, onReady, onArtReady]);

  return <primitive object={scene} />;
}

useGLTF.preload(MODEL_URL, DRACO_PATH);
