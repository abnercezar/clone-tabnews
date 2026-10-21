import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { at, glow, merge, mesh, rod, sideExtrude } from "./helpers.js";
import { buildDriver } from "./driver.js";
import { createBeam } from "./effects.js";

// Medidas em metros. Frente do trator em +z, eixo traseiro em z = -0.85.
const REAR = { radius: 0.95, width: 0.56, x: 1.03, z: -0.85, lugs: 23 };
const FRONT = { radius: 0.62, width: 0.4, x: 0.86, z: 1.45, lugs: 18 };
const GRILLE_Z = 2.13;
const HEADLIGHT_Y = 1.4;

function roundedBox(w, h, d, radius = 0.03) {
  const limit = Math.min(w, h, d) / 2 - 0.001;
  return new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, limit));
}

// Pneu agrícola: carcaça com ombro arredondado e garras em V intercaladas.
function tireGeometry(radius, width, lugCount) {
  const bead = radius * 0.64;
  const half = width / 2;
  const shoulder = Math.min(0.09, width * 0.18);
  const profile = [
    new THREE.Vector2(bead, -half + 0.03),
    new THREE.Vector2(radius * 0.8, -half - 0.012),
    new THREE.Vector2(radius - shoulder * 0.6, -half + 0.004),
    new THREE.Vector2(radius - 0.012, -half + shoulder * 0.7),
    new THREE.Vector2(radius, -half + shoulder),
    new THREE.Vector2(radius, half - shoulder),
    new THREE.Vector2(radius - 0.012, half - shoulder * 0.7),
    new THREE.Vector2(radius - shoulder * 0.6, half - 0.004),
    new THREE.Vector2(radius * 0.8, half + 0.012),
    new THREE.Vector2(bead, half - 0.03),
  ];
  const parts = [new THREE.LatheGeometry(profile, 48).rotateZ(Math.PI / 2)];

  const lugHeight = radius * 0.06;
  const lugThick = radius * 0.085;
  const lugLength = width * 0.52;
  for (let i = 0; i < lugCount; i++) {
    for (const side of [-1, 1]) {
      const angle = ((i + (side > 0 ? 0.5 : 0)) / lugCount) * Math.PI * 2;
      const lug = new THREE.BoxGeometry(lugLength, lugHeight, lugThick);
      lug.rotateY(side * 0.62);
      lug.translate(side * width * 0.22, radius + lugHeight * 0.35, 0);
      lug.rotateX(angle);
      parts.push(lug);
    }
  }
  return merge(parts);
}

function rimGeometry(radius, width, side) {
  const bead = radius * 0.64;
  const barrel = new THREE.CylinderGeometry(
    bead,
    bead,
    width * 0.86,
    40,
    1,
    true,
  ).rotateZ(Math.PI / 2);
  const flanges = [-1, 1].map((face) =>
    new THREE.TorusGeometry(bead, 0.022, 6, 40)
      .rotateY(Math.PI / 2)
      .translate(face * width * 0.43, 0, 0),
  );
  const dishProfile = [
    new THREE.Vector2(bead * 0.98, 0),
    new THREE.Vector2(bead * 0.8, -side * 0.05),
    new THREE.Vector2(bead * 0.42, -side * 0.09),
    new THREE.Vector2(bead * 0.34, -side * 0.09),
  ];
  // A rotação do torno inverte o eixo: o sinal negativo põe o disco para fora.
  const dish = new THREE.LatheGeometry(dishProfile, 40)
    .rotateZ(Math.PI / 2)
    .translate(side * width * 0.08, 0, 0);
  return merge([barrel, dish, ...flanges]);
}

function hubGeometry(radius, width, side) {
  const face = side * (width * 0.08 + 0.12);
  const parts = [
    new THREE.CylinderGeometry(radius * 0.2, radius * 0.24, 0.18, 24)
      .rotateZ(Math.PI / 2)
      .translate(face - side * 0.04, 0, 0),
    new THREE.CylinderGeometry(radius * 0.09, radius * 0.11, 0.08, 16)
      .rotateZ(Math.PI / 2)
      .translate(face + side * 0.07, 0, 0),
  ];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    parts.push(
      new THREE.CylinderGeometry(0.016, 0.016, 0.05, 6)
        .rotateZ(Math.PI / 2)
        .translate(
          face + side * 0.06,
          Math.sin(angle) * radius * 0.16,
          Math.cos(angle) * radius * 0.16,
        ),
    );
  }
  return merge(parts);
}

