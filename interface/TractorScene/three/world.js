import * as THREE from "three";
import { buildHerd, createCattleGeometry } from "./cattle.js";
import {
  at,
  catenary,
  glow,
  hash,
  linePairs,
  merge,
  mesh,
  rod,
} from "./helpers.js";

export const NEAR_Z = 10;
export const FAR_Z = -62;
export const SPAN = NEAR_Z - FAR_Z;

const ROAD_TILE = 8;
const SOIL_TILE = 8;
const PASTURE_TILE = 4;
const ROW_WIDTH = 0.8;
const PLANT_STEP = 0.5;
const PLANT_PATTERN = 12;
const CROP_PERIOD = PLANT_STEP * PLANT_PATTERN;
const POST_STEP = 2.5;
const POST_PATTERN = 4;
const POLE_SPAN = 32;
const TOWER_SPAN = 58;

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

function place(instanced, index, x, y, z, rx, ry, rz, scale) {
  _position.set(x, y, z);
  _rotation.setFromEuler(_euler.set(rx, ry, rz));
  _scale.setScalar(scale);
  instanced.setMatrixAt(index, _matrix.compose(_position, _rotation, _scale));
}

// Folha de milho: fita que sobe, arqueia e cai, mais fina na ponta.
function leaf(parts, colors, baseY, angle, length, width) {
  const steps = 5;
  const dx = Math.cos(angle);
  const dz = Math.sin(angle);
  const ring = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const out = length * s;
    const up = length * (0.75 * s - 0.85 * s * s);
    const half = (width / 2) * Math.pow(1 - s, 0.7) + 0.003;
    const cx = dx * out;
    const cz = dz * out;
    ring.push([
      [cx - dz * half, baseY + up, cz + dx * half],
      [cx + dz * half, baseY + up + half * 0.4, cz - dx * half],
      s,
    ]);
  }
  for (let i = 0; i < steps; i++) {
    const [a0, a1, s0] = ring[i];
    const [b0, b1, s1] = ring[i + 1];
    parts.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1);
    for (const s of [s0, s1, s0, s0, s1, s1]) {
      colors.push(0.2 + s * 0.22, 0.38 + s * 0.2, 0.12 + s * 0.06);
    }
  }
}

function cornGeometry() {
  const positions = [];
  const colors = [];
  const leaves = [
    [0.12, 0.3, 0.36],
    [0.24, 3.3, 0.44],
    [0.38, 0.9, 0.5],
    [0.52, 4.1, 0.52],
    [0.68, 1.6, 0.5],
    [0.84, 4.8, 0.44],
    [1.0, 2.3, 0.34],
  ];
  for (const [y, angle, length] of leaves) {
    leaf(positions, colors, y, angle, length, 0.075);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const stalk = new THREE.CylinderGeometry(0.012, 0.02, 1.08, 5)
    .translate(0, 0.54, 0)
    .toNonIndexed();
  stalk.deleteAttribute("uv");
  const stalkColors = new Float32Array(stalk.attributes.position.count * 3);
  for (let i = 0; i < stalkColors.length; i += 3) {
    stalkColors.set([0.24, 0.4, 0.14], i);
  }
  stalk.setAttribute("color", new THREE.BufferAttribute(stalkColors, 3));
  stalk.deleteAttribute("normal");

  const all = new THREE.BufferGeometry();
  const merged = [
    ...geometry.attributes.position.array,
    ...stalk.attributes.position.array,
  ];
  all.setAttribute("position", new THREE.Float32BufferAttribute(merged, 3));
  all.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      [...geometry.attributes.color.array, ...stalkColors],
      3,
    ),
  );
  all.computeVertexNormals();
  geometry.dispose();
  stalk.dispose();
  return all;
}

