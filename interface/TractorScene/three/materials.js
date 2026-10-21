import * as THREE from "three";
import {
  canvasTexture,
  corrugatedNormal,
  hash,
  noise,
  radialTexture,
} from "./helpers.js";

function roadTexture() {
  // 4 px por 5 cm: estrada de 5 m por 8 m, com trilhas de pneu e canteiro de capim.
  return canvasTexture(256, 410, (context, width, height) => {
    const toX = (meters) => ((meters + 2.5) / 5) * width;
    context.fillStyle = "#4a3b2c";
    context.fillRect(0, 0, width, height);
    noise(context, width, height, ["#5c4a37", "#3a2d21", "#6b5841"], 5200, 2);

    for (const center of [-1.03, 1.03]) {
      const gradient = context.createLinearGradient(
        toX(center - 0.34),
        0,
        toX(center + 0.34),
        0,
      );
      gradient.addColorStop(0, "rgba(40,30,22,0)");
      gradient.addColorStop(0.3, "rgba(40,30,22,0.55)");
      gradient.addColorStop(0.7, "rgba(40,30,22,0.55)");
      gradient.addColorStop(1, "rgba(40,30,22,0)");
      context.fillStyle = gradient;
      context.fillRect(toX(center - 0.34), 0, toX(0.68) - toX(0), height);
      // Marcas das garras do pneu na terra.
      context.fillStyle = "rgba(25,18,12,0.35)";
      for (let y = 0; y < height; y += 9) {
        context.fillRect(toX(center - 0.22), y, toX(0.18) - toX(0), 3);
        context.fillRect(toX(center + 0.04), y + 4, toX(0.18) - toX(0), 3);
      }
    }

    const strip = context.createLinearGradient(toX(-0.45), 0, toX(0.45), 0);
    strip.addColorStop(0, "rgba(62,62,36,0)");
    strip.addColorStop(0.35, "rgba(62,62,36,0.7)");
    strip.addColorStop(0.65, "rgba(62,62,36,0.7)");
    strip.addColorStop(1, "rgba(62,62,36,0)");
    context.fillStyle = strip;
    context.fillRect(toX(-0.45), 0, toX(0.9) - toX(0), height);
    for (let i = 0; i < 900; i++) {
      context.fillStyle = i % 2 ? "#55603a" : "#33391f";
      context.fillRect(
        toX(-0.3) + hash(i * 1.3) * (toX(0.6) - toX(0)),
        hash(i * 2.9) * height,
        1.5,
        4 + hash(i) * 6,
      );
    }

    for (const edge of [-2.5, 2.5]) {
      const from = edge < 0 ? toX(-2.5) : toX(1.9);
      const grass = context.createLinearGradient(
        from,
        0,
        from + toX(0.6) - toX(0),
        0,
      );
      const solid = "rgba(48,60,30,1)";
      const clear = "rgba(48,60,30,0)";
      grass.addColorStop(0, edge < 0 ? solid : clear);
      grass.addColorStop(1, edge < 0 ? clear : solid);
      context.fillStyle = grass;
      context.fillRect(from, 0, toX(0.6) - toX(0), height);
    }
  });
}

function soilTexture() {
  // 8 m por 8 m, com as linhas de plantio a cada 80 cm.
  return canvasTexture(256, 256, (context, width, height) => {
    context.fillStyle = "#3b2a1d";
    context.fillRect(0, 0, width, height);
    noise(context, width, height, ["#4a3524", "#2c1f15", "#55402b"], 6000, 2);
    for (let row = 0; row < 10; row++) {
      const x = (row / 10) * width;
      const gradient = context.createLinearGradient(x, 0, x + width / 10, 0);
      gradient.addColorStop(0, "rgba(20,14,9,0.45)");
      gradient.addColorStop(0.5, "rgba(80,62,42,0.25)");
      gradient.addColorStop(1, "rgba(20,14,9,0.45)");
      context.fillStyle = gradient;
      context.fillRect(x, 0, width / 10, height);
    }
    noise(context, width, height, ["#2f4a1c", "#24361a"], 700, 3);
  });
}

function grilleTexture() {
  return canvasTexture(256, 160, (context, width, height) => {
    context.fillStyle = "#08090a";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#2b2f33";
    context.lineWidth = 3;
    for (let y = -8; y < height + 8; y += 14) {
      for (let x = -8; x < width + 8; x += 16) {
        const ox = (Math.round(y / 14) % 2) * 8;
        context.beginPath();
        context.moveTo(x + ox - 6, y);
        context.lineTo(x + ox, y - 6);
        context.lineTo(x + ox + 6, y);
        context.lineTo(x + ox, y + 6);
        context.closePath();
        context.stroke();
      }
    }
  });
}

