// Malhas do gado (marching cubes) levam ~1s de CPU. O cálculo começa assim
// que a home monta, em paralelo com o download do three.js e a montagem da
// cena, em vez de só depois dela. O resultado é determinístico e as geometrias
// não alteram os arrays, então fica guardado para quem volta à home.
let cattlePromise = null;

function bakeInWorker() {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./three/cattle.worker.js", import.meta.url),
    );
    worker.onmessage = (event) => {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(event);
    };
    worker.postMessage("bake");
  });
}

// Sem suporte a worker, gera na thread principal.
function bakeOnMainThread() {
  return import("./three/cattleShape.js").then(({ bakeCattle }) =>
    bakeCattle(),
  );
}

export function loadCattle() {
  if (!cattlePromise) {
    let bake;
    try {
      bake = bakeInWorker();
    } catch {
      bake = bakeOnMainThread();
    }
    cattlePromise = bake.catch((error) => {
      // Falhou: a próxima visita tenta de novo.
      cattlePromise = null;
      throw error;
    });
  }
  return cattlePromise;
}