function tuftGeometry() {
  const positions = [];
  const colors = [];
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + hash(i) * 0.6;
    const lean = 0.08 + hash(i + 4) * 0.12;
    const height = 0.22 + hash(i + 9) * 0.22;
    const bx = Math.cos(angle) * 0.03;
    const bz = Math.sin(angle) * 0.03;
    const px = -Math.sin(angle) * 0.018;
    const pz = Math.cos(angle) * 0.018;
    positions.push(
      bx - px,
      0,
      bz - pz,
      bx + px,
      0,
      bz + pz,
      bx + Math.cos(angle) * lean,
      height,
      bz + Math.sin(angle) * lean,
    );
    colors.push(0.16, 0.24, 0.1, 0.16, 0.24, 0.1, 0.42, 0.46, 0.22);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function buildGround(m) {
  const group = new THREE.Group();
  const movers = [];

  const field = mesh(new THREE.PlaneGeometry(260, 150), m.soil, {
    cast: false,
  });
  field.rotation.x = -Math.PI / 2;
  field.position.z = -60;
  m.soil.map.repeat.set(260 / SOIL_TILE, 150 / SOIL_TILE);
  group.add(field);

  const road = mesh(new THREE.PlaneGeometry(5, 150), m.road, { cast: false });
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.006, -60);
  m.road.map.repeat.set(1, 150 / ROAD_TILE);
  group.add(road);

  const cropRows = [];
  for (let row = 0; row < 11; row++) {
    cropRows.push(3.3 + row * ROW_WIDTH);
  }

  const pasture = mesh(new THREE.PlaneGeometry(60, 150), m.pasture, {
    cast: false,
  });
  pasture.rotation.x = -Math.PI / 2;
  pasture.position.set(-32.75, 0.004, -60);
  m.pasture.map.repeat.set(60 / PASTURE_TILE, 150 / PASTURE_TILE);
  group.add(pasture);
  const plantsPerRow = Math.ceil((NEAR_Z + CROP_PERIOD + 50) / PLANT_STEP);
  const crops = new THREE.InstancedMesh(
    cornGeometry(),
    m.crop,
    cropRows.length * plantsPerRow,
  );
  crops.receiveShadow = true;
  let index = 0;
  cropRows.forEach((x, row) => {
    for (let k = 0; k < plantsPerRow; k++) {
      const seed = row * 37 + (k % PLANT_PATTERN) * 11;
      const z = NEAR_Z + CROP_PERIOD - k * PLANT_STEP;
      place(
        crops,
        index,
        x + (hash(seed) - 0.5) * 0.12,
        0,
        z + (hash(seed + 1) - 0.5) * 0.18,
        (hash(seed + 2) - 0.5) * 0.12,
        hash(seed + 3) * Math.PI * 2,
        (hash(seed + 4) - 0.5) * 0.12,
        0.95 + hash(seed + 5) * 0.4,
      );
      _color.setHSL(
        0.24 + hash(seed + 6) * 0.05,
        0.5,
        0.42 + hash(seed + 7) * 0.2,
      );
      crops.setColorAt(index, _color);
      index++;
    }
  });
  const cropGroup = new THREE.Group();
  cropGroup.add(crops);
  group.add(cropGroup);
  movers.push({ node: cropGroup, period: CROP_PERIOD });

  const pastureTufts = 70;
  const tuftCount = 2 * 3 * 64 + pastureTufts * 5;
  const tufts = new THREE.InstancedMesh(tuftGeometry(), m.crop, tuftCount);
  tufts.receiveShadow = true;
  index = 0;
  for (const side of [-1, 1]) {
    for (let lane = 0; lane < 3; lane++) {
      for (let k = 0; k < 64; k++) {
        const seed = side * 7 + lane * 53 + (k % 16) * 3;
        place(
          tufts,
          index,
          side * (2.25 + lane * 0.3 + hash(seed) * 0.2),
          0,
          NEAR_Z + 4 - k * 1 + hash(seed + 1) * 0.8,
          0,
          hash(seed + 2) * Math.PI * 2,
          0,
          0.8 + hash(seed + 3) * 0.9,
        );
        _color.setHSL(0.18 + hash(seed + 4) * 0.08, 0.35, 0.5);
        tufts.setColorAt(index, _color);
        index++;
      }
    }
  }
  // Touceiras soltas no pasto, repetidas a cada bloco de 16 m.
  for (let block = 0; block < 5; block++) {
    for (let k = 0; k < pastureTufts; k++) {
      place(
        tufts,
        index,
        -3.2 - hash(k * 1.9) * 20,
        0,
        NEAR_Z + 16 - block * 16 - hash(k * 2.7) * 16,
        0,
        hash(k * 3.3) * Math.PI * 2,
        0,
        1 + hash(k * 4.1) * 1.2,
      );
      _color.setHSL(0.2 + hash(k * 5.3) * 0.06, 0.4, 0.5);
      tufts.setColorAt(index, _color);
      index++;
    }
  }
  const tuftGroup = new THREE.Group();
  tuftGroup.add(tufts);
  group.add(tuftGroup);
  movers.push({ node: tuftGroup, period: 16 });

  const postCount = 2 * Math.ceil((NEAR_Z + 10 - FAR_Z) / POST_STEP);
  const posts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.05, 0.06, 1.3, 7).translate(0, 0.62, 0),
    m.wood,
    postCount,
  );
  posts.castShadow = true;
  posts.receiveShadow = true;
  index = 0;
  for (const side of [-1, 1]) {
    for (let k = 0; k < postCount / 2; k++) {
      const seed = side * 5 + (k % POST_PATTERN) * 13;
      place(
        posts,
        index++,
        side * 2.7,
        0,
        NEAR_Z + 10 - k * POST_STEP,
        (hash(seed) - 0.5) * 0.08,
        hash(seed + 1) * 3,
        (hash(seed + 2) - 0.5) * 0.08,
        0.9 + hash(seed + 3) * 0.2,
      );
    }
  }
  const postGroup = new THREE.Group();
  postGroup.add(posts);
  group.add(postGroup);
  movers.push({ node: postGroup, period: POST_STEP * POST_PATTERN });

  const wires = [];
  for (const side of [-1, 1]) {
    for (const y of [0.42, 0.78, 1.12]) {
      wires.push([side * 2.7, y, NEAR_Z + 10, side * 2.7, y, FAR_Z - 20]);
    }
  }
  group.add(linePairs(wires, m.wire));

  const poles = buildPoleLine(m);
  group.add(poles);
  movers.push({ node: poles, period: POLE_SPAN });

  const towers = buildTowerLine(m);
  group.add(towers);
  movers.push({ node: towers, period: TOWER_SPAN });

  function update(distance) {
    m.road.map.offset.y = -distance / ROAD_TILE;
    m.soil.map.offset.y = -distance / SOIL_TILE;
    m.pasture.map.offset.y = -distance / PASTURE_TILE;
    movers.forEach(({ node, period }) => {
      node.position.z = -(distance % period);
    });
  }

  return { group, update };
}

