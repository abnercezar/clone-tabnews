import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { loadCattle } from "./cattleBake.js";
import styles from "./index.module.css";

const loadTractorCanvas = () => import("./TractorCanvas");

const TractorCanvas = dynamic(loadTractorCanvas, {
  ssr: false,
});

// Quanto a cena espera pelo gado antes de largar sem ele (ele entra depois).
const CATTLE_WAIT_MS = 2500;

export default function TractorScene() {
  const [idle, setIdle] = useState(false);
  // undefined = calculando; null = desistiu de esperar; objeto = pronto.
  const [cattle, setCattle] = useState(undefined);

  useEffect(() => {
    // O download do three.js e o cálculo do gado (em worker) começam já, sem
    // ocupar a thread principal. Só a montagem da cena, que ocupa, espera.
    loadTractorCanvas().catch(() => {});

    let active = true;
    const giveUp = window.setTimeout(() => {
      setCattle((current) => (current === undefined ? null : current));
    }, CATTLE_WAIT_MS);
    loadCattle()
      .then((baked) => {
        if (active) {
          setCattle((current) => (current === undefined ? baked : current));
        }
      })
      .catch(() => {
        if (active) {
          setCattle((current) => (current === undefined ? null : current));
        }
      });

    return () => {
      active = false;
      window.clearTimeout(giveUp);
    };
  }, []);

  useEffect(() => {
    // Espera a página ficar ociosa: título, feed e ações carregam primeiro.
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setIdle(true), {
        timeout: 2500,
      });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setIdle(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  // Com o gado pronto, a cena compila os shaders uma vez e já aparece
  // completa, em vez de renderizar invisível e recompilar quando ele chega.
  const ready = idle && cattle !== undefined;

  return (
    <section
      className={styles.stage}
      aria-label="Cena de um trator saindo para a lavoura"
    >
      <Head>
        <link rel="preload" as="image" href="/cena-trator.jpg" />
      </Head>
      {ready && <TractorCanvas cattle={cattle} />}
    </section>
  );
}
