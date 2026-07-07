import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EYE_HEIGHT = 1.6;   // altura dos olhos no modo Pessoa (m)
const WALK_SPEED = 2.2;   // m/s andando
const FLY_SPEED = 7.0;    // m/s de drone
const INSET = 0.35;       // margem das paredes no modo Pessoa (m)

// Controles em primeira pessoa com dois modos:
//  - 'walk'  : anda no plano, altura fixa, limitado ao estande.
//  - 'drone' : voa livre (inclusive para cima/baixo), pode olhar de cima.
export default function Player({ bounds, mode, move, vertical, look }) {
  const { camera, gl } = useThree();
  const yaw = useRef(-Math.PI / 4);
  const pitch = useRef(0);
  const keys = useRef({});
  const started = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Posição inicial na entrada do estande, olhando na diagonal para dentro.
  useEffect(() => {
    if (!bounds || started.current) return;
    started.current = true;
    const { center, min, max } = bounds;
    camera.position.set(center.x, min.y + EYE_HEIGHT, max.z - 0.8);
    yaw.current = -Math.PI / 4;
    pitch.current = 0;
  }, [bounds, camera]);

  // Teclado.
  useEffect(() => {
    const down = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    };
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
    let dragging = false, lastX = 0, lastY = 0, dragPointer = null;

    const clampPitch = () => {
      const lim = modeRef.current === 'drone' ? Math.PI / 2 - 0.02 : Math.PI / 2 - 0.08;
      pitch.current = Math.max(-lim, Math.min(lim, pitch.current));
    };
    const applyDelta = (dx, dy, sens) => {
      yaw.current -= dx * sens;
      pitch.current -= dy * sens;
      clampPitch();
    };
    const onMouseMove = (e) => {
      if (document.pointerLockElement === el) applyDelta(e.movementX, e.movementY, SENS_LOCK);
    };
    const onClick = () => {
      if (document.pointerLockElement !== el) el.requestPointerLock?.();
    };
    const onPointerDown = (e) => {
      if (e.pointerType === 'touch') {
        dragging = true; dragPointer = e.pointerId; lastX = e.clientX; lastY = e.clientY;
      }
    };
    const onPointerMove = (e) => {
      if (dragging && e.pointerId === dragPointer) {
        applyDelta(e.clientX - lastX, e.clientY - lastY, SENS_DRAG);
        lastX = e.clientX; lastY = e.clientY;
      }
    };
    const onPointerUp = (e) => { if (e.pointerId === dragPointer) { dragging = false; dragPointer = null; } };

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

  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const worldUp = new THREE.Vector3(0, 1, 0);

  useFrame((_, delta) => {
    if (look) look.current = { yaw: yaw.current, pitch: pitch.current };

    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.rotation.z = 0;

    const k = keys.current;
    const drone = modeRef.current === 'drone';
    let mf = (k.KeyW || k.ArrowUp ? 1 : 0) + (k.KeyS || k.ArrowDown ? -1 : 0);
    let mr = (k.KeyD || k.ArrowRight ? 1 : 0) + (k.KeyA || k.ArrowLeft ? -1 : 0);
    let mv = 0;
    if (drone) {
      mv = (k.Space || k.KeyE ? 1 : 0) + (k.ShiftLeft || k.ShiftRight || k.KeyQ || k.KeyC ? -1 : 0);
      if (vertical?.current) mv += vertical.current;
    }
    if (move?.current) { mf += move.current.y; mr += move.current.x; }
    if (mf === 0 && mr === 0 && mv === 0) return;

    // direção da câmera
    camera.getWorldDirection(fwd.current);
    right.current.copy(fwd.current).cross(worldUp).normalize();

    const dir = new THREE.Vector3();
    if (drone) {
      dir.addScaledVector(fwd.current, mf);
      dir.addScaledVector(right.current, mr);
      dir.addScaledVector(worldUp, mv);
    } else {
      // no modo Pessoa, ignora a inclinação (anda no plano)
      const f = fwd.current.clone(); f.y = 0; f.normalize();
      const rr = right.current.clone(); rr.y = 0; rr.normalize();
      dir.addScaledVector(f, mf);
      dir.addScaledVector(rr, mr);
    }
    if (dir.lengthSq() > 0) dir.normalize();

    const speed = drone ? FLY_SPEED : WALK_SPEED;
    camera.position.addScaledVector(dir, speed * Math.min(delta, 0.05));

    if (bounds) {
      if (drone) {
        // voa numa caixa ampla ao redor do estande
        const m = 8;
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, bounds.min.x - m, bounds.max.x + m);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, bounds.min.z - m, bounds.max.z + m);
        camera.position.y = THREE.MathUtils.clamp(camera.position.y, bounds.min.y + 0.3, bounds.min.y + 20);
      } else {
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, bounds.min.x + INSET, bounds.max.x - INSET);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, bounds.min.z + INSET, bounds.max.z - INSET);
        camera.position.y = bounds.min.y + EYE_HEIGHT;
      }
    }
  });

  return null;
}