// Postes de madeira da rede rural, com os fios ligando um ao outro.
function buildPoleLine(m) {
  const group = new THREE.Group();
  const x = 3.4;
  const height = 8.2;
  const parts = [];
  const pins = [];
  const wires = [];
  const first = NEAR_Z + POLE_SPAN - 2;
  const zs = [];
  for (let z = first; z > FAR_Z - POLE_SPAN; z -= POLE_SPAN) {
    zs.push(z);
  }
  zs.forEach((z) => {
    parts.push(
      new THREE.CylinderGeometry(0.11, 0.14, height, 8).translate(
        x,
        height / 2,
        z,
      ),
      new THREE.BoxGeometry(1.9, 0.1, 0.1).translate(x, height - 0.45, z),
      rod([x - 0.6, height - 0.45, z], [x, height - 1.1, z], 0.025),
      rod([x + 0.6, height - 0.45, z], [x, height - 1.1, z], 0.025),
    );
    for (const dx of [-0.85, 0, 0.85]) {
      const top = dx === 0 ? height + 0.12 : height - 0.32;
      pins.push(
        new THREE.CylinderGeometry(0.04, 0.05, 0.16, 8).translate(
          x + dx,
          top,
          z,
        ),
      );
    }
  });
  for (let i = 0; i < zs.length - 1; i++) {
    for (const dx of [-0.85, 0, 0.85]) {
      const y = dx === 0 ? height + 0.2 : height - 0.24;
      const points = catenary([x + dx, y, zs[i]], [x + dx, y, zs[i + 1]], 0.7);
      for (let k = 0; k < points.length - 1; k++) {
        wires.push([...points[k].toArray(), ...points[k + 1].toArray()]);
      }
    }
  }
  group.add(mesh(merge(parts), m.wood));
  group.add(mesh(merge(pins), m.insulator, { cast: false }));
  group.add(linePairs(wires, m.cable));
  return group;
}

function taperedLattice(pairs, ox, oz, height, bottom, top, levels) {
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const half = (y) => THREE.MathUtils.lerp(bottom, top, y / height);
  const step = height / levels;
  for (let level = 0; level < levels; level++) {
    const y0 = level * step;
    const y1 = y0 + step;
    corners.forEach(([ax, az], i) => {
      const [bx, bz] = corners[(i + 1) % 4];
      const p = (cx, cz, y) => [ox + cx * half(y), y, oz + cz * half(y)];
      pairs.push(
        [...p(ax, az, y0), ...p(ax, az, y1)],
        [...p(ax, az, y1), ...p(bx, bz, y1)],
        [...p(ax, az, y0), ...p(bx, bz, y1)],
        [...p(bx, bz, y0), ...p(ax, az, y1)],
      );
    });
  }
}

