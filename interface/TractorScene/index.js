import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import styles from "./index.module.css";

const TractorCanvas = dynamic(() => import("./TractorCanvas"), {
  ssr: false,
});

export default function TractorScene() {
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
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
    </section>
  );
}