function ventTexture() {
  return canvasTexture(256, 96, (context, width, height) => {
    context.fillStyle = "#14361b";
    context.fillRect(0, 0, width, height);
    for (let x = 10; x < width - 10; x += 14) {
      context.fillStyle = "#050605";
      context.fillRect(x, 12, 8, height - 24);
      context.fillStyle = "rgba(120,170,120,0.25)";
      context.fillRect(x + 8, 12, 1, height - 24);
    }
  });
}

function decalTexture() {
  return canvasTexture(512, 84, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#f2c22a";
    context.font = "800 64px Arial, Helvetica, sans-serif";
    context.textBaseline = "middle";
    context.fillText("AGROTAB", 18, height / 2 + 2);
    context.fillRect(350, height / 2 - 4, width - 370, 8);
  });
}

function plankTexture() {
  // 2 m por 2 m de tábuas verticais pintadas de vermelho celeiro.
  return canvasTexture(256, 256, (context, width, height) => {
    context.fillStyle = "#6e1d16";
    context.fillRect(0, 0, width, height);
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * width;
      context.fillStyle = `rgba(${90 + hash(i) * 40},${24 + hash(i + 1) * 12},${18},0.6)`;
      context.fillRect(x + 2, 0, width / 8 - 4, height);
      context.fillStyle = "rgba(20,6,4,0.8)";
      context.fillRect(x, 0, 2, height);
    }
    noise(context, width, height, ["#4a120d", "#8a3a2a"], 3000, 2);
  });
}

function strawSide() {
  return canvasTexture(256, 128, (context, width, height) => {
    context.fillStyle = "#8a6b2e";
    context.fillRect(0, 0, width, height);
    for (let i = 0; i < 2600; i++) {
      context.strokeStyle = ["#b08c45", "#6b5022", "#c9a85c"][i % 3];
      context.globalAlpha = 0.5;
      const x = hash(i * 1.7) * width;
      const y = hash(i * 3.1) * height;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 8 + hash(i) * 10, y + (hash(i + 2) - 0.5) * 3);
      context.stroke();
    }
    context.globalAlpha = 1;
    context.fillStyle = "rgba(240,240,230,0.25)";
    for (const y of [0.3, 0.7]) {
      context.fillRect(0, y * height, width, 3);
    }
  });
}

function strawEnd() {
  return canvasTexture(256, 256, (context, width, height) => {
    context.fillStyle = "#7d5f28";
    context.fillRect(0, 0, width, height);
    context.lineWidth = 3;
    for (let r = 4; r < width / 2; r += 5) {
      context.strokeStyle = r % 10 ? "#a4813c" : "#5e4519";
      context.beginPath();
      context.arc(width / 2, height / 2, r, 0, Math.PI * 2);
      context.stroke();
    }
    noise(context, width, height, ["#c9a85c", "#5e4519"], 1800, 2);
  });
}

// Camisa xadrez de flanela, vermelha com azul-marinho.
function plaidTexture() {
  return canvasTexture(128, 128, (context, width, height) => {
    context.fillStyle = "#8e2a22";
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 0.55;
    context.fillStyle = "#1e2a44";
    for (let i = 0; i < 4; i++) {
      context.fillRect(i * 32 + 4, 0, 12, height);
      context.fillRect(0, i * 32 + 4, width, 12);
    }
    context.globalAlpha = 0.35;
    context.fillStyle = "#e8d9b8";
    for (let i = 0; i < 4; i++) {
      context.fillRect(i * 32 + 22, 0, 2, height);
      context.fillRect(0, i * 32 + 22, width, 2);
    }
    context.globalAlpha = 1;
  });
}

function strawHatTexture() {
  return canvasTexture(128, 128, (context, width, height) => {
    context.fillStyle = "#cfae62";
    context.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 8) {
        context.fillStyle = (x / 8 + y / 4) % 2 ? "#b8954c" : "#e0c27a";
        context.fillRect(x, y, 6, 3);
      }
    }
  });
}

function pastureTexture() {
  // 4 m por 4 m de braquiária com manchas de capim seco.
  return canvasTexture(256, 256, (context, width, height) => {
    context.fillStyle = "#5c7a2c";
    context.fillRect(0, 0, width, height);
    noise(context, width, height, ["#6d8d35", "#4a6623", "#879a42"], 7000, 2);
    noise(context, width, height, ["#8c7d45"], 500, 4);
  });
}

