import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";

// Boi Nelore modelado como campo de distância: músculos e ossos são formas
// simples unidas suavemente, e o MarchingCubes do three transforma o campo
// numa malha contínua, sem emendas. Medidas em metros, frente para +z.
//
// Este módulo não toca no DOM: roda dentro de um Web Worker para a geração
// das malhas não travar a página.

const _q = new THREE.Vector3();

function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// Remove volume com transição suave: vazio do flanco, narinas, concha da orelha.
function carve(d, shape, k) {
  return -smin(-d, shape, k);
}

function ellipsoid(p, cx, cy, cz, rx, ry, rz) {
  const x = (p.x - cx) / rx;
  const y = (p.y - cy) / ry;
  const z = (p.z - cz) / rz;
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt(
    (x * x) / (rx * rx) + (y * y) / (ry * ry) + (z * z) / (rz * rz),
  );
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}

function sphere(p, cx, cy, cz, r) {
  return Math.hypot(p.x - cx, p.y - cy, p.z - cz) - r;
}

// Cone de pontas arredondadas entre a e b (fórmula de Inigo Quilez).
function roundCone(p, a, b, r1, r2) {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = p.x - a[0];
  const pay = p.y - a[1];
  const paz = p.z - a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const qx = pax * l2 - bax * y;
  const qy = pay * l2 - bay * y;
  const qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) {
    return Math.sqrt(x2 + z2) * il2 - r2;
  }
  if (Math.sign(y) * a2 * y2 < k) {
    return Math.sqrt(x2 + y2) * il2 - r1;
  }
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

// Antebraço, joelho, canela, boleto, quartela e casco.
function frontLeg(p, x) {
  let d = roundCone(p, [x, 0.98, 0.42], [x, 0.5, 0.47], 0.11, 0.062);
  d = smin(d, sphere(p, x, 0.47, 0.47, 0.058), 0.04);
  d = smin(
    d,
    roundCone(p, [x, 0.46, 0.47], [x, 0.15, 0.46], 0.046, 0.04),
    0.04,
  );
  d = smin(d, sphere(p, x, 0.14, 0.46, 0.047), 0.03);
  d = smin(
    d,
    roundCone(p, [x, 0.13, 0.46], [x, 0.045, 0.49], 0.042, 0.044),
    0.03,
  );
  return smin(
    d,
    roundCone(p, [x, 0.05, 0.49], [x, 0.02, 0.51], 0.046, 0.05),
    0.02,
  );
}

// Coxa, gaskin, jarrete angulado, canela e casco.
function hindLeg(p, x) {
  let d = ellipsoid(p, x * 1.08, 0.95, -0.55, 0.14, 0.27, 0.22);
  d = smin(
    d,
    roundCone(p, [x, 0.8, -0.5], [x, 0.47, -0.67], 0.105, 0.056),
    0.06,
  );
  d = smin(d, sphere(p, x, 0.46, -0.67, 0.052), 0.04);
  d = smin(
    d,
    roundCone(p, [x, 0.45, -0.67], [x, 0.15, -0.6], 0.045, 0.04),
    0.04,
  );
  d = smin(d, sphere(p, x, 0.14, -0.6, 0.046), 0.03);
  d = smin(
    d,
    roundCone(p, [x, 0.13, -0.6], [x, 0.045, -0.57], 0.041, 0.044),
    0.03,
  );
  return smin(
    d,
    roundCone(p, [x, 0.05, -0.57], [x, 0.02, -0.55], 0.046, 0.05),
    0.02,
  );
}

// Tronco sem as pernas; `q` já vem espelhado em x.
function trunkField(q) {
  // Tronco comprido de lados planos; o lombo reto vem de um cilindro
  // arredondado da garupa até a cernelha.
  let d = ellipsoid(q, 0, 0.98, -0.05, 0.28, 0.31, 0.84);
  d = smin(d, ellipsoid(q, 0, 0.9, -0.08, 0.29, 0.27, 0.58), 0.12);
  d = smin(
    d,
    roundCone(q, [0, 1.07, -0.72], [0, 1.08, 0.36], 0.17, 0.19),
    0.14,
  );
  d = smin(d, ellipsoid(q, 0, 1.0, 0.46, 0.23, 0.26, 0.3), 0.12);
  d = smin(d, ellipsoid(q, 0, 1.08, -0.62, 0.25, 0.2, 0.3), 0.1);
  // Ancas e ísquios só marcam a garupa, sem virar calombo.
  d = smin(d, sphere(q, 0.17, 1.18, -0.52, 0.06), 0.1);
  d = smin(d, sphere(q, 0.09, 1.14, -0.86, 0.055), 0.08);
  // Cupim do zebu, inclinado para trás, e base do pescoço.
  d = smin(d, roundCone(q, [0, 1.18, 0.47], [0, 1.31, 0.38], 0.12, 0.09), 0.14);
  d = smin(d, ellipsoid(q, 0.1, 1.06, 0.42, 0.1, 0.18, 0.15), 0.1);
  // Peito largo de onde o pescoço sai, com a barbela colada por baixo.
  d = smin(d, roundCone(q, [0, 0.95, 0.45], [0, 1.0, 0.72], 0.22, 0.17), 0.1);
  d = smin(d, sphere(q, 0.19, 0.78, 0.4, 0.045), 0.06);
  d = carve(d, ellipsoid(q, 0.36, 1.06, -0.33, 0.07, 0.1, 0.13), 0.09);
  return carve(d, ellipsoid(q, 0.34, 0.95, 0.12, 0.05, 0.16, 0.3), 0.12);
}

