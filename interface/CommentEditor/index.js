import { useEffect, useRef, useState } from "react";
import { Editor } from "@bytemd/react";
import breaks from "@bytemd/plugin-breaks";
import gemoji from "@bytemd/plugin-gemoji";
import gfm from "@bytemd/plugin-gfm";
import gfmLocale from "@bytemd/plugin-gfm/locales/pt_BR.json";
import highlightSsr from "@bytemd/plugin-highlight-ssr";
import math from "@bytemd/plugin-math";
import mathLocale from "@bytemd/plugin-math/locales/pt_BR.json";
import mermaid from "@bytemd/plugin-mermaid";
import mermaidLocale from "@bytemd/plugin-mermaid/locales/pt_BR.json";
import locale from "bytemd/locales/pt_BR.json";
import "bytemd/dist/index.css";
import "katex/dist/katex.css";
import styles from "./index.module.css";

const plugins = [
  gfm({ locale: gfmLocale }),
  highlightSsr(),
  math({ locale: mathLocale }),
  breaks(),
  gemoji(),
  mermaid({ locale: mermaidLocale }),
];

export default function CommentEditor({
  value,
  onChange,
  mode = "split",
  initialHeight = "30vh",
  isInvalid = false,
}) {
  const editorRef = useRef(null);
  const [isWriteOnly, setIsWriteOnly] = useState(mode === "split");

  useEffect(() => {
    const editorPane = editorRef.current?.querySelector(".bytemd-editor");

    if (!editorPane) {
      return;
    }

    // Enquanto o bytemd mantém 50% em cada painel, seguimos no layout write-only
    // (como no TabNews) para não forçar o modo "write" e puxar o scroll da página.
    const observer = new MutationObserver(() => {
      if (editorPane.style.cssText.includes("50%")) {
        return;
      }

      observer.disconnect();
      setIsWriteOnly(false);
    });

    observer.observe(editorPane, { attributeFilter: ["style"] });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={editorRef}
      className={[
        styles.editor,
        isInvalid ? styles.isInvalid : "",
        isWriteOnly ? styles.isWriteOnly : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--bytemd-body-height": initialHeight }}
    >
      <Editor
        value={value}
        plugins={plugins}
        locale={locale}
        mode={mode}
        placeholder=""
        onChange={onChange}
        editorConfig={{
          autofocus: true,
          autocapitalize: "sentences",
          inputStyle: "contenteditable",
          spellcheck: true,
        }}
      />
    </div>
  );
}
