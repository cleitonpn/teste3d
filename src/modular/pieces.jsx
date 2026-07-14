import React from 'react';

// snap: 'cell' (grade de módulos), 'edge' (paredes na borda do módulo), 'free' (0,5m)
// mount: 'floor' (nível) | 'elevated' (+10cm sobre o piso do módulo)
export const PIECES = [
  { id: 'modulo', nome: 'Módulo 3×3', cat: 'Estrutura', icon: '🧱', snap: 'cell', foot: [3, 3], mount: 'floor' },
  { id: 'modulo6', nome: 'Módulo 6×3', cat: 'Estrutura', icon: '🏗️', snap: 'cell', foot: [6, 3], mount: 'floor' },
  { id: 'piso', nome: 'Só piso 3×3', cat: 'Estrutura', icon: '⬛', snap: 'cell', foot: [3, 3], mount: 'floor' },
  { id: 'vazado', nome: 'Estrutura vazada', cat: 'Estrutura', icon: '🔲', snap: 'cell', foot: [3, 3], mount: 'floor' },

  { id: 'parede', nome: 'Parede', cat: 'Paredes', icon: '🚧', snap: 'edge', foot: [2.8, 0.1], mount: 'elevated' },
  { id: 'jardim', nome: 'Jardim vertical', cat: 'Paredes', icon: '🌿', snap: 'edge', foot: [2.8, 0.1], mount: 'elevated' },
  { id: 'vidro', nome: 'Parede de vidro', cat: 'Paredes', icon: '🪟', snap: 'edge', foot: [2.8, 0.1], mount: 'elevated' },
  { id: 'testeira', nome: 'Testeira', cat: 'Paredes', icon: '📛', snap: 'edge', foot: [2.8, 0.1], mount: 'floor' },
  { id: 'led', nome: 'Painel LED', cat: 'Paredes', icon: '📟', snap: 'edge', foot: [3, 0.1], mount: 'elevated' },

  { id: 'balcao', nome: 'Balcão atend.', cat: 'Mobiliário', icon: '🛎️', snap: 'free', foot: [1, 0.5], mount: 'elevated' },
  { id: 'balcao_bar', nome: 'Balcão bar', cat: 'Mobiliário', icon: '🍸', snap: 'free', foot: [2, 0.5], mount: 'elevated' },
  { id: 'mesa', nome: 'Mesa alta', cat: 'Mobiliário', icon: '🍽️', snap: 'free', foot: [1, 1], mount: 'elevated' },
  { id: 'mesa_centro', nome: 'Mesa de centro', cat: 'Mobiliário', icon: '☕', snap: 'free', foot: [0.8, 0.8], mount: 'elevated' },
  { id: 'cadeira', nome: 'Cadeira', cat: 'Mobiliário', icon: '💺', snap: 'free', foot: [0.5, 0.5], mount: 'elevated' },
  { id: 'banqueta', nome: 'Banqueta', cat: 'Mobiliário', icon: '🪑', snap: 'free', foot: [0.5, 0.5], mount: 'elevated' },
  { id: 'poltrona', nome: 'Poltrona', cat: 'Mobiliário', icon: '🛋️', snap: 'free', foot: [0.9, 0.8], mount: 'elevated' },
  { id: 'sofa', nome: 'Sofá', cat: 'Mobiliário', icon: '🛋️', snap: 'free', foot: [2.1, 0.8], mount: 'elevated' },
  { id: 'jardineira', nome: 'Jardineira', cat: 'Mobiliário', icon: '🪴', snap: 'free', foot: [1, 0.4], mount: 'elevated' },
  { id: 'geladeira', nome: 'Geladeira', cat: 'Mobiliário', icon: '🧊', snap: 'free', foot: [0.7, 0.65], mount: 'elevated' },
  { id: 'estante', nome: 'Estante', cat: 'Mobiliário', icon: '📚', snap: 'free', foot: [0.9, 0.4], mount: 'elevated' },

  { id: 'tv', nome: 'TV 50"', cat: 'Tecnologia', icon: '📺', snap: 'free', foot: [1.2, 0.1], mount: 'elevated' },
  { id: 'spot', nome: 'Spot de luz', cat: 'Tecnologia', icon: '💡', snap: 'free', foot: [0.3, 0.3], mount: 'floor' },
];
export const PIECE_MAP = Object.fromEntries(PIECES.map((p) => [p.id, p]));

