import * as THREE from "three";
import { at, hash, merge, mesh } from "./helpers.js";
import { EYE, LYING_DROP, NECK_PIVOT, POLL } from "./cattleShape.js";

function tailGeometry() {
  const tail = new THREE.LatheGeometry(
    [
      [0.0, -0.66],
      [0.014, -0.64],
      [0.016, -0.3],
      [0.026, -0.05],
      [0.036, 0],
      [0.0, 0.02],
    ].map(([radius, y]) => new THREE.Vector2(radius, y)),
    10,
  );
  const colors = new Array(tail.attributes.position.count * 3).fill(0.9);
  tail.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return tail;
}

function fromBaked({ position, normal, color }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

// Monta as malhas a partir do resultado de `bakeCattle`; todos os bois da
// cena compartilham as mesmas geometrias.
export function createCattleGeometry(baked) {
  return {
    body: fromBaked(baked.body),
    lying: fromBaked(baked.lying),
    neck: fromBaked(baked.neck),
    head: fromBaked(baked.head),
    egret: egretGeometry(),
    eye: new THREE.SphereGeometry(0.021, 14, 10),
    tail: tailGeometry(),
    tuft: new THREE.ConeGeometry(0.04, 0.2, 10),
    contact: new THREE.PlaneGeometry(1.0, 2.1),
  };
}

function animal(m, g, coat, lying) {
  const group = new THREE.Group();
  const drop = lying ? LYING_DROP : 0;
  group.add(mesh(lying ? g.lying : g.body, coat));

  // Sombra de contato: o animal pesa no capim.
  const contact = new THREE.Mesh(g.contact, m.contact);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, 0.012, -0.05);
  contact.scale.set(lying ? 1.25 : 1, lying ? 1.1 : 1, 1);
  contact.renderOrder = 1;
  group.add(contact);

  const neck = at(
    new THREE.Group(),
    NECK_PIVOT.x,
    NECK_PIVOT.y - drop,
    NECK_PIVOT.z,
  );
  neck.add(mesh(g.neck, coat));
  const head = at(new THREE.Group(), POLL.x, POLL.y, POLL.z);
  head.add(mesh(g.head, coat));
  for (const side of [-1, 1]) {
    head.add(
      at(mesh(g.eye, m.eye, { cast: false }), side * EYE.x, EYE.y, EYE.z),
    );
  }
  neck.add(head);
  group.add(neck);

  const tail = at(new THREE.Group(), 0, 1.22 - drop, -0.9);
  tail.add(mesh(g.tail, coat));
  tail.add(at(mesh(g.tuft, m.hoof), 0, -0.7, 0));
  group.add(tail);

  return { group, neck, head, tail, lying };
}

// Garça-vaqueira: acompanha o gado catando insetos no pasto.
function limb(a, b, radius) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const geometry = new THREE.CapsuleGeometry(radius, direction.length(), 4, 8);
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    ),
  );
  const middle = start.add(end).multiplyScalar(0.5);
  return geometry.translate(middle.x, middle.y, middle.z);
}

