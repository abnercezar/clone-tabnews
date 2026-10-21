import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function hash(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function at(object, x, y, z) {
  object.position.set(x, y, z);
  return object;
}

// Malha que projeta e recebe sombra, como toda peça sólida da cena.
export function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const node = new THREE.Mesh(geometry, material);
  node.castShadow = cast;
  node.receiveShadow = receive;
  return node;
}

export function merge(geometries) {
  const prepared = geometries.map((geometry) =>
    geometry.index ? geometry.toNonIndexed() : geometry,
  );
  prepared.forEach((geometry) => {
    geometry.deleteAttribute("uv1");
    geometry.deleteAttribute("uv2");
  });
  const merged = mergeGeometries(prepared, false);
  geometries.forEach((geometry) => geometry.dispose());
  prepared.forEach((geometry) => geometry.dispose());
  return merged;
}

const UP = new THREE.Vector3(0, 1, 0);

// Tubo reto ligando dois pontos: barras, treliças, cabos grossos.
export function rod(a, b, radius, sides = 6) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    direction.length(),
    sides,
    1,
    false,
  );
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()),
  );
  const middle = start.add(end).multiplyScalar(0.5);
  geometry.translate(middle.x, middle.y, middle.z);
  return geometry;
}

// Perfil desenhado de lado (u = frente, v = altura) e extrudado na largura.
export function sideExtrude(shape, width, options = {}) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: false,
    curveSegments: 12,
    ...options,
  });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(width / 2, 0, 0);
  return geometry;
}

// Curva de um cabo pendurado entre dois pontos.
export function catenary(a, b, sag, segments = 16) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const k = i / segments;
    points.push(
      new THREE.Vector3(
        THREE.MathUtils.lerp(a[0], b[0], k),
        THREE.MathUtils.lerp(a[1], b[1], k) - sag * 4 * k * (1 - k),
        THREE.MathUtils.lerp(a[2], b[2], k),
      ),
    );
  }
  return points;
}

export function linePairs(pairs, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(pairs.flat(), 3),
  );
  return new THREE.LineSegments(geometry, material);
}

export function canvasTexture(width, height, draw, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = options.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

// Mapa de normais de chapa ondulada: o brilho corre nas ondas como no aço real.
export function corrugatedNormal(waves, vertical = false) {
  return canvasTexture(
    256,
    256,
    (context, width, height) => {
      const image = context.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const along = vertical ? x / width : y / height;
          const slope = Math.cos(along * Math.PI * 2 * waves) * 0.55;
          const index = (y * width + x) * 4;
          image.data[index] = vertical ? 128 + slope * 127 : 128;
          image.data[index + 1] = vertical ? 128 : 128 + slope * 127;
          image.data[index + 2] = 255;
          image.data[index + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
    },
    { data: true },
  );
}

export function noise(context, width, height, colors, count, size = 2) {
  for (let i = 0; i < count; i++) {
    context.fillStyle = colors[i % colors.length];
    context.globalAlpha = 0.25 + hash(i * 1.37) * 0.55;
    const s = size * (0.5 + hash(i * 2.11));
    context.fillRect(hash(i * 3.71) * width, hash(i * 5.13 + 2) * height, s, s);
  }
  context.globalAlpha = 1;
}

export function radialTexture(inner, outer) {
  const size = 128;
  return canvasTexture(size, size, (context) => {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.22, inner.replace(/[\d.]+\)$/, "0.6)"));
    gradient.addColorStop(0.5, inner.replace(/[\d.]+\)$/, "0.14)"));
    gradient.addColorStop(1, outer);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}

export function glow(texture, color, size, opacity = 1) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  sprite.scale.set(size, size, 1);
  return sprite;
}