function buildWheel(m, spec, side) {
  const node = new THREE.Group();
  node.add(mesh(tireGeometry(spec.radius, spec.width, spec.lugs), m.rubber));
  node.add(mesh(rimGeometry(spec.radius, spec.width, side), m.yellow));
  node.add(mesh(hubGeometry(spec.radius, spec.width, side), m.steel));
  return node;
}

function fenderGeometry(inner, outer, from, to, width) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, from, to, false);
  shape.absarc(0, 0, inner, to, from, true);
  shape.closePath();
  return sideExtrude(shape, width, {
    curveSegments: 28,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
}

function hoodGeometry() {
  const profile = new THREE.Shape();
  profile.moveTo(-0.3, 0.98);
  profile.lineTo(1.98, 0.98);
  profile.lineTo(2.05, 1.08);
  profile.lineTo(2.08, 1.46);
  profile.quadraticCurveTo(2.08, 1.6, 1.9, 1.62);
  profile.lineTo(0.3, 1.68);
  profile.lineTo(-0.3, 1.7);
  profile.closePath();
  return sideExtrude(profile, 0.86, {
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 4,
  });
}

function weightStack() {
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const x = -0.48 + i * 0.12;
    const slab = roundedBox(0.105, 0.46, 0.34, 0.02);
    slab.translate(x, 0, 0);
    parts.push(slab);
  }
  parts.push(new THREE.BoxGeometry(1.1, 0.06, 0.06).translate(0, 0.2, 0.16));
  return merge(parts);
}

function cabFrame(cab) {
  const parts = [];
  const post = (x, z) =>
    parts.push(
      roundedBox(0.07, cab.high - cab.low, 0.07, 0.02).translate(
        x,
        (cab.high + cab.low) / 2,
        z,
      ),
    );
  for (const x of [-cab.x, cab.x]) {
    post(x, cab.front);
    post(x, cab.back);
    parts.push(
      rod([x, cab.low + 0.02, cab.front], [x, cab.low + 0.02, cab.back], 0.03),
    );
    parts.push(rod([x, 1.95, -0.6], [x, 1.95, cab.back], 0.018));
    parts.push(rod([x, cab.low, -0.6], [x, cab.high, -0.6], 0.02));
  }
  parts.push(
    rod(
      [-cab.x, cab.low + 0.02, cab.front],
      [cab.x, cab.low + 0.02, cab.front],
      0.03,
    ),
  );
  parts.push(
    rod(
      [-cab.x, cab.low + 0.02, cab.back],
      [cab.x, cab.low + 0.02, cab.back],
      0.03,
    ),
  );
  // Maçanetas e dobradiças da porta esquerda.
  parts.push(
    rod([-cab.x - 0.03, 1.7, -0.68], [-cab.x - 0.03, 1.7, -0.56], 0.012),
  );
  return merge(parts);
}

function interior() {
  const parts = [
    roundedBox(0.5, 0.11, 0.46, 0.04).translate(0, 1.56, -1.06),
    roundedBox(0.5, 0.58, 0.11, 0.04).rotateX(-0.18).translate(0, 1.88, -1.3),
    roundedBox(0.12, 0.2, 0.5, 0.03).translate(0.34, 1.62, -0.98),
    new THREE.CylinderGeometry(0.06, 0.08, 0.26, 10).translate(0, 1.42, -1.06),
    roundedBox(0.66, 0.2, 0.16, 0.04).translate(0, 1.66, -0.33),
    rod([0, 1.45, -0.36], [0, 1.9, -0.52], 0.03),
    new THREE.TorusGeometry(0.18, 0.018, 8, 28)
      .rotateX(-Math.PI / 2 + 0.55)
      .translate(0, 1.93, -0.53),
    rod([-0.17, 1.93, -0.53], [0.17, 1.93, -0.53], 0.012),
  ];
  return merge(parts);
}