function egretGeometry() {
  const parts = [
    new THREE.SphereGeometry(1, 16, 12)
      .scale(0.055, 0.062, 0.13)
      .rotateX(-0.3)
      .translate(0, 0.34, 0),
    new THREE.SphereGeometry(1, 10, 8)
      .scale(0.04, 0.035, 0.07)
      .rotateX(0.5)
      .translate(0, 0.31, -0.13),
    limb([0, 0.37, 0.08], [0, 0.44, 0.11], 0.022),
    limb([0, 0.44, 0.11], [0, 0.48, 0.15], 0.018),
    new THREE.SphereGeometry(0.03, 12, 10).translate(0, 0.49, 0.16),
    new THREE.ConeGeometry(0.011, 0.07, 8)
      .rotateX(Math.PI / 2 + 0.15)
      .translate(0, 0.484, 0.215),
  ];
  for (const x of [-0.022, 0.022]) {
    parts.push(limb([x, 0.3, 0.01], [x * 1.3, 0.01, 0.03], 0.0055));
  }
  const geometry = merge(parts.map((part) => part.toNonIndexed()));
  // Bico amarelo e pernas escuras pintados nas cores do próprio vértice.
  const position = geometry.attributes.position;
  const colors = [];
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const z = position.getZ(i);
    if (y < 0.28) {
      colors.push(0.12, 0.11, 0.08);
    } else if (z > 0.185) {
      colors.push(0.95, 0.72, 0.18);
    } else {
      colors.push(1, 1, 1);
    }
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

// Rebanho pastando: a maioria Nelore branco, alguns mais escuros.
export function buildHerd(m, g, count, seed, width, depth) {
  const group = new THREE.Group();
  const coats = [m.coatWhite, m.coatWhite, m.coatGray, m.coatWhite, m.coatRed];
  const animals = [];
  const columns = Math.max(1, Math.round(Math.sqrt((count * width) / depth)));
  const rows = Math.ceil(count / columns);
  for (let i = 0; i < count; i++) {
    const coat = coats[Math.floor(hash(seed + i * 3) * coats.length)];
    // Uns três em cada dez deitam para ruminar, como num pasto de verdade.
    const lying = hash(seed + i * 37) > 0.68;
    const cow = animal(m, g, coat, lying);
    // Grade com sorteio dentro de cada célula: ninguém fica em cima do outro.
    const column = i % columns;
    const row = Math.floor(i / columns);
    cow.group.position.set(
      ((column + 0.25 + hash(seed + i * 7) * 0.5) / columns - 0.5) * width,
      0,
      ((row + 0.25 + hash(seed + i * 11) * 0.5) / rows - 0.5) * depth,
    );
    cow.group.rotation.y = hash(seed + i * 13) * Math.PI * 2;
    // Cada animal com seu porte: uns mais compridos, outros mais largos.
    const size = 0.92 + hash(seed + i * 17) * 0.16;
    cow.group.scale.set(
      size * (0.95 + hash(seed + i * 29) * 0.12),
      size,
      size * (0.97 + hash(seed + i * 31) * 0.06),
    );
    cow.phase = hash(seed + i * 19) * 20;
    cow.grazer = !lying && hash(seed + i * 23) > 0.3;
    group.add(cow.group);
    animals.push(cow);
  }

  const egrets = [];
  for (let i = 0; i < Math.ceil(count / 2); i++) {
    const host = animals[i % animals.length].group.position;
    const bird = mesh(g.egret, m.egret, { receive: false });
    const angle = hash(seed + i * 41) * Math.PI * 2;
    bird.position.set(
      host.x + Math.cos(angle) * (1 + hash(seed + i * 43) * 0.6),
      0,
      host.z + Math.sin(angle) * (1 + hash(seed + i * 43) * 0.6),
    );
    bird.rotation.y = hash(seed + i * 47) * Math.PI * 2;
    bird.userData.phase = hash(seed + i * 53) * 10;
    group.add(bird);
    egrets.push(bird);
  }
  return { group, animals, egrets };
}

// Pastando, o pescoço desce e a cabeça fica de pé até o focinho tocar o
// capim; de vez em quando o boi levanta a cabeça e olha em volta.
export function animateHerd(animals, t, egrets = []) {
  // Garças bicam o chão e dão passinhos.
  egrets.forEach((bird) => {
    const time = t + bird.userData.phase;
    const peck = Math.max(0, Math.sin(time * 3.1)) ** 6;
    bird.rotation.x = peck * 0.3;
    bird.rotation.y += Math.sin(time * 0.7) * 0.003;
  });
  animals.forEach((cow) => {
    const time = t + cow.phase;
    const cycle = (time % 9) / 9;
    const up = cow.grazer
      ? THREE.MathUtils.smoothstep(cycle, 0.72, 0.8) *
        (1 - THREE.MathUtils.smoothstep(cycle, 0.92, 1))
      : 1;
    const chew = cow.lying
      ? Math.sin(time * 4.2) * 0.015
      : Math.sin(time * 2.3) * 0.02 * (1 - up);
    cow.neck.rotation.x = THREE.MathUtils.lerp(0.95, 0.22, up) + chew;
    cow.head.rotation.x = THREE.MathUtils.lerp(-0.35, -0.12, up);
    cow.neck.rotation.y = Math.sin(time * 0.4) * 0.18 * up;
    cow.tail.rotation.z = Math.sin(time * 2.6) * 0.3;
    cow.tail.rotation.x = -0.14 + Math.sin(time * 1.3) * 0.04;
  });
}