// Pelagem curta: brilho aveludado e pelos em relevo gerados no shader a partir
// da posição no corpo do animal, sem textura (a malha dos bois não tem UV).
function coat(color) {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.82,
    sheen: 0.35,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0xfff6e8),
    vertexColors: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vFurPosition;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvFurPosition = position;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vFurPosition;
        float furHash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
        }
        float furNoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(furHash(i), furHash(i + vec3(1, 0, 0)), f.x),
                mix(furHash(i + vec3(0, 1, 0)), furHash(i + vec3(1, 1, 0)), f.x), f.y),
            mix(mix(furHash(i + vec3(0, 0, 1)), furHash(i + vec3(1, 0, 1)), f.x),
                mix(furHash(i + vec3(0, 1, 1)), furHash(i + vec3(1, 1, 1)), f.x), f.y),
            f.z);
        }
        // Pelo deitado no sentido do corpo: ruído esticado ao longo de z.
        float fur(vec3 p) {
          return furNoise(p * vec3(150.0, 150.0, 45.0)) * 0.6 +
            furNoise(p * vec3(40.0, 40.0, 14.0)) * 0.4;
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float blotch = furNoise(vFurPosition * 6.0);
        diffuseColor.rgb *= 0.9 + 0.12 * blotch + 0.06 * fur(vFurPosition);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        // Relevo dos pelos como bump map, pelas derivadas de tela.
        float furHeight = fur(vFurPosition) * 0.00035;
        vec2 dH = vec2(dFdx(furHeight), dFdy(furHeight));
        vec3 sigmaX = dFdx(-vViewPosition);
        vec3 sigmaY = dFdy(-vViewPosition);
        vec3 r1 = cross(sigmaY, normal);
        vec3 r2 = cross(normal, sigmaX);
        float det = dot(sigmaX, r1) * faceDirection;
        vec3 grad = sign(det) * (dH.x * r1 + dH.y * r2);
        normal = normalize(abs(det) * normal - grad);`,
      );
  };
  material.customProgramCacheKey = () => "agrotab-coat";
  return material;
}

export function createMaterials(lampOff) {
  const textures = {
    road: roadTexture(),
    soil: soilTexture(),
    grille: grilleTexture(),
    vent: ventTexture(),
    decal: decalTexture(),
    plank: plankTexture(),
    strawSide: strawSide(),
    strawEnd: strawEnd(),
    pasture: pastureTexture(),
    contact: radialTexture("rgba(0,0,0,1)", "rgba(0,0,0,0)"),
    plaid: plaidTexture(),
    strawHat: strawHatTexture(),
    siloNormal: corrugatedNormal(8),
    roofNormal: corrugatedNormal(10, true),
  };
  textures.plank.repeat.set(0.5, 0.5);
  textures.siloNormal.repeat.set(1, 3.5);
  textures.roofNormal.repeat.set(5, 1);
  textures.strawSide.repeat.set(2, 1);
  textures.pasture.repeat.set(5, 5);
  textures.plaid.repeat.set(2, 2);
  textures.strawHat.repeat.set(6, 2);

  const standard = (color, options = {}) =>
    new THREE.MeshStandardMaterial({ color, ...options });

  const m = {
    paint: new THREE.MeshPhysicalMaterial({
      color: 0x1d6a2c,
      roughness: 0.32,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    yellow: new THREE.MeshPhysicalMaterial({
      color: 0xe4b21c,
      roughness: 0.38,
      metalness: 0.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      side: THREE.DoubleSide,
    }),
    dark: standard(0x1a1c1f, { roughness: 0.55, metalness: 0.45 }),
    black: standard(0x0b0c0e, { roughness: 0.7, metalness: 0.2 }),
    rubber: standard(0x121212, { roughness: 0.92, side: THREE.DoubleSide }),
    tireDark: standard(0x151515, { roughness: 0.95 }),
    steel: standard(0x7a8088, { roughness: 0.35, metalness: 0.9 }),
    chrome: standard(0xe3e7ec, { roughness: 0.08, metalness: 1 }),
    seat: standard(0x1c1e21, { roughness: 0.9 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x1d2a38,
      roughness: 0.04,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3,
      envMapIntensity: 2.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    lamp: standard(0x161616, {
      emissive: lampOff,
      emissiveIntensity: 1,
      roughness: 0.2,
    }),
    tail: standard(0x2a0504, {
      emissive: 0xff2414,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    }),
    amber: standard(0x3a2405, {
      emissive: 0xffa31a,
      emissiveIntensity: 0,
      roughness: 0.3,
    }),
    display: new THREE.MeshBasicMaterial({ color: 0x4fd6c0 }),
    grille: standard(0xffffff, {
      map: textures.grille,
      roughness: 0.5,
      metalness: 0.6,
    }),
    vent: standard(0xffffff, { map: textures.vent, roughness: 0.4 }),
    decal: standard(0xffffff, {
      map: textures.decal,
      transparent: true,
      roughness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      depthWrite: false,
    }),
    soil: standard(0xffffff, { map: textures.soil, roughness: 1 }),
    road: standard(0xffffff, { map: textures.road, roughness: 0.96 }),
    crop: standard(0xffffff, {
      vertexColors: true,
      roughness: 0.75,
      side: THREE.DoubleSide,
    }),
    wood: standard(0x4a3826, { roughness: 0.95 }),
    bark: standard(0x2e241b, { roughness: 1 }),
    foliage: standard(0xffffff, { roughness: 0.95, vertexColors: true }),
    insulator: standard(0x8a9aa6, { roughness: 0.3 }),
    wire: new THREE.LineBasicMaterial({
      color: 0x6c737c,
      transparent: true,
      opacity: 0.55,
    }),
    cable: new THREE.LineBasicMaterial({
      color: 0x2a3140,
      transparent: true,
      opacity: 0.85,
    }),
    lattice: new THREE.LineBasicMaterial({ color: 0x3a4456 }),
    galvanized: standard(0xa9afb7, {
      roughness: 0.55,
      metalness: 0.6,
      normalMap: textures.siloNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      side: THREE.DoubleSide,
    }),
    galvanizedPlain: standard(0xa8aeb6, { roughness: 0.4, metalness: 0.85 }),
    siloRoof: standard(0xc3c8cf, {
      roughness: 0.3,
      metalness: 0.85,
      side: THREE.DoubleSide,
    }),
    steelLight: standard(0x8d949c, { roughness: 0.45, metalness: 0.8 }),
    concrete: standard(0x77756f, { roughness: 0.95 }),
    barnWall: standard(0xffffff, { map: textures.plank, roughness: 0.85 }),
    barnTrim: standard(0xdcd8cc, { roughness: 0.8 }),
    roofMetal: standard(0x6a7078, {
      roughness: 0.4,
      metalness: 0.75,
      normalMap: textures.roofNormal,
      side: THREE.DoubleSide,
    }),
    warmWindow: standard(0x1a1f24, { roughness: 0.15, metalness: 0.4 }),
    sodium: standard(0xe8e2d0, { roughness: 0.3 }),
    pasture: standard(0xffffff, { map: textures.pasture, roughness: 1 }),
    coatWhite: coat(0xaca69b),
    coatGray: coat(0x948e84),
    coatRed: coat(0x8a5532),
    contact: new THREE.MeshBasicMaterial({
      map: textures.contact,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
    egret: standard(0xf2f0ea, { roughness: 0.6, vertexColors: true }),
    eye: new THREE.MeshPhysicalMaterial({
      color: 0x140d09,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    }),
    hoof: standard(0x1e1a17, { roughness: 0.6 }),
    shirt: standard(0xffffff, { map: textures.plaid, roughness: 0.95 }),
    jeans: standard(0x34506e, { roughness: 0.9 }),
    boots: standard(0x3a2818, { roughness: 0.7 }),
    skin: standard(0xb5835c, { roughness: 0.65 }),
    hair: standard(0x1a1410, { roughness: 0.8 }),
    straw: standard(0xffffff, {
      map: textures.strawHat,
      roughness: 0.95,
      side: THREE.DoubleSide,
    }),
    horn: standard(0x4a4036, { roughness: 0.5 }),
    haySide: standard(0xffffff, { map: textures.strawSide, roughness: 1 }),
    hayEnd: standard(0xffffff, { map: textures.strawEnd, roughness: 1 }),
    turbine: standard(0xc9ced6, { roughness: 0.55 }),
    // Serras ao longe ficam azuladas pela névoa, mais claras quanto mais longe.
    farFill: new THREE.MeshBasicMaterial({ color: 0x5f7a5c, fog: false }),
    farFillMid: new THREE.MeshBasicMaterial({ color: 0x7f9a95, fog: false }),
    farFillDeep: new THREE.MeshBasicMaterial({ color: 0xa3b8c4, fog: false }),
  };
  return { m, textures: Object.values(textures) };
}