function M({ color, metalness = 0, roughness = 0.8, emissive, opacity = 1, ghost }) {
  const t = ghost || opacity < 1;
  return <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} emissive={emissive}
    transparent={t} opacity={ghost ? 0.5 : opacity} depthWrite={t ? false : undefined} />;
}
function B({ a, p, children }) { return <mesh position={p} castShadow receiveShadow><boxGeometry args={a} />{children}</mesh>; }
function C({ a, p, children }) { return <mesh position={p} castShadow><cylinderGeometry args={a} />{children}</mesh>; }

const metal = (g) => <M color="#26282c" metalness={0.7} roughness={0.4} ghost={g} />;

function ModuleFrame({ w, d, floor, ghost }) {
  const hw = w / 2 - 0.04, hd = d / 2 - 0.04;
  const posts = [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]];
  if (w > 3) { posts.push([0, -hd], [0, hd]); }
  return (
    <group>
      {floor && <B a={[w, 0.1, d]} p={[0, 0.05, 0]}><M color="#3a3e45" ghost={ghost} /></B>}
      {posts.map((pp, i) => <B key={i} a={[0.08, 3, 0.08]} p={[pp[0], 1.5, pp[1]]}>{metal(ghost)}</B>)}
      <B a={[w, 0.08, 0.08]} p={[0, 2.96, -hd]}>{metal(ghost)}</B>
      <B a={[w, 0.08, 0.08]} p={[0, 2.96, hd]}>{metal(ghost)}</B>
      <B a={[0.08, 0.08, d]} p={[-hw, 2.96, 0]}>{metal(ghost)}</B>
      <B a={[0.08, 0.08, d]} p={[hw, 2.96, 0]}>{metal(ghost)}</B>
      {w > 3 && <B a={[0.08, 0.08, d]} p={[0, 2.96, 0]}>{metal(ghost)}</B>}
    </group>
  );
}