// Linha de transmissão ao fundo: torres treliçadas e cabos em catenária.
function buildTowerLine(m) {
  const group = new THREE.Group();
  const x = 26;
  const height = 21;
  const lattice = [];
  const cables = [];
  const zs = [];
  for (let z = NEAR_Z + TOWER_SPAN; z > FAR_Z - TOWER_SPAN; z -= TOWER_SPAN) {
    zs.push(z);
  }
  const arms = [
    [height - 4.5, 4.6],
    [height - 1.2, 3.4],
  ];
  zs.forEach((z) => {
    taperedLattice(lattice, x, z, height, 2.4, 0.7, 9);
    for (const [y, reach] of arms) {
      lattice.push(
        [x - reach, y, z, x + reach, y, z],
        [x - reach, y, z, x - 0.8, y + 1.2, z],
        [x + reach, y, z, x + 0.8, y + 1.2, z],
        [x - reach, y, z, x - reach, y - 1.4, z],
        [x + reach, y, z, x + reach, y - 1.4, z],
      );
    }
    lattice.push([x, height, z, x, height + 2.4, z]);
  });
  for (let i = 0; i < zs.length - 1; i++) {
    for (const [y, reach] of arms) {
      for (const dx of [-reach, reach]) {
        const points = catenary(
          [x + dx, y - 1.4, zs[i]],
          [x + dx, y - 1.4, zs[i + 1]],
          3.2,
          20,
        );
        for (let k = 0; k < points.length - 1; k++) {
          cables.push([...points[k].toArray(), ...points[k + 1].toArray()]);
        }
      }
    }
    const points = catenary(
      [x, height + 2.4, zs[i]],
      [x, height + 2.4, zs[i + 1]],
      2.4,
      20,
    );
    for (let k = 0; k < points.length - 1; k++) {
      cables.push([...points[k].toArray(), ...points[k + 1].toArray()]);
    }
  }
  group.add(linePairs(lattice, m.lattice));
  group.add(linePairs(cables, m.cable));
  return group;
}

function silo(m, radius, height) {
  const group = new THREE.Group();
  const wall = mesh(
    new THREE.CylinderGeometry(radius, radius, height, 48, 1, true),
    m.galvanized,
  );
  wall.position.y = height / 2;
  group.add(wall);

  const roofHeight = radius * 0.55;
  group.add(
    at(
      mesh(
        new THREE.ConeGeometry(radius * 1.05, roofHeight, 48, 1, true),
        m.siloRoof,
      ),
      0,
      height + roofHeight / 2,
      0,
    ),
  );

  const parts = [
    new THREE.CylinderGeometry(radius * 1.08, radius * 1.1, 0.3, 40).translate(
      0,
      0.15,
      0,
    ),
  ];
  group.add(mesh(merge(parts), m.concrete));

  const steel = [
    new THREE.TorusGeometry(radius * 1.05, 0.03, 6, 48)
      .rotateX(Math.PI / 2)
      .translate(0, height, 0),
    new THREE.CylinderGeometry(0.32, 0.36, 0.3, 16).translate(
      0,
      height + roofHeight + 0.1,
      0,
    ),
  ];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const x = Math.cos(angle) * (radius + 0.02);
    const z = Math.sin(angle) * (radius + 0.02);
    steel.push(
      new THREE.BoxGeometry(0.06, height, 0.06)
        .rotateY(-angle)
        .translate(x, height / 2, z),
    );
  }
  // Escada com gaiola na face voltada para a estrada.
  const lz = radius + 0.12;
  steel.push(
    rod([-0.2, 0.3, lz], [-0.2, height + 0.4, lz], 0.022),
    rod([0.2, 0.3, lz], [0.2, height + 0.4, lz], 0.022),
  );
  for (let y = 0.6; y < height; y += 0.3) {
    steel.push(rod([-0.2, y, lz], [0.2, y, lz], 0.012));
  }
  for (let y = 2.4; y < height; y += 0.9) {
    for (let k = 0; k <= 6; k++) {
      const a0 = Math.PI * (k / 6);
      const a1 = Math.PI * ((k + 1) / 6);
      if (k < 6) {
        steel.push(
          rod(
            [Math.cos(a0) * 0.36, y, lz + Math.sin(a0) * 0.36],
            [Math.cos(a1) * 0.36, y, lz + Math.sin(a1) * 0.36],
            0.012,
          ),
        );
      }
    }
  }
  for (const a of [0.15, 0.5, 0.85]) {
    const angle = Math.PI * a;
    steel.push(
      rod(
        [Math.cos(angle) * 0.36, 2.4, lz + Math.sin(angle) * 0.36],
        [Math.cos(angle) * 0.36, height, lz + Math.sin(angle) * 0.36],
        0.012,
      ),
    );
  }
  group.add(mesh(merge(steel), m.steelLight));
  return { group, apex: height + roofHeight + 0.25 };
}

