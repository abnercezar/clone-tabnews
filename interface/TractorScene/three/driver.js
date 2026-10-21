import * as THREE from "three";
import { merge, mesh } from "./helpers.js";

// Motorista sentado na cabine, nas coordenadas do trator (frente em +z).
// Banco em z = -1.06 e volante em (0, 1.93, -0.53).

const UP = new THREE.Vector3(0, 1, 0);

// Membro arredondado ligando dois pontos: braço, antebraço, coxa, canela.
function limb(a, b, radius) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const geometry = new THREE.CapsuleGeometry(radius, direction.length(), 4, 12);
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()),
  );
  const middle = start.add(end).multiplyScalar(0.5);
  return geometry.translate(middle.x, middle.y, middle.z);
}

function ball(rx, ry, rz, x, y, z, detail = 16) {
  return new THREE.SphereGeometry(1, detail, Math.round(detail * 0.75))
    .scale(rx, ry, rz)
    .translate(x, y, z);
}

const SHOULDER = { x: 0.19, y: 2.03, z: -1.04 };
const NECK = new THREE.Vector3(0, 2.1, -1.04);

// Braço em coordenadas do ombro, para poder girar inteiro no aceno.
function arm(side) {
  const elbow = [side * 0.06, -0.18, 0.22];
  const hand = [side * -0.04, -0.04, 0.47];
  return {
    sleeve: merge([
      limb([0, 0, 0], elbow, 0.052),
      limb(elbow, [side * 0.01, -0.1, 0.36], 0.046),
    ]),
    skin: merge([
      limb([side * 0.01, -0.1, 0.36], hand, 0.036),
      ball(0.04, 0.045, 0.05, hand[0], hand[1], hand[2] + 0.02, 12),
    ]),
  };
}

function hatGeometry() {
  const brim = new THREE.LatheGeometry(
    [
      [0.1, 0.012],
      [0.17, 0.004],
      [0.23, 0.018],
      [0.235, 0.008],
      [0.17, -0.006],
      [0.1, 0.002],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    32,
  );
  const crown = new THREE.LatheGeometry(
    [
      [0.0, 0.1],
      [0.07, 0.1],
      [0.095, 0.085],
      [0.105, 0.04],
      [0.11, 0.0],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    28,
  );
  return merge([brim, crown]).translate(0, 0.08, 0);
}

export function buildDriver(m) {
  const group = new THREE.Group();

  group.add(
    mesh(
      merge([
        new THREE.CapsuleGeometry(0.15, 0.26, 6, 16)
          .scale(1.25, 1, 0.78)
          .rotateX(0.1)
          .translate(0, 1.88, -1.07),
        ball(0.12, 0.05, 0.1, 0, 2.03, -1.05),
      ]),
      m.shirt,
    ),
  );

  group.add(
    mesh(
      merge([
        ball(0.17, 0.1, 0.15, 0, 1.68, -1.07),
        limb([-0.09, 1.67, -1.02], [-0.11, 1.72, -0.64], 0.072),
        limb([0.09, 1.67, -1.02], [0.11, 1.72, -0.64], 0.072),
        limb([-0.11, 1.72, -0.64], [-0.11, 1.42, -0.52], 0.055),
        limb([0.11, 1.72, -0.64], [0.11, 1.42, -0.52], 0.055),
      ]),
      m.jeans,
    ),
  );
  group.add(
    mesh(
      merge([
        ball(0.055, 0.05, 0.11, -0.11, 1.38, -0.47, 12),
        ball(0.055, 0.05, 0.11, 0.11, 1.38, -0.47, 12),
      ]),
      m.boots,
    ),
  );

  // Cabeça e chapéu giram juntos sobre o pescoço.
  const head = new THREE.Group();
  head.position.copy(NECK);
  head.add(
    mesh(
      merge([
        new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12).translate(0, 0.02, 0),
        ball(0.09, 0.108, 0.1, 0, 0.15, 0.01, 20),
        ball(0.018, 0.026, 0.02, 0, 0.14, 0.11, 10),
        ball(0.016, 0.03, 0.022, -0.09, 0.15, 0, 10),
        ball(0.016, 0.03, 0.022, 0.09, 0.15, 0, 10),
      ]),
      m.skin,
    ),
  );
  head.add(
    mesh(
      merge([
        ball(0.012, 0.01, 0.006, -0.033, 0.17, 0.098, 8),
        ball(0.012, 0.01, 0.006, 0.033, 0.17, 0.098, 8),
        // Bigode de quem acorda cedo.
        ball(0.04, 0.011, 0.012, 0, 0.11, 0.1, 10),
      ]),
      m.hair,
      { cast: false },
    ),
  );
  const hat = mesh(hatGeometry(), m.straw);
  hat.position.set(0, 0.12, 0);
  hat.rotation.x = -0.08;
  head.add(hat);
  const band = mesh(
    new THREE.CylinderGeometry(0.108, 0.111, 0.022, 28, 1, true).translate(
      0,
      0.215,
      0,
    ),
    m.boots,
    { cast: false },
  );
  band.rotation.x = -0.08;
  head.add(band);
  group.add(head);

  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * SHOULDER.x, SHOULDER.y, SHOULDER.z);
    const parts = arm(side);
    pivot.add(mesh(parts.sleeve, m.shirt));
    pivot.add(mesh(parts.skin, m.skin));
    group.add(pivot);
    return pivot;
  });

  return { group, head, wavingArm: arms[0] };
}

// Mãos no volante; na largada, acena com a mão esquerda e volta a dirigir.
export function animateDriver(driver, t, goAt, motion) {
  const since = t - goAt - 0.5;
  const wave =
    since > 0
      ? THREE.MathUtils.smoothstep(since, 0, 0.35) *
        (1 - THREE.MathUtils.smoothstep(since, 2.1, 2.6))
      : 0;
  driver.wavingArm.rotation.x = -1.25 * wave;
  driver.wavingArm.rotation.z = wave * (0.35 + Math.sin(since * 9) * 0.28);
  driver.head.rotation.y =
    Math.sin(t * 0.45) * 0.25 * (1 - wave) + wave * -0.15;
  driver.head.rotation.x = Math.sin(t * 7.5) * 0.015 * motion;
}
