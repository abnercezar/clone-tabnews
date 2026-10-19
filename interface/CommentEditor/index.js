import { useEffect, useRef, useState } from "react";
import { Editor } from "@bytemd/react";
import locale from "bytemd/locales/pt_BR.json";
import { markdownPlugins } from "interface/markdownPlugins";
import "bytemd/dist/index.css";
import "katex/dist/katex.css";
import "highlight.js/styles/github.css";
import styles from "./index.module.css";

export default function CommentEditor({
  value,
  onChange,
  mode = "split",
  initialHeight = "30vh",
  isInvalid = false,
  autofocus = true,
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
        plugins={markdownPlugins}
        locale={locale}
        mode={mode}
        placeholder=""
        onChange={onChange}
        editorConfig={{
          autofocus,
          autocapitalize: "sentences",
          inputStyle: "contenteditable",
          spellcheck: true,
        }}
      />
    </div>
  );
}
