import * as THREE from "three";

// Cone de luz dos faróis: some na ponta e nas bordas, como poeira iluminada.
export function createBeam(length, radius, color) {
  const geometry = new THREE.ConeGeometry(radius, length, 32, 1, true);
  geometry.translate(0, -length / 2, 0);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: 0 },
      uLength: { value: length },
    },
    vertexShader: `
      uniform float uLength;
      varying float vFade;
      varying float vEdge;
      void main() {
        vFade = 1.0 - clamp(length(position) / uLength, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vEdge = pow(abs(dot(n, normalize(-mv.xyz))), 2.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      varying float vFade;
      varying float vEdge;
      void main() {
        float a = vFade * vFade * vEdge * uPower;
        gl_FragColor = vec4(uColor * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geometry, material);
}

// Poeira usa mistura normal (é opaca, escurece o que está atrás);
// mariposas usam mistura aditiva porque brilham na luz do farol.
export function createParticles(count, texture, color, additive = true) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(count * 3), 3),
  );
  geometry.setAttribute(
    "aAlpha",
    new THREE.BufferAttribute(new Float32Array(count), 1),
  );
  geometry.setAttribute(
    "aSize",
    new THREE.BufferAttribute(new Float32Array(count), 1),
  );

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uColor: { value: new THREE.Color(color) },
      uScale: { value: 400 },
    },
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      uniform float uScale;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
        vAlpha = aAlpha;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
        gl_FragColor = ${additive ? "vec4(uColor * a, a)" : "vec4(uColor, a)"};
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

// Céu de dia: azul que clareia no horizonte, halo do sol e nuvens de bom tempo.
export function createSky(radius, colors, sunDirection) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(colors.top) },
      uHorizon: { value: new THREE.Color(colors.horizon) },
      uSun: { value: sunDirection.clone().normalize() },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSun;
      uniform float uTime;
      varying vec3 vDirection;

      float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
          mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p = p * 2.03 + vec2(1.7, 9.2);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec3 d = normalize(vDirection);
        float h = d.y;
        vec3 color = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.55, h), 0.7));
        if (h < 0.0) {
          color = uHorizon * 0.92;
        }

        float sun = max(dot(d, uSun), 0.0);
        color += vec3(1.0, 0.9, 0.7) * (pow(sun, 8.0) * 0.25 + pow(sun, 64.0) * 0.6);
        color += vec3(1.0, 0.97, 0.9) * smoothstep(0.9993, 0.9997, sun) * 8.0;

        // Nuvens projetadas num teto plano: ficam menores perto do horizonte.
        if (h > 0.01) {
          vec2 uv = d.xz / (h + 0.08) * 1.4 + vec2(uTime * 0.012, 0.0);
          float shape = fbm(uv * 0.9);
          float cover = smoothstep(0.52, 0.78, shape);
          float shade = fbm(uv * 0.9 + uSun.xz * 0.12);
          vec3 cloud = mix(vec3(0.62, 0.66, 0.74), vec3(1.0), smoothstep(0.35, 0.75, cover - shade * 0.35 + 0.3));
          cloud += vec3(1.0, 0.92, 0.8) * pow(sun, 6.0) * 0.4;
          float fade = smoothstep(0.01, 0.18, h);
          color = mix(color, cloud, cover * fade * 0.9);
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    material,
  );
  sky.renderOrder = -2;
  return sky;
}

// Acabamento de câmera: aberração leve nas bordas, grão fino e vinheta.
export const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.0012 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    varying vec2 vUv;

    float random(vec2 point) {
      return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 fromCenter = vUv - 0.5;
      float distanceToCenter = length(fromCenter);
      vec2 offset = fromCenter * uAberration * (0.4 + distanceToCenter * 2.0);

      vec4 base = texture2D(tDiffuse, vUv);
      vec3 color = vec3(
        texture2D(tDiffuse, vUv + offset).r,
        base.g,
        texture2D(tDiffuse, vUv - offset).b
      );

      color += (random(vUv * 913.0 + fract(uTime)) - 0.5) * 0.018;
      color *= mix(1.0, smoothstep(0.95, 0.3, distanceToCenter), 0.55);

      gl_FragColor = vec4(color, base.a);
    }
  `,
};