function bodyField(p) {
  // Simetria: só o lado positivo de x é modelado.
  const q = _q.set(Math.abs(p.x), p.y, p.z);
  let d = trunkField(q);
  d = smin(d, frontLeg(q, 0.15), 0.07);
  return smin(d, hindLeg(q, 0.16), 0.08);
}

// Deitado ruminando: o tronco desce até o chão e as pernas dobram por baixo,
// joelhos da frente para a frente e canelas de trás deitadas no capim.
export const LYING_DROP = 0.5;
const LYING_HOOVES = [
  [0.17, 0.05, 0.31, 1],
  [-0.17, 0.05, 0.31, 1],
  [0.37, 0.05, -0.3, 1],
];

function lyingField(p) {
  const x = Math.abs(p.x);
  const q = _q.set(x, p.y + LYING_DROP, p.z);
  let d = trunkField(q);
  q.set(x, p.y, p.z);
  d = smin(
    d,
    roundCone(q, [0.19, 0.28, 0.4], [0.19, 0.08, 0.63], 0.085, 0.058),
    0.07,
  );
  d = smin(
    d,
    roundCone(q, [0.19, 0.07, 0.63], [0.17, 0.05, 0.33], 0.048, 0.042),
    0.04,
  );
  d = smin(d, ellipsoid(q, 0.3, 0.34, -0.55, 0.13, 0.2, 0.27), 0.1);
  if (p.x > 0) {
    // Perna de fora: jarrete atrás e canela deitada ao lado da barriga.
    d = smin(
      d,
      roundCone(q, [0.32, 0.2, -0.66], [0.35, 0.08, -0.76], 0.09, 0.055),
      0.05,
    );
    d = smin(
      d,
      roundCone(q, [0.35, 0.07, -0.76], [0.37, 0.05, -0.32], 0.046, 0.042),
      0.04,
    );
  } else {
    // Perna de dentro: dobrada por baixo, só o jarrete aparece.
    d = smin(
      d,
      roundCone(q, [0.3, 0.18, -0.66], [0.22, 0.07, -0.8], 0.085, 0.055),
      0.05,
    );
  }
  // Barriga apoiada: o capim achata a parte de baixo.
  return Math.max(d, 0.01 - p.y);
}

// Pescoço nas coordenadas do pivô, que fica escondido dentro do peito.
export const NECK_PIVOT = new THREE.Vector3(0, 1.0, 0.45);
export const POLL = new THREE.Vector3(0, 0.22, 0.56);
const _neck = new THREE.Vector3();

function neckField(p) {
  const q = _q.set(Math.abs(p.x), p.y, p.z);
  // Pescoço curto e achatado dos lados, com a barbela por baixo.
  // Achatado dos lados e alto: na base ocupa toda a frente do peito.
  const flat = _neck.set(q.x * 1.25, q.y * 0.72, q.z);
  return roundCone(flat, [0, -0.02, 0.0], [0, 0.13, 0.5], 0.2, 0.125) * 0.72;
}

// Cabeça nas coordenadas da nuca: testa larga, face longa e estreita.
const MUZZLE = new THREE.Vector3(0, -0.38, 0.25);
export const EYE = new THREE.Vector3(0.09, -0.06, 0.1);
const EAR_SIN = Math.sin(0.55);
const EAR_COS = Math.cos(0.55);
const _ear = new THREE.Vector3();