function glassPanes(cab) {
  const height = cab.high - cab.low - 0.06;
  const middle = (cab.high + cab.low) / 2;
  const depth = cab.front - cab.back;
  const panes = [
    new THREE.PlaneGeometry(cab.x * 2 - 0.06, height).translate(
      0,
      middle,
      cab.front,
    ),
    new THREE.PlaneGeometry(cab.x * 2 - 0.06, height).translate(
      0,
      middle,
      cab.back,
    ),
  ];
  for (const x of [-cab.x, cab.x]) {
    panes.push(
      new THREE.PlaneGeometry(depth - 0.06, height)
        .rotateY(Math.PI / 2)
        .translate(x, middle, (cab.front + cab.back) / 2),
    );
  }
  return merge(panes);
}

function exhaustGeometry() {
  const parts = [
    new THREE.CylinderGeometry(0.095, 0.095, 0.62, 20).translate(0, 2.0, 0),
    new THREE.CylinderGeometry(0.055, 0.055, 0.62, 16).translate(0, 2.6, 0),
    new THREE.TorusGeometry(0.096, 0.012, 6, 20)
      .rotateX(Math.PI / 2)
      .translate(0, 2.3, 0),
    new THREE.TorusGeometry(0.096, 0.012, 6, 20)
      .rotateX(Math.PI / 2)
      .translate(0, 1.7, 0),
  ];
  const tip = new THREE.CylinderGeometry(0.055, 0.055, 0.14, 16, 1, true);
  tip.rotateX(-0.6);
  tip.translate(0, 2.95, 0.03);
  parts.push(tip);
  return merge(parts);
}

function hitchGeometry() {
  return merge([
    rod([-0.32, 0.6, -1.45], [-0.42, 0.48, -2.15], 0.04),
    rod([0.32, 0.6, -1.45], [0.42, 0.48, -2.15], 0.04),
    rod([0, 1.18, -1.5], [0, 1.08, -2.08], 0.035),
    rod([-0.42, 0.48, -2.15], [0.42, 0.48, -2.15], 0.025),
    new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10)
      .rotateX(Math.PI / 2)
      .translate(0, 0.72, -1.55),
    new THREE.BoxGeometry(0.28, 0.08, 0.5).translate(0, 0.46, -1.55),
  ]);
}

function stepsGeometry() {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    parts.push(
      new THREE.BoxGeometry(0.2, 0.025, 0.34).translate(
        -0.86,
        0.5 + i * 0.27,
        0.32,
      ),
    );
  }
  parts.push(rod([-0.96, 0.46, 0.15], [-0.96, 1.32, 0.15], 0.018));
  parts.push(rod([-0.96, 0.46, 0.49], [-0.96, 1.32, 0.49], 0.018));
  parts.push(rod([-0.78, 1.35, 0.12], [-0.78, 2.1, -0.18], 0.016));
  return merge(parts);
}

function chassis() {
  return merge([
    new THREE.BoxGeometry(0.62, 0.36, 2.8).translate(0, 0.78, 0.7),
    roundedBox(0.84, 0.66, 1.25, 0.08).translate(0, 0.95, -0.95),
    new THREE.CylinderGeometry(0.13, 0.15, REAR.x * 2 - 0.5, 18)
      .rotateZ(Math.PI / 2)
      .translate(0, REAR.radius, REAR.z),
    new THREE.BoxGeometry(FRONT.x * 2 - 0.45, 0.14, 0.2).translate(
      0,
      FRONT.radius,
      FRONT.z,
    ),
    new THREE.BoxGeometry(0.3, 0.12, 0.5).translate(0, 0.68, 2.2),
    roundedBox(1.44, 0.12, 1.32, 0.03).translate(0, 1.29, -0.88),
  ]);
}

