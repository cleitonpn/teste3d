import React, { useRef } from 'react';

// Joystick virtual para andar no celular. Escreve {x, y} normalizado (-1..1)
// no ref recebido; y positivo = para frente.
export default function Joystick({ moveRef }) {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const active = useRef(false);
  const pointerId = useRef(null);
  const R = 46; // raio útil (px)

  const setKnob = (dx, dy) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const reset = () => {
    active.current = false;
    pointerId.current = null;
    moveRef.current = { x: 0, y: 0 };
    setKnob(0, 0);
  };

  const onDown = (e) => {
    active.current = true;
    pointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    update(e);
  };

  const update = (e) => {
    if (!active.current || e.pointerId !== pointerId.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > R) { dx = (dx / dist) * R; dy = (dy / dist) * R; }
    setKnob(dx, dy);
    moveRef.current = { x: dx / R, y: -dy / R };
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={onDown}
      onPointerMove={update}
      onPointerUp={reset}
      onPointerCancel={reset}
      style={{
        position: 'fixed',
        left: 24,
        bottom: 28,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        border: '2px solid rgba(255,255,255,0.25)',
        touchAction: 'none',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={knobRef}
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.85)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