function headField(p) {
  const q = _q.set(Math.abs(p.x), p.y, p.z);
  let d = sphere(q, 0, 0, 0.03, 0.105);
  d = smin(
    d,
    roundCone(q, [0, -0.03, 0.05], [0, -0.33, 0.22], 0.1, 0.07),
    0.06,
  );
  d = smin(d, ellipsoid(q, 0.055, -0.1, 0.02, 0.06, 0.08, 0.07), 0.05);
  d = smin(d, ellipsoid(q, 0, MUZZLE.y, MUZZLE.z, 0.082, 0.072, 0.078), 0.05);
  d = smin(d, ellipsoid(q, 0, -0.33, 0.15, 0.06, 0.05, 0.08), 0.04);
  // Arcada dos olhos, mandíbula e narinas.
  d = smin(d, sphere(q, 0.082, 0.0, 0.075, 0.034), 0.03);
  d = smin(d, ellipsoid(q, 0.048, -0.17, 0.04, 0.042, 0.05, 0.09), 0.04);
  d = carve(
    d,
    sphere(q, 0.036, MUZZLE.y - 0.01, MUZZLE.z + 0.075, 0.017),
    0.012,
  );
  // Orelha em concha, inclinada para baixo a partir da base atrás do olho.
  const dx = q.x - 0.1;
  const dy = q.y + 0.01;
  const ear = _ear.set(
    dx * EAR_COS - dy * EAR_SIN,
    dx * EAR_SIN + dy * EAR_COS,
    q.z + 0.01,
  );
  const lobe = carve(
    ellipsoid(ear, 0.08, 0, 0, 0.095, 0.022, 0.042),
    ellipsoid(ear, 0.09, 0.012, 0.006, 0.075, 0.012, 0.028),
    0.01,
  );
  d = smin(d, lobe, 0.03);
  // Chifres curtos e finos, apontando para cima e para fora.
  return smin(
    d,
    roundCone(q, [0.065, 0.075, -0.01], [0.1, 0.155, -0.035], 0.021, 0.008),
    0.015,
  );
}

// Amostra o campo numa grade cúbica e devolve a malha com normais e cores.
// Oclusão ambiente pelo próprio campo: dobras, barriga e entre as pernas
// recebem menos luz do céu. O chão entra na conta quando `ground` é true.
function occlusion(field, x, y, z, nx, ny, nz, ground) {
  const point = new THREE.Vector3();
  let sum = 0;
  let weight = 1;
  for (const h of [0.025, 0.06, 0.11, 0.18, 0.28]) {
    let d = field(point.set(x + nx * h, y + ny * h, z + nz * h));
    if (ground) {
      d = Math.min(d, y + ny * h);
    }
    sum += Math.max(h - d, 0) * weight;
    weight *= 0.7;
  }
  return THREE.MathUtils.clamp(1 - sum * 2.6, 0, 1);
}

function bake(field, center, size, resolution, shade, ground = false) {
  const cubes = new MarchingCubes(resolution, undefined, false, false, 90000);
  cubes.isolation = 0;
  const half = cubes.halfsize;
  const scale = size / 2;
  const point = new THREE.Vector3();
  const sample = (x, y, z) =>
    field(
      point.set(
        center.x + ((x - half) / half) * scale,
        center.y + ((y - half) / half) * scale,
        center.z + ((z - half) / half) * scale,
      ),
    );

  // Passo grosso primeiro: longe da superfície basta o sinal, então só os
  // pontos perto da pele são calculados na resolução final.
  const step = 4;
  const coarseSize = Math.ceil(resolution / step) + 1;
  const coarse = new Float32Array(coarseSize ** 3);
  for (let z = 0; z < coarseSize; z++) {
    for (let y = 0; y < coarseSize; y++) {
      for (let x = 0; x < coarseSize; x++) {
        coarse[x + y * coarseSize + z * coarseSize * coarseSize] = sample(
          x * step,
          y * step,
          z * step,
        );
      }
    }
  }
  const margin = (size / resolution) * step * 2.5;
  for (let z = 0; z < resolution; z++) {
    const cz = Math.round(z / step);
    for (let y = 0; y < resolution; y++) {
      const cy = Math.round(y / step);
      for (let x = 0; x < resolution; x++) {
        const cx = Math.round(x / step);
        const near =
          coarse[cx + cy * coarseSize + cz * coarseSize * coarseSize];
        cubes.field[x + y * resolution + z * resolution * resolution] =
          Math.abs(near) > margin ? -near : -sample(x, y, z);
      }
    }
  }
  cubes.update();

  const count = cubes.count;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const e = 0.004;
  for (let i = 0; i < count; i++) {
    const x = center.x + cubes.positionArray[i * 3] * scale;
    const y = center.y + cubes.positionArray[i * 3 + 1] * scale;
    const z = center.z + cubes.positionArray[i * 3 + 2] * scale;
    const slot = i;
    positions.set([x, y, z], slot * 3);
    // Normal pelo gradiente do próprio campo: sombreado liso e fiel à forma.
    const nx = field(point.set(x + e, y, z)) - field(point.set(x - e, y, z));
    const ny = field(point.set(x, y + e, z)) - field(point.set(x, y - e, z));
    const nz = field(point.set(x, y, z + e)) - field(point.set(x, y, z - e));
    const length = Math.hypot(nx, ny, nz) || 1;
    const n = [nx / length, ny / length, nz / length];
    normals.set(n, slot * 3);
    const light =
      0.32 + 0.68 * occlusion(field, x, y, z, n[0], n[1], n[2], ground);
    colors.set(
      shade(point.set(x, y, z)).map((value) => value * light),
      slot * 3,
    );
  }
  cubes.geometry.dispose();

  return { position: positions, normal: normals, color: colors };
}

