import { credentialText } from "models/profile.js";
import classes from "./index.module.css";

// Ao lado do nome: "Agrônomo · GO" e o selo de membro fundador.
export default function AuthorCredential({ occupation, state, founder }) {
  const text = credentialText({ occupation, state });

  if (!text && !founder) {
    return null;
  }

  return (
    <>
      {text && <span className={classes.credential}>{text}</span>}
      {founder && (
        <span className={classes.founder} title="Membro fundador do AgroTab">
          Membro fundador
        </span>
      )}
    </>
  );
}
