import React from 'react';

const steps = [
  { icon: '🖱️', t: 'Girar e aproximar', d: 'Arraste para girar em volta do estande. Use o scroll (ou dois dedos) para dar zoom. Botão direito arrasta a vista de lado.' },
  { icon: '🎨', t: 'Trocar arte e cores', d: 'No canto superior esquerdo, abra "Trocar artes" para subir suas imagens/logos, e "Cores" para mudar a cor das superfícies liberadas.' },
  { icon: '🪑', t: 'Mexer nos móveis', d: 'Toque em "Móveis" (canto superior direito). Depois, clique e SEGURE em uma peça e arraste para movê-la. Você também pode Duplicar ou Excluir.' },
  { icon: '✅', t: 'Enviar para aprovação', d: 'Quando gostar do resultado, clique em "Enviar aprovação". Nós recebemos a sua versão personalizada.' },
];

export default function TutorialModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(8,12,16,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(560px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
        background: '#15191f', color: '#eef2f5', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18, padding: 24,
      }}>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#DB8A18' }}>
          Como personalizar
        </div>
        <h2 style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 800 }}>Bem-vindo ao seu estande 3D</h2>
        <p style={{ color: '#9fb0bc', fontSize: 14, marginBottom: 16 }}>
          É simples — em 4 passos você deixa o estande do seu jeito.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 26, lineHeight: 1 }}>{s.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{i + 1}. {s.t}</div>
                <div style={{ color: '#aebac4', fontSize: 13.5, marginTop: 2 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{
          marginTop: 18, width: '100%', background: '#DB8A18', color: '#1b1305', border: 'none',
          padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>Começar a personalizar</button>
      </div>
    </div>
  );
}