const DARK = [0.07, 0.065, 0.06];

function tone(s) {
  return [s, s * 0.99, s * 0.97];
}

const MUD = [0.52, 0.42, 0.3];

// Nelore: cupim, cernelha e pescoço mais escuros, garupa levemente
// acinzentada; canelas sujas da terra do pasto.
function coatShade(x, y, z) {
  const front = THREE.MathUtils.smoothstep(z, 0.05, 0.55);
  const high = THREE.MathUtils.smoothstep(y, 0.9, 1.3);
  const rump = THREE.MathUtils.smoothstep(-z, 0.45, 0.85);
  // Paleta e antebraço também puxam para o cinza.
  const shoulder =
    THREE.MathUtils.smoothstep(z, 0.2, 0.55) *
    (1 - THREE.MathUtils.smoothstep(y, 0.5, 1.0));
  return tone(1 - 0.52 * front * high - 0.14 * rump * high - 0.16 * shoulder);
}

function lyingShade(p) {
  for (const [hx, hy, hz] of LYING_HOOVES) {
    if (Math.hypot(p.x - hx, p.y - hy, p.z - hz) < 0.05) {
      return DARK;
    }
  }
  return coatShade(p.x, p.y + LYING_DROP, p.z);
}

function bodyShade(p) {
  if (p.y < 0.075) {
    return DARK;
  }
  const shin = 1 - 0.2 * (1 - THREE.MathUtils.smoothstep(p.y, 0.2, 0.5));
  const coat = coatShade(p.x, p.y, p.z).map((value) => value * shin);
  const mud = 1 - THREE.MathUtils.smoothstep(p.y, 0.1, 0.3);
  return coat.map((value, i) =>
    THREE.MathUtils.lerp(value, MUD[i] * shin, mud),
  );
}

// Pescoço acinzentado por cima, clareando para a barbela.
function neckShade(p) {
  return tone(
    0.48 +
      0.32 * THREE.MathUtils.smoothstep(-p.y, -0.08, 0.14) +
      0.08 * (p.z / 0.6),
  );
}

const HORN_BASE = new THREE.Vector3(0.065, 0.075, -0.01);
const HORN_TIP = new THREE.Vector3(0.1, 0.155, -0.035);
const _horn = new THREE.Line3(HORN_BASE, HORN_TIP);
const _closest = new THREE.Vector3();
const _point = new THREE.Vector3();

function hornDistance(p) {
  _point.set(Math.abs(p.x), p.y, p.z);
  return _horn.closestPointToPoint(_point, true, _closest).distanceTo(_point);
}

function headShade(p) {
  // Focinho preto com borda suave, sem degrau na cor.
  const muzzle = Math.hypot(p.x, p.y - MUZZLE.y, p.z - MUZZLE.z);
  const nose =
    (1 - THREE.MathUtils.smoothstep(muzzle, 0.095, 0.12)) *
    THREE.MathUtils.smoothstep(p.z, 0.15, 0.22);
  if (p.y > 0.08 && hornDistance(p) < 0.032) {
    return [0.22, 0.2, 0.18];
  }
  // Pele preta em volta dos olhos, marca do Nelore.
  const eye = Math.hypot(Math.abs(p.x) - EYE.x, p.y - EYE.y, p.z - EYE.z);
  if (eye < 0.05 && nose === 0) {
    return tone(THREE.MathUtils.lerp(0.3, 0.8, eye / 0.05));
  }
  const skin = tone(0.66 + 0.2 * THREE.MathUtils.smoothstep(-p.y, 0.05, 0.3));
  return skin.map((value, i) => THREE.MathUtils.lerp(value, DARK[i], nose));
}

// Todas as malhas do boi, como arrays prontos para transferir do worker.
export function bakeCattle() {
  return {
    body: bake(
      bodyField,
      new THREE.Vector3(0, 0.8, -0.02),
      2.1,
      80,
      bodyShade,
      true,
    ),
    lying: bake(
      lyingField,
      new THREE.Vector3(0, 0.45, -0.05),
      2.0,
      60,
      lyingShade,
      true,
    ),
    neck: bake(neckField, new THREE.Vector3(0, 0.08, 0.3), 0.92, 48, neckShade),
    head: bake(
      headField,
      new THREE.Vector3(0, -0.12, 0.08),
      0.64,
      52,
      headShade,
    ),
  };
}