// Silos, elevador de grãos e passarela: cada bica termina num silo.
function farmstead(m) {
  const group = new THREE.Group();
  const silos = [
    { x: 0, z: 0, radius: 1.5, height: 7 },
    { x: -3.6, z: -1.4, radius: 1.5, height: 7 },
    { x: -7.6, z: -0.8, radius: 1.9, height: 8.5 },
  ];
  const tops = silos.map((spec) => {
    const built = silo(m, spec.radius, spec.height);
    built.group.position.set(spec.x, 0, spec.z);
    group.add(built.group);
    return [spec.x, built.apex, spec.z];
  });

  const leg = { x: -1.7, z: -3.6, height: 13.5 };
  const steel = [
    new THREE.BoxGeometry(0.34, leg.height, 0.34).translate(
      leg.x - 0.2,
      leg.height / 2,
      leg.z,
    ),
    new THREE.BoxGeometry(0.34, leg.height, 0.34).translate(
      leg.x + 0.2,
      leg.height / 2,
      leg.z,
    ),
    new THREE.BoxGeometry(1.1, 0.9, 1.0).translate(
      leg.x,
      leg.height + 0.45,
      leg.z,
    ),
    new THREE.BoxGeometry(1.6, 0.9, 1.4).translate(leg.x, 0.45, leg.z),
  ];
  const head = [leg.x, leg.height + 0.2, leg.z];
  tops.forEach((top) => {
    steel.push(rod(head, top, 0.09, 8));
    steel.push(
      new THREE.CylinderGeometry(0.14, 0.09, 0.4, 8).translate(
        top[0],
        top[1] + 0.12,
        top[2],
      ),
    );
  });
  group.add(mesh(merge(steel), m.galvanizedPlain));

  const brace = [];
  const tower = { x: leg.x, z: leg.z + 0.9 };
  const towerTop = leg.height - 0.4;
  for (const dx of [-0.45, 0.45]) {
    for (const dz of [-0.45, 0.45]) {
      brace.push(
        rod(
          [tower.x + dx, 0, tower.z + dz],
          [tower.x + dx, towerTop, tower.z + dz],
          0.035,
        ),
      );
    }
  }
  for (let y = 1.4; y < towerTop; y += 1.4) {
    brace.push(
      rod(
        [tower.x - 0.45, y - 1.4, tower.z + 0.45],
        [tower.x + 0.45, y, tower.z + 0.45],
        0.02,
      ),
      rod(
        [tower.x + 0.45, y - 1.4, tower.z - 0.45],
        [tower.x - 0.45, y, tower.z - 0.45],
        0.02,
      ),
      rod(
        [tower.x - 0.45, y, tower.z - 0.45],
        [tower.x - 0.45, y, tower.z + 0.45],
        0.02,
      ),
      rod(
        [tower.x + 0.45, y, tower.z - 0.45],
        [tower.x + 0.45, y, tower.z + 0.45],
        0.02,
      ),
      rod(
        [tower.x - 0.45, y, tower.z + 0.45],
        [tower.x + 0.45, y, tower.z + 0.45],
        0.02,
      ),
    );
  }
  // Passarela do topo do elevador até o topo de cada silo vizinho.
  [tops[0], tops[1]].forEach((top) => {
    const from = [leg.x, leg.height - 0.4, leg.z + 0.9];
    const to = [top[0], top[1] - 0.15, top[2]];
    for (const offset of [-0.3, 0.3]) {
      brace.push(
        rod(
          [from[0], from[1], from[2] + offset],
          [to[0], to[1], to[2] + offset],
          0.03,
        ),
        rod(
          [from[0], from[1] + 0.9, from[2] + offset],
          [to[0], to[1] + 0.9, to[2] + offset],
          0.02,
        ),
      );
    }
  });
  group.add(mesh(merge(brace), m.steelLight));
  return group;
}

function barn(m, width, height, depth) {
  const group = new THREE.Group();
  const w = width / 2;
  const d = depth / 2;
  const ridge = height + width * 0.36;
  const shape = new THREE.Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, height);
  shape.lineTo(0, ridge);
  shape.lineTo(-w, height);
  shape.closePath();
  const walls = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
  walls.translate(0, 0, -d);
  group.add(mesh(walls, m.barnWall));

  const slope = Math.hypot(w + 0.4, ridge - height + 0.3);
  const angle = Math.atan2(ridge - height, w);
  for (const side of [-1, 1]) {
    const panel = mesh(
      new THREE.BoxGeometry(slope, 0.08, depth + 0.6),
      m.roofMetal,
    );
    panel.rotation.z = side * -angle;
    panel.position.set(side * (w / 2 + 0.05), (height + ridge) / 2 + 0.1, 0);
    group.add(panel);
  }

  const face = d + 0.03;
  const door = w * 0.42;
  const top = height * 0.74;
  const trim = [
    new THREE.BoxGeometry(door * 2 + 0.2, 0.14, 0.06).translate(0, top, face),
    new THREE.BoxGeometry(0.14, top, 0.06).translate(-door, top / 2, face),
    new THREE.BoxGeometry(0.14, top, 0.06).translate(door, top / 2, face),
    new THREE.BoxGeometry(0.1, top, 0.06).translate(0, top / 2, face),
    rod([-door, 0.05, face + 0.02], [-0.05, top - 0.05, face + 0.02], 0.05, 4),
    rod([-0.05, 0.05, face + 0.02], [-door, top - 0.05, face + 0.02], 0.05, 4),
    rod([door, 0.05, face + 0.02], [0.05, top - 0.05, face + 0.02], 0.05, 4),
    rod([0.05, 0.05, face + 0.02], [door, top - 0.05, face + 0.02], 0.05, 4),
    new THREE.BoxGeometry(1.5, 0.1, 0.06).translate(0, height + 0.35, face),
    new THREE.BoxGeometry(1.5, 0.1, 0.06).translate(0, height + 1.35, face),
    new THREE.BoxGeometry(0.1, 1.1, 0.06).translate(-0.7, height + 0.85, face),
    new THREE.BoxGeometry(0.1, 1.1, 0.06).translate(0.7, height + 0.85, face),
  ];
  for (const x of [-w, w]) {
    trim.push(
      new THREE.BoxGeometry(0.16, height, 0.16).translate(x, height / 2, d),
    );
    trim.push(
      new THREE.BoxGeometry(0.16, height, 0.16).translate(x, height / 2, -d),
    );
  }
  group.add(mesh(merge(trim), m.barnTrim));

  const loft = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), m.warmWindow);
  group.add(at(loft, 0, height + 0.85, face - 0.02));

  // Luminária sobre a porta, apagada durante o dia.
  const lampY = top + 0.55;
  group.add(
    at(
      mesh(new THREE.ConeGeometry(0.28, 0.2, 16, 1, true), m.roofMetal, {
        cast: false,
      }),
      0,
      lampY,
      face + 0.35,
    ),
  );
  group.add(
    mesh(
      rod([0, lampY + 0.1, face], [0, lampY + 0.1, face + 0.35], 0.02),
      m.roofMetal,
    ),
  );
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), m.sodium);
  group.add(at(bulb, 0, lampY - 0.1, face + 0.35));
  return group;
}

