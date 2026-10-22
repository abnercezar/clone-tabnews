import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Button,
  Flash,
  IconButton,
  ProgressBar,
  SegmentedControl,
  Text,
  Tooltip,
} from "@primer/react";
import {
  BoldIcon,
  EyeIcon,
  ImageIcon,
  LinkIcon,
  ListUnorderedIcon,
  PencilIcon,
} from "@primer/octicons-react";
import {
  MAX_PHOTOS_PER_POST,
  compressPhoto,
  countUploadedPhotos,
  uploadPhoto,
} from "interface/photoUpload";
import classes from "./index.module.css";

const CommentEditor = dynamic(() => import("interface/CommentEditor"), {
  ssr: false,
});
const MarkdownViewer = dynamic(() => import("interface/MarkdownViewer"), {
  ssr: false,
});

const MODE_KEY = "agrotab:editor:modo";

function readMode() {
  try {
    return localStorage.getItem(MODE_KEY) === "markdown"
      ? "markdown"
      : "simples";
  } catch {
    return "simples";
  }
}

function writeMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Sem armazenamento, a escolha vale só nesta página.
  }
}

// Editor padrão: caixa de texto com barra de negrito, lista, link e foto.
// O texto continua sendo Markdown (mesmo formato salvo de sempre); quem já
// conhece pode trocar para o editor completo.
export default function ContentEditor({
  value,
  onChange,
  initialHeight = "30vh",
  isInvalid = false,
  autofocus = true,
  label,
  placeholder = "",
}) {
  const [mode, setMode] = useState("simples");
  const [uploads, setUploads] = useState([]);
  const [photoError, setPhotoError] = useState(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    setMode(readMode());
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    writeMode(nextMode);
  }

  const photosUsed = countUploadedPhotos(value) + uploads.length;
  const photosLeft = Math.max(0, MAX_PHOTOS_PER_POST - photosUsed);

  async function sendPhotos(files) {
    setPhotoError(null);
    const selected = Array.from(files || []).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (selected.length === 0) {
      return [];
    }

    const accepted = selected.slice(0, photosLeft);
    if (accepted.length < selected.length) {
      setPhotoError(
        `Cada publicação aceita até ${MAX_PHOTOS_PER_POST} fotos. ${
          accepted.length === 0
            ? "Remova uma foto para adicionar outra."
            : `Enviando só ${accepted.length}.`
        }`,
      );
    }

    const results = await Promise.all(
      accepted.map(async (file) => {
        const id = `${file.name}-${Math.random().toString(36).slice(2)}`;
        setUploads((current) => [
          ...current,
          { id, name: file.name, progress: 0 },
        ]);

        try {
          const blob = await compressPhoto(file);
          const url = await uploadPhoto(blob, {
            onProgress: (progress) =>
              setUploads((current) =>
                current.map((upload) =>
                  upload.id === id ? { ...upload, progress } : upload,
                ),
              ),
          });
          return { url, alt: "foto" };
        } catch (error) {
          setPhotoError(error.message);
          return null;
        } finally {
          setUploads((current) => current.filter((upload) => upload.id !== id));
        }
      }),
    );

    return results.filter(Boolean);
  }

  return (
    <div className={classes.wrapper}>
      <div className={classes.modeBar}>
        <SegmentedControl
          aria-label="Tipo de editor"
          size="small"
          onChange={(index) => changeMode(index === 0 ? "simples" : "markdown")}
        >
          <SegmentedControl.Button selected={mode === "simples"}>
            Simples
          </SegmentedControl.Button>
          <SegmentedControl.Button selected={mode === "markdown"}>
            Markdown (avançado)
          </SegmentedControl.Button>
        </SegmentedControl>
      </div>

      {mode === "simples" ? (
        <SimpleEditor
          value={value}
          onChange={onChange}
          valueRef={valueRef}
          initialHeight={initialHeight}
          isInvalid={isInvalid}
          autofocus={autofocus}
          label={label}
          placeholder={placeholder}
          photosLeft={photosLeft}
          sendPhotos={sendPhotos}
        />
      ) : (
        <CommentEditor
          value={value}
          onChange={onChange}
          initialHeight={initialHeight}
          isInvalid={isInvalid}
          autofocus={autofocus}
          uploadImages={sendPhotos}
        />
      )}

      {uploads.map((upload) => (
        <div key={upload.id} className={classes.upload} role="status">
          <Text className={classes.uploadLabel}>
            Enviando foto… {upload.progress}%
          </Text>
          <ProgressBar
            progress={upload.progress}
            aria-label={`Envio da foto ${upload.name}`}
          />
        </div>
      ))}

      {photoError && (
        <Flash variant="warning" role="alert">
          {photoError}
        </Flash>
      )}
    </div>
  );
}