export function buildTractor(m, glowMap) {
  const tractor = new THREE.Group();
  // Carroceria separada das rodas: ela balança na suspensão, as rodas não.
  const body = new THREE.Group();
  tractor.add(body);
  const add = (object, x = 0, y = 0, z = 0) => {
    at(object, x, y, z);
    body.add(object);
    return object;
  };

  add(mesh(chassis(), m.dark));
  add(mesh(hoodGeometry(), m.paint));

  add(
    mesh(roundedBox(0.72, 0.44, 0.05, 0.02), m.grille),
    0,
    1.24,
    GRILLE_Z - 0.03,
  );
  add(
    mesh(
      merge([
        rod([-0.37, 1.02, GRILLE_Z], [0.37, 1.02, GRILLE_Z], 0.014),
        rod([-0.37, 1.47, GRILLE_Z], [0.37, 1.47, GRILLE_Z], 0.014),
        rod([-0.37, 1.02, GRILLE_Z], [-0.37, 1.47, GRILLE_Z], 0.014),
        rod([0.37, 1.02, GRILLE_Z], [0.37, 1.47, GRILLE_Z], 0.014),
      ]),
      m.chrome,
    ),
  );

  for (const side of [-1, 1]) {
    const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), m.vent);
    vent.rotation.y = side * (Math.PI / 2);
    add(vent, side * 0.474, 1.2, 1.55);

    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.14), m.decal);
    decal.rotation.y = side * (Math.PI / 2);
    add(decal, side * 0.475, 1.44, 0.7);
  }

  const headlights = [];
  const beams = [];
  const lens = new THREE.CircleGeometry(0.058, 24);
  const bezel = new THREE.TorusGeometry(0.064, 0.012, 6, 24);
  for (const x of [-0.24, 0.24]) {
    add(new THREE.Mesh(lens, m.lamp), x, HEADLIGHT_Y, GRILLE_Z + 0.006);
    add(mesh(bezel, m.chrome), x, HEADLIGHT_Y, GRILLE_Z + 0.004);
    headlights.push(
      add(glow(glowMap, 0xfff0d2, 0.75, 0), x, HEADLIGHT_Y, GRILLE_Z + 0.08),
    );
    const beam = createBeam(6, 1.2, 0xffe9c2);
    beam.rotation.x = 0.13;
    beams.push(add(beam, x, HEADLIGHT_Y, GRILLE_Z + 0.02));
  }

  add(mesh(weightStack(), m.dark), 0, 0.86, 2.4);

  add(mesh(roundedBox(0.3, 0.42, 0.5, 0.06), m.dark), 0.56, 0.92, 0.42);
  add(
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), m.chrome),
    0.56,
    1.15,
    0.5,
  );
  add(mesh(stepsGeometry(), m.dark));

  for (const side of [-1, 1]) {
    add(
      mesh(
        fenderGeometry(
          REAR.radius + 0.08,
          REAR.radius + 0.14,
          0.1 * Math.PI,
          0.93 * Math.PI,
          0.7,
        ),
        m.paint,
      ),
      side * REAR.x,
      REAR.radius,
      REAR.z,
    );
    add(
      mesh(roundedBox(0.3, 0.05, 1.3, 0.02), m.dark),
      side * 0.82,
      1.3,
      -0.88,
    );
  }

  for (const side of [-1, 1]) {
    const angle = 0.86 * Math.PI;
    const y = REAR.radius + Math.sin(angle) * (REAR.radius + 0.15);
    const z = REAR.z + Math.cos(angle) * (REAR.radius + 0.15);
    add(
      mesh(roundedBox(0.16, 0.08, 0.05, 0.015), m.tail),
      side * (REAR.x + 0.18),
      y,
      z,
    );
  }

  const cab = { x: 0.72, back: -1.52, front: -0.24, low: 1.34, high: 2.55 };
  add(mesh(cabFrame(cab), m.black));
  add(mesh(interior(), m.seat));
  const driver = buildDriver(m);
  body.add(driver.group);
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.09),
    m.display,
  );
  display.rotation.x = -0.5;
  add(display, 0.22, 1.79, -0.4);

  add(mesh(roundedBox(1.72, 0.17, 1.76, 0.07), m.paint), 0, 2.64, -0.88);
  add(mesh(roundedBox(1.5, 0.05, 1.54, 0.02), m.black), 0, 2.53, -0.88);

  const glass = new THREE.Mesh(glassPanes(cab), m.glass);
  glass.renderOrder = 2;
  add(glass);

  const workLights = [];
  for (const x of [-0.6, -0.25, 0.25, 0.6]) {
    add(mesh(roundedBox(0.16, 0.1, 0.08, 0.02), m.black), x, 2.58, 0.0);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), m.lamp);
    add(front, x, 2.58, 0.042);
    workLights.push(add(glow(glowMap, 0xfff0d2, 0.55, 0), x, 2.58, 0.1));
  }
  for (const x of [-0.82, 0.82]) {
    add(mesh(roundedBox(0.08, 0.05, 0.05, 0.015), m.amber), x, 2.66, -0.02);
  }

  add(
    mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 16), m.black),
    -0.55,
    2.75,
    -1.45,
  );
  add(
    mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.13, 16), m.amber),
    -0.55,
    2.84,
    -1.45,
  );
  const beacon = add(glow(glowMap, 0xffa31a, 1.4, 0), -0.55, 2.86, -1.45);
  const beaconLight = add(
    new THREE.PointLight(0xffa31a, 0, 8, 2),
    -0.55,
    3.0,
    -1.45,
  );

  for (const side of [-1, 1]) {
    add(
      mesh(
        merge([
          rod([side * 0.74, 2.38, -0.28], [side * 1.12, 2.3, -0.12], 0.014),
          rod([side * 0.74, 2.0, -0.28], [side * 1.12, 2.08, -0.12], 0.014),
        ]),
        m.black,
      ),
    );
    add(
      mesh(roundedBox(0.05, 0.3, 0.18, 0.02), m.black),
      side * 1.15,
      2.18,
      -0.12,
    );
    const glassFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.26),
      m.chrome,
    );
    add(glassFace, side * 1.15, 2.18, -0.215).rotation.y = Math.PI;
  }

  add(mesh(exhaustGeometry(), m.chrome), 0.27, 0, 0.22);
  add(
    mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.24, 18), m.black),
    -0.27,
    1.8,
    0.62,
  );
  add(
    mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 18), m.black),
    -0.27,
    1.94,
    0.62,
  );
  add(mesh(hitchGeometry(), m.dark));

  const spots = [];
  for (const x of [-0.24, 0.24]) {
    const spot = new THREE.SpotLight(0xffe7c0, 0, 26, 0.5, 0.65, 1.6);
    spot.position.set(x, HEADLIGHT_Y, GRILLE_Z + 0.05);
    spot.target.position.set(x * 2.2, 0, 11);
    body.add(spot, spot.target);
    spots.push(spot);
  }
  const roofSpot = new THREE.SpotLight(0xfff3dc, 0, 18, 0.6, 0.85, 1.6);
  roofSpot.position.set(0, 2.62, 0.12);
  roofSpot.target.position.set(0, 0, 10);
  body.add(roofSpot, roofSpot.target);
  spots.push(roofSpot);
  // Luz dos faróis rebatida no chão: é ela que mostra pneus e para-choque.
  const bounce = new THREE.PointLight(0xffd9a8, 0, 7, 2);
  bounce.position.set(0, 0.35, GRILLE_Z + 2.4);
  body.add(bounce);
  spots.push(bounce);

  const wheels = [];
  const steering = [];
  for (const side of [-1, 1]) {
    const rear = buildWheel(m, REAR, side);
    at(rear, side * REAR.x, REAR.radius, REAR.z);
    tractor.add(rear);
    wheels.push({ node: rear, radius: REAR.radius });

    // A roda dianteira gira dentro do pivô de direção, junto do para-lama.
    const pivot = at(new THREE.Group(), side * FRONT.x, FRONT.radius, FRONT.z);
    const front = buildWheel(m, FRONT, side);
    pivot.add(front);
    pivot.add(
      mesh(
        fenderGeometry(
          FRONT.radius + 0.06,
          FRONT.radius + 0.1,
          0.18 * Math.PI,
          0.82 * Math.PI,
          0.44,
        ),
        m.paint,
      ),
    );
    pivot.add(
      mesh(
        rod(
          [-side * 0.05, 0.2, 0],
          [-side * 0.05, FRONT.radius + 0.08, -0.1],
          0.025,
        ),
        m.dark,
      ),
    );
    tractor.add(pivot);
    steering.push(pivot);
    wheels.push({ node: front, radius: FRONT.radius });
  }

  return {
    group: tractor,
    body,
    wheels,
    steering,
    driver,
    headlights,
    workLights,
    beams,
    spots,
    beacon,
    beaconLight,
  };
}