function hayBales(m, count, seed) {
  const group = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(0.72, 0.72, 1.25, 28).rotateZ(
    Math.PI / 2,
  );
  for (let i = 0; i < count; i++) {
    const bale = mesh(geometry, [m.haySide, m.hayEnd, m.hayEnd]);
    bale.position.set(
      (hash(seed + i) - 0.5) * 3.4,
      0.7,
      (hash(seed + i * 5) - 0.5) * 4.4,
    );
    bale.rotation.y = hash(seed + i * 9) * Math.PI;
    group.add(bale);
  }
  return group;
}

function tree(m, seed, height) {
  const group = new THREE.Group();
  group.add(
    mesh(
      new THREE.CylinderGeometry(0.12, 0.2, height * 0.55, 7).translate(
        0,
        height * 0.27,
        0,
      ),
      m.bark,
    ),
  );
  // Copa em tufos arredondados: o relevo é suave e a cor escurece por baixo.
  const blobs = [];
  const tufts = 9;
  for (let i = 0; i < tufts; i++) {
    const radius = height * (0.17 + hash(seed + i) * 0.09);
    const blob = new THREE.SphereGeometry(radius, 22, 16);
    const position = blob.attributes.position;
    const colors = [];
    for (let v = 0; v < position.count; v++) {
      const x = position.getX(v);
      const y = position.getY(v);
      const z = position.getZ(v);
      const bump =
        1 +
        0.12 * Math.sin(x * 9 + seed) * Math.sin(z * 8 + i) +
        0.08 * Math.sin(y * 13 + x * 5);
      position.setXYZ(v, x * bump, y * bump * 0.85, z * bump);
      const light = THREE.MathUtils.clamp(0.55 + (y / radius) * 0.45, 0.2, 1);
      const spot = hash(Math.round((x + y * 3 + z * 7) * 6)) * 0.15;
      colors.push(
        (0.12 + spot * 0.4) * light,
        (0.26 + spot) * light,
        0.09 * light,
      );
    }
    blob.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    blob.computeVertexNormals();
    const angle = (i / tufts) * Math.PI * 2 + hash(seed) * 2;
    const spread = i === 0 ? 0 : height * (0.14 + hash(seed + i * 5) * 0.1);
    blob.translate(
      Math.cos(angle) * spread,
      height * (0.6 + hash(seed + i * 3) * 0.22),
      Math.sin(angle) * spread,
    );
    blobs.push(blob);
  }
  // Galhos ligando o tronco a cada tufo da copa.
  const branches = blobs.slice(1).map((blob) => {
    blob.computeBoundingSphere();
    const center = blob.boundingSphere.center;
    return rod(
      [0, height * 0.45, 0],
      [center.x * 0.7, center.y - 0.3, center.z * 0.7],
      0.06,
      5,
    );
  });
  group.add(mesh(merge(branches), m.bark));
  group.add(mesh(merge(blobs), m.foliage));
  return group;
}