function SimpleEditor({
  value,
  onChange,
  valueRef,
  initialHeight,
  isInvalid,
  autofocus,
  label,
  placeholder,
  photosLeft,
  sendPhotos,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const textareaId = useId();

  // Troca o trecho selecionado e devolve o cursor para dentro do texto novo.
  function replaceSelection(build) {
    const textarea = textareaRef.current;
    const current = valueRef.current;
    const start = textarea ? textarea.selectionStart : current.length;
    const end = textarea ? textarea.selectionEnd : current.length;
    const selected = current.slice(start, end);
    const { text, selectFrom, selectTo } = build(selected, start);
    const next = current.slice(0, start) + text + current.slice(end);
    onChange(next);

    window.requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        start + (selectFrom ?? text.length),
        start + (selectTo ?? text.length),
      );
    });
  }

  function handleBold() {
    replaceSelection((selected) => {
      const inner = selected || "texto em negrito";
      return {
        text: `**${inner}**`,
        selectFrom: 2,
        selectTo: 2 + inner.length,
      };
    });
  }

  function handleList() {
    replaceSelection((selected, start) => {
      const atLineStart = start === 0 || valueRef.current[start - 1] === "\n";
      const lines = (selected || "item").split("\n");
      const text =
        (atLineStart ? "" : "\n") +
        lines.map((line) => `- ${line.replace(/^\s*[-*]\s+/, "")}`).join("\n");
      return { text };
    });
  }

  function handleLink() {
    const address = window.prompt("Cole o endereço do link (https://...)");
    if (!address) {
      return;
    }
    const url = /^https?:\/\//i.test(address.trim())
      ? address.trim()
      : `https://${address.trim()}`;

    replaceSelection((selected) => {
      const inner = selected || "texto do link";
      return {
        text: `[${inner}](${url})`,
        selectFrom: 1,
        selectTo: 1 + inner.length,
      };
    });
  }

  async function handleFiles(event) {
    const files = event.target.files;
    const uploaded = await sendPhotos(files);
    event.target.value = "";

    if (uploaded.length === 0) {
      return;
    }

    const markdown = uploaded
      .map((photo) => `![${photo.alt}](${photo.url})`)
      .join("\n\n");

    // A foto entra no fim do texto atual: o envio pode ter levado um tempo
    // e a pessoa ter continuado escrevendo.
    const current = valueRef.current;
    const separator = current && !current.endsWith("\n\n") ? "\n\n" : "";
    onChange(`${current}${separator}${markdown}\n`);
  }

  return (
    <div
      className={[classes.simple, isInvalid ? classes.isInvalid : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={classes.toolbar} role="toolbar" aria-label="Formatação">
        <Tooltip text="Negrito" direction="n">
          <IconButton
            type="button"
            icon={BoldIcon}
            aria-label="Negrito"
            variant="invisible"
            onClick={handleBold}
            disabled={showPreview}
          />
        </Tooltip>
        <Tooltip text="Lista" direction="n">
          <IconButton
            type="button"
            icon={ListUnorderedIcon}
            aria-label="Lista"
            variant="invisible"
            onClick={handleList}
            disabled={showPreview}
          />
        </Tooltip>
        <Tooltip text="Link" direction="n">
          <IconButton
            type="button"
            icon={LinkIcon}
            aria-label="Link"
            variant="invisible"
            onClick={handleLink}
            disabled={showPreview}
          />
        </Tooltip>
        <Button
          type="button"
          variant="invisible"
          leadingVisual={ImageIcon}
          onClick={() => fileInputRef.current?.click()}
          disabled={showPreview || photosLeft === 0}
        >
          Foto
        </Button>
        {/* Sem `capture`: o celular oferece câmera e galeria. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFiles}
        />
        <span className={classes.toolbarSpacer} />
        <Button
          type="button"
          variant="invisible"
          size="small"
          leadingVisual={showPreview ? PencilIcon : EyeIcon}
          onClick={() => setShowPreview(!showPreview)}
          aria-pressed={showPreview}
        >
          {showPreview ? "Escrever" : "Ver como fica"}
        </Button>
      </div>

      {showPreview ? (
        <div className={classes.preview} style={{ minHeight: initialHeight }}>
          {value.trim() ? (
            <MarkdownViewer value={value} rich />
          ) : (
            <Text className={classes.muted}>Nada escrito ainda.</Text>
          )}
        </div>
      ) : (
        <textarea
          id={textareaId}
          ref={textareaRef}
          className={classes.textarea}
          style={{ minHeight: initialHeight }}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus={autofocus}
          autoCapitalize="sentences"
          spellCheck
          aria-label={label}
          aria-invalid={isInvalid || undefined}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
