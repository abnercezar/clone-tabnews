import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { animateHerd } from "./three/cattle.js";
import { animateDriver } from "./three/driver.js";
import { FinishShader, createParticles, createSky } from "./three/effects.js";
import { radialTexture } from "./three/helpers.js";
import { createMaterials } from "./three/materials.js";
import { buildTractor } from "./three/tractor.js";
import {
  FAR_Z,
  SPAN,
  buildGround,
  buildHorizon,
  buildScenery,
  buildTurbines,
} from "./three/world.js";
import styles from "./index.module.css";

const FOG = 0xb9cad8;
const SPEED = 6;
const GO_AT = 1.2;
const READY_AT = GO_AT + 3;
const TRACTOR_Z = 1.4;
const DUST_COUNT = 320;

const HEAD_OFF = new THREE.Color(0x2a2418);
const HEAD_ON = new THREE.Color(0xfff3d6);
// Sol de meio da manhã à esquerda, um pouco à frente: ilumina a frente do
// trator e joga as sombras para a direita da estrada.
const SUN_DIRECTION = new THREE.Vector3(-0.62, 0.62, 0.48).normalize();
const SHADOW_CENTER = new THREE.Vector3(1, 0, -14);

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function easeInOut(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function lightPower(t) {
  const since = t - GO_AT;
  if (since < 0) {
    return 0;
  }
  const flicker = [1, 0.12, 1, 0.35, 0.9, 1];
  const step = Math.floor(since / 0.07);
  return step < flicker.length ? flicker[step] : 1;
}

function speedAt(t) {
  const since = t - GO_AT;
  if (since <= 0) {
    return 0;
  }
  const k = clamp01(since / 2.2);
  return SPEED * (1 - Math.pow(1 - k, 3));
}

export default function TractorCanvas() {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage) {
      return undefined;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return undefined;
    }

    let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(FOG, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(FOG, 0.011);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

    const { m, textures } = createMaterials(HEAD_OFF);
    const glowMap = radialTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)");
    const shadowMap = radialTexture("rgba(0,0,0,1)", "rgba(0,0,0,0)");

    const skyColors = { top: 0x2f6fc4, horizon: FOG };
    const sky = createSky(130, skyColors, SUN_DIRECTION);
    scene.add(sky);
    scene.add(buildHorizon(m));
    const windFarm = buildTurbines(m, glowMap);
    scene.add(windFarm.group);

    // Reflexos da pintura e dos vidros vêm do próprio céu, com o sol.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const envSky = createSky(50, skyColors, SUN_DIRECTION);
    const envGround = new THREE.Mesh(
      new THREE.CircleGeometry(50, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4a4430 }),
    );
    envGround.position.y = -2;
    envScene.add(envSky, envGround);
    const environment = pmrem.fromScene(envScene, 0.02);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.9;
    [envSky, envGround].forEach((node) => {
      node.geometry.dispose();
      node.material.dispose();
    });

    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x5a4a32, 1.1));
    const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
    sun.position.copy(SUN_DIRECTION).multiplyScalar(80).add(SHADOW_CENTER);
    sun.target.position.copy(SHADOW_CENTER);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -34;
    sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -34;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 160;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);

    const ground = buildGround(m);
    scene.add(ground.group);

    const scenery = buildScenery(m);
    scenery.items.forEach(({ node }) => scene.add(node));

    const tractor = buildTractor(m, glowMap);
    tractor.group.position.z = TRACTOR_Z;
    scene.add(tractor.group);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 4.6),
      new THREE.MeshBasicMaterial({
        map: shadowMap,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.02, TRACTOR_Z);
    scene.add(contactShadow);

    const dust = createParticles(DUST_COUNT, glowMap, 0xb59c78, false);
    const dustState = Array.from({ length: DUST_COUNT }, () => ({
      age: 0,
      life: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 0,
    }));
    scene.add(dust);

    const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    const composer = new EffectComposer(renderer, renderTarget);
    composer.setPixelRatio(pixelRatio);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.35, 1.0);
    composer.addPass(bloom);
    const finish = new ShaderPass(FinishShader);
    composer.addPass(finish);
    composer.addPass(new OutputPass());

    let width = 1;
    let height = 1;

    function resize() {
      width = stage.clientWidth || 640;
      height = stage.clientHeight || 320;
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      const scale =
        (height * pixelRatio) /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      dust.material.uniforms.uScale.value = scale;
    }

    let time = 0;
    let distance = 0;
    let spawnDebt = 0;
    let phase = "";
    let sceneVisible = false;

    function setPhase(next) {
      if (!sceneVisible || phase === next) {
        return;
      }
      phase = next;
      stage.dataset.phase = next;
    }

    function restart() {
      time = 0;
      distance = 0;
      spawnDebt = 0;
      scenery.items.forEach(({ node, z0 }) => {
        node.position.z = z0;
      });
      dustState.forEach((particle) => {
        particle.age = 0;
        particle.life = 0;
      });
    }

    function updateDust(dt, speed) {
      const positions = dust.geometry.attributes.position.array;
      const alphas = dust.geometry.attributes.aAlpha.array;
      const sizes = dust.geometry.attributes.aSize.array;

      spawnDebt += dt * speed * 16;
      dustState.forEach((particle, index) => {
        if (particle.age >= particle.life && spawnDebt >= 1) {
          spawnDebt -= 1;
          const side = index % 2 === 0 ? -1 : 1;
          particle.age = 0;
          particle.life = 1.1 + Math.random() * 1.1;
          particle.vx = side * (0.3 + Math.random() * 0.9);
          particle.vy = 0.35 + Math.random() * 0.8;
          particle.vz = -speed * (0.75 + Math.random() * 0.3);
          particle.size = 0.35 + Math.random() * 0.45;
          positions[index * 3] = side * (1.15 + Math.random() * 0.25);
          positions[index * 3 + 1] = 0.12;
          positions[index * 3 + 2] = TRACTOR_Z - 1.1 + Math.random() * 0.4;
        }

        if (particle.age < particle.life) {
          particle.age += dt;
          const k = particle.age / particle.life;
          positions[index * 3] += particle.vx * dt;
          positions[index * 3 + 1] += particle.vy * dt;
          positions[index * 3 + 2] += particle.vz * dt;
          particle.vy *= 0.985;
          alphas[index] = Math.sin(Math.PI * clamp01(k)) * 0.3;
          sizes[index] = particle.size * (1 + k * 2.4);
        } else {
          alphas[index] = 0;
        }
      });
      spawnDebt = Math.min(spawnDebt, 4);

      dust.geometry.attributes.position.needsUpdate = true;
      dust.geometry.attributes.aAlpha.needsUpdate = true;
      dust.geometry.attributes.aSize.needsUpdate = true;
    }

    function update(t, dt) {
      const power = lightPower(t);
      const speed = speedAt(t);
      const motion = speed / SPEED;
      distance += speed * dt;

      ground.update(distance);
      scenery.items.forEach(({ node }) => {
        node.position.z -= speed * dt;
        if (node.position.z < FAR_Z) {
          node.position.z += SPAN;
        }
      });

      tractor.wheels.forEach(({ node, radius }) => {
        node.rotation.x = distance / radius;
      });
      // O trator segue reto na estrada: só a carroceria balança na
      // suspensão e o volante faz as correções pequenas de quem dirige.
      tractor.body.position.y =
        Math.abs(Math.sin(t * 7.5)) * 0.022 * motion +
        Math.sin(t * 1.3) * 0.004;
      tractor.body.rotation.z = Math.sin(t * 3.7) * 0.008 * motion;
      tractor.body.rotation.x = Math.sin(t * 5.1) * 0.004 * motion;
      tractor.steering.forEach((pivot) => {
        pivot.rotation.y = Math.sin(t * 0.8) * 0.025 * motion;
      });

      m.lamp.emissive.copy(HEAD_OFF).lerp(HEAD_ON, power);
      m.lamp.emissiveIntensity = 0.3 + power * 2.6;
      m.tail.emissiveIntensity = 0.4 + power * 2.2;
      tractor.headlights.forEach((sprite) => {
        sprite.material.opacity = power * 0.55;
      });
      tractor.workLights.forEach((sprite) => {
        sprite.material.opacity = power * 0.35;
      });
      tractor.beams.forEach((beam) => {
        beam.material.uniforms.uPower.value = power * 0.03;
      });
      tractor.spots[0].intensity = power * 70;
      tractor.spots[1].intensity = power * 70;
      tractor.spots[2].intensity = power * 12;
      tractor.spots[3].intensity = power * 5;

      const rotation = t * 6.5;
      const pulse =
        power > 0 ? Math.pow(Math.max(0, Math.cos(rotation)), 3) : 0;
      tractor.beacon.material.opacity = power > 0 ? 0.2 + 0.8 * pulse : 0;
      tractor.beacon.scale.setScalar(1.2 + pulse * 1.2);
      tractor.beaconLight.intensity = pulse * 5;
      m.amber.emissiveIntensity = power > 0 ? 0.2 + pulse * 6 : 0;

      windFarm.turbines.forEach((turbine) => {
        turbine.rotor.rotation.z = turbine.phase - t * 0.7;
        turbine.beacon.material.opacity =
          (t + turbine.phase) % 2.4 < 0.3 ? 1 : 0.08;
      });
      sky.material.uniforms.uTime.value = t;
      animateHerd(scenery.herds, t, scenery.egrets);
      animateDriver(tractor.driver, t, GO_AT, motion);

      if (dt > 0) {
        updateDust(dt, speed);
      }

      const intro = easeInOut(clamp01(t / (GO_AT + 0.6)));
      camera.position.set(
        Math.sin(t * 0.5) * 0.6 * (1 - intro) +
          Math.sin(t * 1.7) * 0.035 * motion,
        THREE.MathUtils.lerp(0.95, 1.75, intro) +
          Math.sin(t * 2.9) * 0.014 * motion,
        THREE.MathUtils.lerp(13.5, 9.8, intro),
      );
      camera.position.x += THREE.MathUtils.lerp(0.4, 1.1, intro);
      camera.lookAt(0.35, 1.5, -20);
      sky.position.copy(camera.position);

      finish.uniforms.uTime.value = t;

      if (t < GO_AT) {
        setPhase("intro");
      } else if (t < READY_AT) {
        setPhase("go");
      } else {
        setPhase("ready");
      }
    }

    resize();

    let raf = 0;
    let last = 0;
    let onScreen = true;
    let pageVisible = !document.hidden;
    let frameTime = 1 / 60;
    let slowFor = 0;

    function lowerQualityIfSlow(rawDt) {
      if (pixelRatio <= 1) {
        return;
      }
      frameTime += (rawDt - frameTime) * 0.1;
      slowFor = frameTime > 1 / 30 ? slowFor + rawDt : 0;
      if (slowFor > 2) {
        pixelRatio = 1;
        renderer.setPixelRatio(pixelRatio);
        composer.setPixelRatio(pixelRatio);
        resize();
      }
    }

    function loop(now) {
      if (!onScreen || !pageVisible) {
        raf = 0;
        last = 0;
        return;
      }
      const rawDt = last ? (now - last) / 1000 : 0;
      const dt = Math.min(rawDt, 0.05);
      last = now;
      if (rawDt > 0 && rawDt < 0.5) {
        lowerQualityIfSlow(rawDt);
      }
      time += dt;
      update(time, dt);
      composer.render();
      raf = window.requestAnimationFrame(loop);
    }

    function start() {
      if (raf || reduceMotion || !onScreen || !pageVisible) {
        return;
      }
      raf = window.requestAnimationFrame(loop);
    }

    let showed = false;
    let showFallback = 0;
    function showScene() {
      if (showed) {
        return;
      }
      showed = true;
      sceneVisible = true;
      window.clearTimeout(showFallback);
      if (!reduceMotion) {
        time = 0;
        distance = 0;
        last = 0;
        update(0, 0);
        composer.render();
      }
      stage.dataset.painted = "true";
    }

    if (reduceMotion) {
      time = READY_AT + 2;
      sceneVisible = true;
      update(time, 0);
      delete stage.dataset.phase;
      composer.render();
      stage.dataset.painted = "true";
      showed = true;
    } else {
      update(0, 0);
      composer.render();
    }

    function onClick() {
      if (reduceMotion) {
        return;
      }
      restart();
      update(0, 0);
    }
    canvas.addEventListener("click", onClick);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (!raf) {
        update(time, 0);
        composer.render();
      }
    });
    resizeObserver.observe(stage);

    const intersection = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        start();
      },
      { threshold: 0.05 },
    );
    intersection.observe(stage);

    function onVisibility() {
      pageVisible = !document.hidden;
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    start();

    // O gado é gerado num worker e entra na cena quando fica pronto, sem
    // travar a largada. Sem suporte a worker, gera na thread principal.
    let disposed = false;
    let cattleWorker = null;
    function receiveCattle(baked) {
      if (disposed) {
        return;
      }
      scenery.addCattle(baked);
      showScene();
    }
    try {
      cattleWorker = new Worker(
        new URL("./three/cattle.worker.js", import.meta.url),
      );
      cattleWorker.onmessage = (event) => receiveCattle(event.data);
      cattleWorker.postMessage("bake");
    } catch {
      import("./three/cattleShape.js").then(({ bakeCattle }) =>
        receiveCattle(bakeCattle()),
      );
    }

    showFallback = window.setTimeout(showScene, 2500);

    return () => {
      disposed = true;
      window.clearTimeout(showFallback);
      cattleWorker?.terminate();
      window.cancelAnimationFrame(raf);
      canvas.removeEventListener("click", onClick);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      delete stage.dataset.phase;
      delete stage.dataset.painted;

      const materials = new Set();
      scene.traverse((node) => {
        node.geometry?.dispose();
        const list = Array.isArray(node.material)
          ? node.material
          : [node.material];
        list.forEach((material) => material && materials.add(material));
      });
      materials.forEach((material) => material.dispose());
      glowMap.dispose();
      shadowMap.dispose();
      textures.forEach((texture) => texture.dispose());
      environment.dispose();
      pmrem.dispose();
      bloom.dispose();
      composer.dispose();
      renderTarget.dispose();
      renderer.dispose();
    };
  }, []);

  if (failed) {
    return (
      <p className={styles.fallback}>Seu navegador não abriu o desenho 3D.</p>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-label="Largada de um trator em 3D, de dia, numa estrada entre a lavoura de milho e o pasto com gado, silos e aerogeradores"
    />
  );
}
