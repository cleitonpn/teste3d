import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = `${import.meta.env.BASE_URL}models/estande.glb`;
const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`;

// Carrega o estande otimizado (Draco + WebP) e reporta a caixa envolvente
// (bounding box) para posicionar a câmera e limitar o caminhar.
export default function Stand({ onReady }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) o.material.side = THREE.FrontSide;
      }
    });
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    onReady?.({ min: box.min.clone(), max: box.max.clone(), size, center });
  }, [scene, onReady]);

  return <primitive object={scene} />;
}

useGLTF.preload(MODEL_URL, DRACO_PATH);
