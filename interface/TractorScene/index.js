import dynamic from "next/dynamic";
import styles from "./index.module.css";

const TractorCanvas = dynamic(() => import("./TractorCanvas"), {
  ssr: false,
});

export default function TractorScene() {
  return (
    <section className={styles.stage} aria-labelledby="tractor-scene-title">
      <TractorCanvas />
      <h2 id="tractor-scene-title" className={styles.title}>
        <span className={styles.titleMark}>AGRO</span>
        <span className={styles.titleText}>
          para quem
          <br />
          produz de verdade.
        </span>
      </h2>
      <p className={styles.hint} aria-hidden="true">
        Clique na cena para largar de novo
      </p>
    </section>
  );
}
