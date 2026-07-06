import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EYE_HEIGHT = 1.6; // altura dos olhos (m)
const SPEED = 1.9; // velocidade de caminhada (m/s)
const INSET = 0.5; // margem para não atravessar as paredes (m)
const PITCH_LIMIT = Math.PI / 2 - 0.05;

// Controles em primeira pessoa:
//  - Desktop: clique para travar o mouse, WASD/setas para andar, mouse para olhar.
//  - Celular: arraste na tela para olhar; joystick (via props) para andar.
export default function Player({ bounds, look, move }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const keys = useRef({});
  const started = useRef(false);

  // Posiciona a câmera assim que a bounding box do modelo estiver pronta.
  useEffect(() => {
    if (!bounds || started.current) return;
    started.current = true;
    const { center, min } = bounds;
    camera.position.set(center.x, min.y + EYE_HEIGHT, center.z);
    yaw.current = 0;
    pitch.current = 0;
  }, [bounds, camera]);

  // Teclado (desktop).
  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true; };
    const up = (e) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Olhar: mouse (pointer lock no desktop) + arrastar (touch no celular).
  useEffect(() => {
    const el = gl.domElement;
    const SENS_LOCK = 0.0022;
    const SENS_DRAG = 0.005;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let dragPointer = null;

    const applyDelta = (dx, dy, sens) => {
      yaw.current -= dx * sens;
      pitch.current -= dy * sens;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    };

    const onMouseMove = (e) => {
      if (document.pointerLockElement === el) {
        applyDelta(e.movementX, e.movementY, SENS_LOCK);
      }
    };
    const onClick = () => {
      if (document.pointerLockElement !== el) el.requestPointerLock?.();
    };
    const onPointerDown = (e) => {
      if (e.pointerType === 'touch') {
        dragging = true;
        dragPointer = e.pointerId;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const onPointerMove = (e) => {
      if (dragging && e.pointerId === dragPointer) {
        applyDelta(e.clientX - lastX, e.clientY - lastY, SENS_DRAG);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const onPointerUp = (e) => {
      if (e.pointerId === dragPointer) { dragging = false; dragPointer = null; }
    };

    el.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [gl]);

  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    // Expõe o yaw para o overlay (bússola), se necessário.
    if (look) look.current = { yaw: yaw.current, pitch: pitch.current };

    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;

    const k = keys.current;
    let mf = (k.KeyW || k.ArrowUp ? 1 : 0) + (k.KeyS || k.ArrowDown ? -1 : 0);
    let mr = (k.KeyD || k.ArrowRight ? 1 : 0) + (k.KeyA || k.ArrowLeft ? -1 : 0);
    if (move?.current) { mf += move.current.y; mr += move.current.x; }
    if (mf === 0 && mr === 0) return;

    forward.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    right.current.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

    const step = SPEED * Math.min(delta, 0.05);
    camera.position.addScaledVector(forward.current, mf * step);
    camera.position.addScaledVector(right.current, mr * step);

    if (bounds) {
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, bounds.min.x + INSET, bounds.max.x - INSET);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, bounds.min.z + INSET, bounds.max.z - INSET);
      camera.position.y = bounds.min.y + EYE_HEIGHT;
    }
  });

  return null;
}