export default function PieceMesh({ kind, ghost: g }) {
  switch (kind) {
    case 'modulo': return <ModuleFrame w={3} d={3} floor ghost={g} />;
    case 'modulo6': return <ModuleFrame w={6} d={3} floor ghost={g} />;
    case 'piso': return <B a={[3, 0.1, 3]} p={[0, 0.05, 0]}><M color="#3a3e45" ghost={g} /></B>;
    case 'vazado': return <ModuleFrame w={3} d={3} floor={false} ghost={g} />;

    case 'parede': return <B a={[2.8, 2.8, 0.08]} p={[0, 1.4, 0]}><M color="#e8e8ea" roughness={1} ghost={g} /></B>;
    case 'jardim': return <B a={[2.8, 2.8, 0.1]} p={[0, 1.4, 0]}><M color="#2e7d32" roughness={0.9} ghost={g} /></B>;
    case 'vidro': return (
      <group>
        <B a={[2.8, 2.8, 0.03]} p={[0, 1.4, 0]}><M color="#a8d3ff" roughness={0.1} metalness={0.1} opacity={0.32} ghost={g} /></B>
        <B a={[2.8, 0.06, 0.06]} p={[0, 0.03, 0]}><M color="#1a1a1a" ghost={g} /></B>
        <B a={[2.8, 0.06, 0.06]} p={[0, 2.77, 0]}><M color="#1a1a1a" ghost={g} /></B>
        <B a={[0.06, 2.8, 0.06]} p={[-1.4, 1.4, 0]}><M color="#1a1a1a" ghost={g} /></B>
        <B a={[0.06, 2.8, 0.06]} p={[1.4, 1.4, 0]}><M color="#1a1a1a" ghost={g} /></B>
      </group>
    );
    case 'testeira': return <B a={[2.8, 0.5, 0.08]} p={[0, 2.7, 0]}><M color="#f2f2f4" ghost={g} /></B>;
    case 'led': return (
      <group>
        <B a={[3, 2, 0.08]} p={[0, 1.2, 0]}><M color="#0a0a0a" ghost={g} /></B>
        <B a={[2.9, 1.9, 0.09]} p={[0, 1.2, 0.01]}><M color="#0b1030" emissive="#12309a" ghost={g} /></B>
      </group>
    );

    case 'balcao': return (
      <group>
        <B a={[1, 0.9, 0.5]} p={[0, 0.45, 0]}><M color="#ffffff" roughness={0.5} ghost={g} /></B>
        <B a={[1.06, 0.05, 0.56]} p={[0, 0.92, 0]}><M color="#c19a6b" roughness={0.7} ghost={g} /></B>
      </group>
    );
    case 'balcao_bar': return (
      <group>
        <B a={[2, 0.9, 0.5]} p={[0, 0.45, 0]}><M color="#ffffff" roughness={0.5} ghost={g} /></B>
        <B a={[2.06, 0.05, 0.56]} p={[0, 0.92, 0]}><M color="#c19a6b" roughness={0.7} ghost={g} /></B>
      </group>
    );
    case 'mesa': return (
      <group>
        <C a={[0.5, 0.5, 0.04, 32]} p={[0, 0.74, 0]}><M color="#ffffff" roughness={0.4} ghost={g} /></C>
        <C a={[0.05, 0.03, 0.74, 12]} p={[0, 0.37, 0]}>{metal(g)}</C>
      </group>
    );
    case 'mesa_centro': return (
      <group>
        <C a={[0.4, 0.4, 0.04, 32]} p={[0, 0.4, 0]}><M color="#ffffff" roughness={0.4} ghost={g} /></C>
        <C a={[0.03, 0.02, 0.4, 12]} p={[0, 0.2, 0]}>{metal(g)}</C>
      </group>
    );
    case 'cadeira': case 'banqueta': {
      const h = kind === 'banqueta' ? 0.75 : 0.46;
      return (
        <group>
          <B a={[0.42, 0.05, 0.42]} p={[0, h, 0]}><M color="#efefef" ghost={g} /></B>
          <B a={[0.42, 0.35, 0.05]} p={[0, h + 0.2, -0.19]}><M color="#efefef" ghost={g} /></B>
          {[[0.16, 0.16], [-0.16, 0.16], [0.16, -0.16], [-0.16, -0.16]].map((pp, i) =>
            <C key={i} a={[0.02, 0.015, h, 8]} p={[pp[0], h / 2, pp[1]]}><M color="#c19a6b" ghost={g} /></C>)}
        </group>
      );
    }
    case 'poltrona': case 'sofa': {
      const w = kind === 'sofa' ? 2.1 : 0.9;
      return (
        <group>
          <B a={[w - 0.15, 0.15, 0.7]} p={[0, 0.2, 0]}><M color="#3a3a3a" roughness={0.9} ghost={g} /></B>
          <B a={[w, 0.45, 0.15]} p={[0, 0.45, -0.27]}><M color="#3a3a3a" roughness={0.9} ghost={g} /></B>
          <B a={[0.12, 0.4, 0.7]} p={[-w / 2 + 0.06, 0.35, 0]}><M color="#3a3a3a" roughness={0.9} ghost={g} /></B>
          <B a={[0.12, 0.4, 0.7]} p={[w / 2 - 0.06, 0.35, 0]}><M color="#3a3a3a" roughness={0.9} ghost={g} /></B>
        </group>
      );
    }
    case 'jardineira': return (
      <group>
        <B a={[1, 0.4, 0.4]} p={[0, 0.2, 0]}><M color="#ffffff" ghost={g} /></B>
        <B a={[0.95, 0.25, 0.35]} p={[0, 0.5, 0]}><M color="#2e7d32" roughness={0.9} ghost={g} /></B>
      </group>
    );
    case 'geladeira': return <B a={[0.7, 1.9, 0.65]} p={[0, 0.95, 0]}><M color="#aaaaaa" metalness={0.6} roughness={0.4} ghost={g} /></B>;
    case 'estante': return (
      <group>{[0, 1, 2, 3, 4].map((i) => <B key={i} a={[0.9, 0.02, 0.4]} p={[0, 0.2 + i * 0.4, 0]}><M color="#aaaaaa" metalness={0.6} roughness={0.4} ghost={g} /></B>)}</group>
    );

    case 'tv': return (
      <group>
        <B a={[1.2, 0.7, 0.06]} p={[0, 1.6, 0]}><M color="#111111" ghost={g} /></B>
        <B a={[1.12, 0.62, 0.07]} p={[0, 1.6, 0.005]}><M color="#0a1a3a" emissive="#0a2a6a" ghost={g} /></B>
      </group>
    );
    case 'spot': return (
      <group>
        <C a={[0.08, 0.08, 0.06, 16]} p={[0, 2.9, 0]}><M color="#eeeeee" ghost={g} /></C>
        {!g && <pointLight position={[0, 2.7, 0]} intensity={6} distance={6} color="#ffddaa" />}
      </group>
    );
    default: return null;
  }
}
