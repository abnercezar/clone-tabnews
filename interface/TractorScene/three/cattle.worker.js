import { bakeCattle } from "./cattleShape.js";

// Gera as malhas do gado fora da thread principal e devolve os arrays sem cópia.
self.onmessage = () => {
  const baked = bakeCattle();
  const buffers = Object.values(baked).flatMap((part) =>
    Object.values(part).map((array) => array.buffer),
  );
  self.postMessage(baked, buffers);
};