// Pivô central de irrigação: tubo em arco, treliça por baixo e torres com rodas.
function pivot(m) {
  const group = new THREE.Group();
  const towers = [-15, -6.5, 5, 12];
  const pipeY = 3.7;
  const pipe = [];
  const truss = [];
  const drops = [];
  const wheels = [];

  for (let t = 0; t < towers.length - 1; t++) {
    const x0 = towers[t];
    const x1 = towers[t + 1];
    const steps = Math.round((x1 - x0) / 1.25);
    const top = [];
    const bottom = [];
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const x = THREE.MathUtils.lerp(x0, x1, k);
      const arch = Math.sin(Math.PI * k) * 0.35;
      top.push([x, pipeY + arch, 0]);
      bottom.push([x, pipeY + arch - Math.sin(Math.PI * k) * 1.25, 0]);
    }
    for (let i = 0; i < steps; i++) {
      pipe.push(rod(top[i], top[i + 1], 0.085, 10));
      for (const dz of [-0.3, 0.3]) {
        const b0 = [bottom[i][0], bottom[i][1], dz];
        const b1 = [bottom[i + 1][0], bottom[i + 1][1], dz];
        truss.push(rod(b0, b1, 0.022));
        truss.push(rod(top[i + 1], b1, 0.016));
        if (i > 0) {
          truss.push(rod(top[i], b0, 0.016));
        }
      }
      if (i > 0) {
        drops.push(
          rod(top[i], [top[i][0], 1.3, 0], 0.008, 4),
          new THREE.CylinderGeometry(0.05, 0.02, 0.08, 8).translate(
            top[i][0],
            1.26,
            0,
          ),
        );
      }
    }
  }

  const ends = [towers[0], towers[towers.length - 1]];
  const overhang = [];
  const overhangEnd = ends[1] + 4.5;
  overhang.push(
    rod([ends[1], pipeY, 0], [overhangEnd, pipeY - 0.3, 0], 0.06, 8),
  );
  overhang.push(
    rod([ends[1], pipeY + 0.8, 0], [overhangEnd, pipeY - 0.3, 0], 0.012),
  );
  overhang.push(rod([ends[1], pipeY + 0.8, 0], [ends[1], pipeY, 0], 0.025));
  overhang.push(
    new THREE.ConeGeometry(0.1, 0.4, 10)
      .rotateZ(-1.1)
      .translate(overhangEnd + 0.1, pipeY - 0.25, 0),
  );

  towers.forEach((x, index) => {
    if (index === 0) {
      // Ponto central do pivô: pirâmide fixa no chão, com o painel de controle.
      for (const [dx, dz] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        truss.push(rod([x + dx * 1.2, 0, dz * 1.2], [x, pipeY + 0.1, 0], 0.05));
      }
      pipe.push(rod([x, 0, 0], [x, pipeY + 0.4, 0], 0.12, 12));
      truss.push(
        new THREE.BoxGeometry(0.5, 0.7, 0.3).translate(x + 0.7, 1.3, 0.9),
      );
      return;
    }
    const wheelZ = 1.6;
    const top = [x, pipeY, 0];
    truss.push(
      rod(top, [x, 0.65, -wheelZ], 0.045),
      rod(top, [x, 0.65, wheelZ], 0.045),
      rod([x, 0.65, -wheelZ], [x, 0.65, wheelZ], 0.05),
      rod([x, 1.8, -0.9], [x, 1.8, 0.9], 0.03),
      new THREE.BoxGeometry(0.3, 0.3, 0.3).translate(x, 0.7, 0),
      rod([x, 0.7, 0], [x, 0.65, -wheelZ], 0.018),
      rod([x, 0.7, 0], [x, 0.65, wheelZ], 0.018),
    );
    for (const dz of [-wheelZ, wheelZ]) {
      wheels.push(
        new THREE.TorusGeometry(0.46, 0.17, 10, 24)
          .rotateY(Math.PI / 2)
          .translate(x, 0.63, dz),
      );
      truss.push(
        new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16)
          .rotateZ(Math.PI / 2)
          .translate(x, 0.63, dz),
      );
    }
  });

  group.add(mesh(merge([...pipe, ...overhang]), m.galvanizedPlain));
  group.add(mesh(merge(truss), m.steelLight));
  group.add(mesh(merge(drops), m.steelLight, { cast: false }));
  group.add(mesh(merge(wheels), m.tireDark));
  return group;
}

