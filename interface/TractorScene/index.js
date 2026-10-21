import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import styles from "./index.module.css";

const TractorCanvas = dynamic(() => import("./TractorCanvas"), {
  ssr: false,
});

// O 3D só entra em tela larga, sem economia de dados e com memória folgada.
// Nos outros casos fica a foto da cena: mesmo visual, sem o peso do three.js.
function canRun3D() {
  if (!window.matchMedia("(min-width: 768px)").matches) {
    return false;
  }
  const connection = navigator.connection;
  if (connection?.saveData) {
    return false;
  }
  if (
    typeof navigator.deviceMemory === "number" &&
    navigator.deviceMemory < 4
  ) {
    return false;
  }
  return true;
}

export default function TractorScene() {
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    if (!canRun3D()) {
      return undefined;
    }
    // Espera a página ficar ociosa: título, feed e ações carregam primeiro.
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setEnhanced(true), {
        timeout: 2500,
      });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setEnhanced(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section
      className={styles.stage}
      aria-label="Cena de um trator saindo para a lavoura"
    >
      <Head>
        <link rel="preload" as="image" href="/cena-trator.jpg" />
      </Head>
      {enhanced && <TractorCanvas />}
      {/* Slogan decorativo: a mensagem principal da página é o h1 abaixo. */}
      <p className={styles.title} aria-hidden="true">
        <span className={styles.titleMark}>AGRO</span>
        <span className={styles.titleText}>
          para quem
          <br />
          produz de verdade.
        </span>
      </p>
      <p className={styles.hint} aria-hidden="true">
        Clique na cena para largar de novo
      </p>
    </section>
  );
}
