import React from 'react';

// Metadados das peças (paleta + snap + preço). base da geometria em y=0.
export const PIECES = [
  { id: 'modulo', nome: 'Módulo 3×3', cat: 'Estrutura', icon: '🧱', snap: 3, foot: [3, 3] },
  { id: 'parede', nome: 'Parede', cat: 'Estrutura', icon: '🚧', snap: 0.5, foot: [2.8, 0.1] },
  { id: 'vidro', nome: 'Parede de vidro', cat: 'Estrutura', icon: '🪟', snap: 0.5, foot: [2.8, 0.1] },
  { id: 'testeira', nome: 'Testeira', cat: 'Estrutura', icon: '📛', snap: 0.5, foot: [2.8, 0.1] },
  { id: 'balcao', nome: 'Balcão', cat: 'Mobiliário', icon: '🛎️', snap: 0.5, foot: [1, 0.5] },
  { id: 'mesa', nome: 'Mesa', cat: 'Mobiliário', icon: '🪑', snap: 0.5, foot: [1, 1] },
  { id: 'cadeira', nome: 'Cadeira', cat: 'Mobiliário', icon: '💺', snap: 0.5, foot: [0.5, 0.5] },
  { id: 'tv', nome: 'Painel / TV', cat: 'Tecnologia', icon: '📺', snap: 0.5, foot: [1.2, 0.1] },
];
export const PIECE_MAP = Object.fromEntries(PIECES.map((p) => [p.id, p]));

// material com suporte a "ghost" (semitransparente no preview)
function M({ color, metalness = 0, roughness = 0.8, emissive, opacity = 1, ghost }) {
  return (
    <meshStandardMaterial
      color={color} metalness={metalness} roughness={roughness} emissive={emissive}
      transparent={ghost || opacity < 1} opacity={ghost ? 0.5 : opacity}
      depthWrite={!(ghost || opacity < 1) ? undefined : false}
    />
  );
}

function Box({ args, position, children }) {
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={args} />{children}</mesh>;
}

export default function PieceMesh({ kind, ghost }) {
  const g = ghost;
  switch (kind) {
    case 'modulo': {
      const posts = [[-1.45, -1.45], [1.45, -1.45], [-1.45, 1.45], [1.45, 1.45]];
      return (
        <group>
          <Box args={[3, 0.1, 3]} position={[0, 0.05, 0]}><M color="#3a3e45" ghost={g} /></Box>
          {posts.map((p, i) => (
            <Box key={i} args={[0.08, 3, 0.08]} position={[p[0], 1.5, p[1]]}><M color="#26282c" metalness={0.7} roughness={0.4} ghost={g} /></Box>
          ))}
          <Box args={[3, 0.08, 0.08]} position={[0, 2.96, -1.45]}><M color="#26282c" metalness={0.7} ghost={g} /></Box>
          <Box args={[3, 0.08, 0.08]} position={[0, 2.96, 1.45]}><M color="#26282c" metalness={0.7} ghost={g} /></Box>
          <Box args={[0.08, 0.08, 3]} position={[-1.45, 2.96, 0]}><M color="#26282c" metalness={0.7} ghost={g} /></Box>
          <Box args={[0.08, 0.08, 3]} position={[1.45, 2.96, 0]}><M color="#26282c" metalness={0.7} ghost={g} /></Box>
        </group>
      );
    }
    case 'parede':
      return <Box args={[2.8, 2.8, 0.08]} position={[0, 1.4, 0]}><M color="#e8e8ea" roughness={1} ghost={g} /></Box>;
    case 'vidro':
      return (
        <group>
          <Box args={[2.8, 2.8, 0.03]} position={[0, 1.4, 0]}><M color="#a8d3ff" roughness={0.1} metalness={0.1} opacity={0.35} ghost={g} /></Box>
          <Box args={[2.8, 0.06, 0.06]} position={[0, 0.03, 0]}><M color="#1a1a1a" ghost={g} /></Box>
          <Box args={[2.8, 0.06, 0.06]} position={[0, 2.77, 0]}><M color="#1a1a1a" ghost={g} /></Box>
        </group>
      );
    case 'testeira':
      return <Box args={[2.8, 0.5, 0.08]} position={[0, 2.7, 0]}><M color="#f2f2f4" ghost={g} /></Box>;
    case 'balcao':
      return (
        <group>
          <Box args={[1, 0.9, 0.5]} position={[0, 0.45, 0]}><M color="#ffffff" roughness={0.5} ghost={g} /></Box>
          <Box args={[1.06, 0.05, 0.56]} position={[0, 0.92, 0]}><M color="#c19a6b" roughness={0.7} ghost={g} /></Box>
        </group>
      );
    case 'mesa':
      return (
        <group>
          <mesh position={[0, 0.74, 0]} castShadow><cylinderGeometry args={[0.5, 0.5, 0.04, 32]} /><M color="#ffffff" roughness={0.4} ghost={g} /></mesh>
          <mesh position={[0, 0.37, 0]} castShadow><cylinderGeometry args={[0.05, 0.03, 0.74, 12]} /><M color="#26282c" metalness={0.6} roughness={0.4} ghost={g} /></mesh>
        </group>
      );
    case 'cadeira':
      return (
        <group>
          <Box args={[0.42, 0.05, 0.42]} position={[0, 0.46, 0]}><M color="#efefef" ghost={g} /></Box>
          <Box args={[0.42, 0.4, 0.05]} position={[0, 0.66, -0.19]}><M color="#efefef" ghost={g} /></Box>
          {[[0.16, 0.16], [-0.16, 0.16], [0.16, -0.16], [-0.16, -0.16]].map((p, i) => (
            <mesh key={i} position={[p[0], 0.23, p[1]]} castShadow><cylinderGeometry args={[0.02, 0.015, 0.46, 8]} /><M color="#c19a6b" ghost={g} /></mesh>
          ))}
        </group>
      );
    case 'tv':
      return (
        <group>
          <Box args={[1.2, 0.7, 0.06]} position={[0, 1.6, 0]}><M color="#111111" ghost={g} /></Box>
          <Box args={[1.12, 0.62, 0.07]} position={[0, 1.6, 0.005]}><M color="#0a1a3a" emissive="#0a2a6a" ghost={g} /></Box>
        </group>
      );
    default:
      return null;
  }
}
