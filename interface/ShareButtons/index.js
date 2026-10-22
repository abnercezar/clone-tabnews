import { useState } from "react";
import { Button, Tooltip } from "@primer/react";
import { ShareIcon } from "@primer/octicons-react";
import webserver from "infra/webserver";
import { whatsappShareHref } from "interface/whatsappShare";
import classes from "./index.module.css";

// Endereço canônico: o mesmo no HTML do servidor e no navegador, então o
// link do WhatsApp funciona antes de o JavaScript carregar.
function contentUrl(username, slug) {
  return `${webserver.canonicalOrigin}/${username}/${slug}`;
}

export default function ShareButtons({ username, slug, title, compact }) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleShare() {
    const url = contentUrl(username, slug);
    const shareTitle = title || "AgroTab";

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url });
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <>
      <a
        className={classes.whatsapp}
        href={whatsappShareHref({ title, url: contentUrl(username, slug) })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={compact ? "Compartilhar no WhatsApp" : undefined}
      >
        <WhatsappIcon />
        <span>{compact ? "WhatsApp" : "Compartilhar no WhatsApp"}</span>
      </a>
      <Tooltip text="Compartilhar ou copiar link" direction="n">
        <Button
          onClick={handleShare}
          aria-label={
            isCopied ? "Link copiado!" : "Compartilhar ou copiar link"
          }
        >
          {isCopied ? (
            <span className={classes.copied} role="status">
              Link copiado!
            </span>
          ) : (
            <ShareIcon size={16} aria-hidden="true" />
          )}
        </Button>
      </Tooltip>
    </>
  );
}

function WhatsappIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.6-.3Z" />
    </svg>
  );
}