export function buildScenery(m) {
  const items = [];

  function put(node, x, z, rotation = 0) {
    node.position.set(x, 0, z);
    node.rotation.y = rotation;
    items.push({ node, z0: z });
    return node;
  }

  put(pivot(m), 0, -10);

  put(farmstead(m), -11, -4, 0.15);
  put(barn(m, 6.8, 3.8, 9), 15, -1, -0.35);
  put(hayBales(m, 4, 3), 9.6, 5);
  put(tree(m, 2, 7), 19.5, 7);
  put(tree(m, 7, 6), 10.5, -15);
  put(tree(m, 11, 8), -17, 3);
  put(pivot(m), 0, -40);
  put(barn(m, 7.5, 4, 10), -14, -30, 0.3);
  put(tree(m, 19, 7.5), -17, -45);
  put(hayBales(m, 5, 17), -10.4, -46);
  put(farmstead(m), 13.5, -48, Math.PI - 0.2);
  put(tree(m, 23, 6.5), 9.8, -26);

  // Pasto do lado esquerdo da estrada, com o gado perto da cerca.
  // Os bois chegam depois, quando o worker termina de gerar as malhas; até
  // lá cada lote é só o cocho no lugar.
  const herds = [];
  const egrets = [];
  const lots = [
    [6, 5, -6.3, -3.5, 4.6, 6, true],
    [5, 31, -7.5, -20, 6, 8, false],
    [4, 57, -6.5, -52, 5, 6, true],
  ].map(([count, seed, x, z, width, depth, trough]) => {
    const group = new THREE.Group();
    if (trough) {
      group.add(
        at(
          mesh(
            new THREE.BoxGeometry(0.6, 0.5, 2.4).translate(0, 0.25, 0),
            m.galvanizedPlain,
          ),
          width / 2 + 0.8,
          0,
          0,
        ),
      );
    }
    put(group, x, z);
    return { group, count, seed, width, depth };
  });

  function addCattle(baked) {
    const cattle = createCattleGeometry(baked);
    lots.forEach(({ group, count, seed, width, depth }) => {
      const herd = buildHerd(m, cattle, count, seed, width, depth);
      group.add(herd.group);
      herds.push(...herd.animals);
      egrets.push(...herd.egrets);
    });
  }

  return { items, herds, egrets, addCattle };
}

function ridgeGeometry(z, base, amplitude, seed, trees) {
  const vertices = [];
  let previous = null;
  for (let x = -130; x <= 130; x += 0.8) {
    let y =
      base +
      amplitude *
        (0.5 * Math.sin(x * 0.045 + seed) +
          0.3 * Math.sin(x * 0.11 + seed * 2.1) +
          0.2 * Math.sin(x * 0.23 + seed * 3.7));
    if (trees) {
      const clump = Math.max(0, Math.sin(x * 0.07 + seed * 5.1));
      y += clump * (0.6 + hash(Math.round(x * 4) + seed) * 1.1);
    }
    y = Math.max(y, 0.5);
    if (previous) {
      const [x0, y0] = previous;
      vertices.push(
        x0,
        -2,
        z,
        x,
        -2,
        z,
        x,
        y,
        z,
        x0,
        -2,
        z,
        x,
        y,
        z,
        x0,
        y0,
        z,
      );
    }
    previous = [x, y];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  return geometry;
}

export function buildHorizon(m) {
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(ridgeGeometry(-92, 10, 6, 1.3, false), m.farFillDeep),
  );
  group.add(new THREE.Mesh(ridgeGeometry(-80, 6, 4, 4.1, true), m.farFillMid));
  group.add(new THREE.Mesh(ridgeGeometry(-68, 2.6, 2, 7.7, true), m.farFill));

  return group;
}

function turbine(m, glowMap, height) {
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.5, height, 16).translate(
        0,
        height / 2,
        0,
      ),
      m.turbine,
    ),
  );
  group.add(
    at(
      new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 1.1, 4, 12).rotateX(Math.PI / 2),
        m.turbine,
      ),
      0,
      height,
      -0.1,
    ),
  );

  const rotor = new THREE.Group();
  rotor.position.set(0, height, 0.65);
  const blade = new THREE.Shape();
  blade.moveTo(0, -0.12);
  blade.quadraticCurveTo(1.6, -0.42, 6.2, -0.06);
  blade.lineTo(6.3, 0.02);
  blade.quadraticCurveTo(2, 0.22, 0, 0.12);
  blade.closePath();
  const bladeGeometry = new THREE.ShapeGeometry(blade, 8);
  const blades = [];
  for (let i = 0; i < 3; i++) {
    blades.push(bladeGeometry.clone().rotateZ((i / 3) * Math.PI * 2));
  }
  blades.push(new THREE.SphereGeometry(0.3, 12, 8).scale(1, 1, 1.4));
  bladeGeometry.dispose();
  rotor.add(new THREE.Mesh(merge(blades), m.turbine));
  group.add(rotor);

  const beacon = at(glow(glowMap, 0xff2222, 1.6, 0.1), 0, height + 0.45, 0);
  group.add(beacon);
  return { group, rotor, beacon };
}

export function buildTurbines(m, glowMap) {
  const group = new THREE.Group();
  const turbines = [];
  for (const [x, z, height, phase] of [
    [-38, -60, 13, 0],
    [-25, -64, 12, 1.7],
    [30, -62, 13.5, 0.6],
    [44, -58, 12.5, 2.4],
  ]) {
    const item = turbine(m, glowMap, height);
    item.group.position.set(x, 0, z);
    item.rotor.rotation.z = phase;
    item.phase = phase;
    group.add(item.group);
    turbines.push(item);
  }
  return { group, turbines };
}
