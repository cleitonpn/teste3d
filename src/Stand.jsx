import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const DEFAULT_URL = `${import.meta.env.BASE_URL}models/estande.glb`;
const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`;

// Superfícies de arte editáveis, por nome de material. No app, esta lista virá
// da configuração do projeto (marcada pelo projetista). Fallback = estande demo.
const DEMO_ART_PANELS = [
  { id: 'lona_avion', name: 'Lona avião (pôr do sol)', material: 'F05_Fresh_Green' },
  { id: 'foto_pista', name: 'Foto avião (pista)', material: 'L05_Cherry_Flame' },
  { id: 'infografico', name: 'Painel infográfico', material: 'L06_Crimson_Glow' },
  { id: 'logo_avant', name: 'Logo AVANT', material: 'Material-325' },
];

export default function Stand({ url = DEFAULT_URL, artConfig = DEMO_ART_PANELS, colorConfig = [], onReady, onArtReady, onColorReady, onScene, onPick }) {
  const { scene } = useGLTF(url, DRACO_PATH);

  const handleClick = (e) => {
    if (!onPick) return;
    e.stopPropagation();
    const mesh = e.object;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    onPick({
      object: mesh,
      material: mat || null,
      materialName: mat?.name || '',
      meshName: mesh.name || '',
      hasMap: !!(mat && mat.map),
      point: e.point,
    });
  };
  const setCursor = (c) => { if (onPick) document.body.style.cursor = c; };

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

    const panels = (artConfig || [])
      .map((p) => {
        const material = byName[p.material];
        if (!material) return null;
        return { ...p, material, originalMap: material.map || null };
      })
      .filter(Boolean);
    onArtReady?.(panels);

    const colorSurfaces = (colorConfig || [])
      .map((c) => {
        const material = byName[c.material];
        if (!material || !material.color) return null;
        return { ...c, material, originalColor: material.color.getHexString() };
      })
      .filter(Boolean);
    onColorReady?.(colorSurfaces);

    onScene?.(scene);

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    onReady?.({ min: box.min.clone(), max: box.max.clone(), size, center });
  }, [scene, artConfig, colorConfig, onReady, onArtReady, onColorReady, onScene]);

  return (
    <primitive
      object={scene}
      onClick={handleClick}
      onPointerOver={() => setCursor('pointer')}
      onPointerOut={() => setCursor('auto')}
    />
  );
}

useGLTF.preload(DEFAULT_URL, DRACO_PATH);
