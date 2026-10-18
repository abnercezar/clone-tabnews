import { useEffect, useRef, useState } from "react";
import {
  ActionList,
  Button,
  Heading,
  IconButton,
  Overlay,
  Spinner,
} from "@primer/react";
import { SearchIcon, XCircleFillIcon } from "@primer/octicons-react";
import classes from "./index.module.css";

const searchURL =
  (process.env.NEXT_PUBLIC_SEARCH_URL || "") +
  (process.env.NEXT_PUBLIC_SEARCH_ID || "");

const SITE_SEARCH_HOST =
  process.env.NEXT_PUBLIC_WEBSERVER_HOST || "agrotab.com.br";

export default function useSearchBox() {
  const [isOpen, setIsOpen] = useState(false);
  const returnFocusRef = useRef(null);

  function onClickSearchButton(event) {
    returnFocusRef.current = event.currentTarget;
    setIsOpen(true);
  }

  useEffect(() => {
    const TYPING_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

    function handleKeyDown(event) {
      if (event.key !== "/") {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const activeElement = document.activeElement;
      const isTyping =
        TYPING_TAGS.includes(activeElement?.tagName) ||
        activeElement?.isContentEditable;

      if (isTyping) {
        return;
      }

      event.preventDefault();
      returnFocusRef.current = activeElement;
      setIsOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function SearchIconButton(props) {
    return (
      <IconButton
        aria-label="Pesquisar"
        onClick={onClickSearchButton}
        variant="invisible"
        className={classes.searchIconButton}
        icon={SearchIcon}
        size="small"
        {...props}
      />
    );
  }

  function SearchBarButton(props) {
    return (
      <Button
        onClick={onClickSearchButton}
        alignContent="start"
        className={classes.searchBarButton}
        leadingVisual={SearchIcon}
        {...props}
      >
        Pesquisar
      </Button>
    );
  }

  function SearchBarMenuItem(props) {
    return (
      <ActionList.Item onSelect={onClickSearchButton} {...props}>
        <ActionList.LeadingVisual>
          <SearchIcon />
        </ActionList.LeadingVisual>
        Pesquisar
      </ActionList.Item>
    );
  }

  function SearchBoxOverlay() {
    const [isLoading, setIsLoading] = useState(Boolean(searchURL));
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const [fallbackQuery, setFallbackQuery] = useState("");

    function handleClose() {
      setIsOpen(false);
      setFallbackQuery("");
      if (searchURL) {
        clearGoogleBox();
      }
    }

    function handleFallbackSubmit(event) {
      event.preventDefault();
      const term = fallbackQuery.trim();
      handleClose();
      if (!term) {
        return;
      }
      const url = `https://www.google.com/search?q=${encodeURIComponent(
        `site:${SITE_SEARCH_HOST} ${term}`,
      )}`;
      window.open(url, "_self");
    }

    if (!isOpen) {
      return null;
    }

    return (
      <Overlay
        returnFocusRef={returnFocusRef}
        ignoreClickRefs={
          suggestionsRef.current ? [suggestionsRef, returnFocusRef] : undefined
        }
        onEscape={handleClose}
        onClickOutside={handleClose}
        aria-labelledby="search-title"
        top={32}
        left="50vw"
        anchorSide="inside-center"
        className={classes.overlay}
      >
        <div
          className={isLoading ? classes.scrollAreaLoading : classes.scrollArea}
        >
          <div className={classes.header}>
            <Heading as="h2" id="search-title" className={classes.title}>
              Pesquisar com o Google
            </Heading>
            <IconButton
              icon={XCircleFillIcon}
              variant="invisible"
              aria-label="Fechar pesquisa"
              onClick={handleClose}
            />
          </div>

          {searchURL ? (
            <GoogleBox
              onInputRender={(input) => {
                setIsLoading(false);
                input.focus();
                inputRef.current = input;
                input.setAttribute("enterkeyhint", "search");
              }}
              onSuggestionsRender={(suggestionsBox) => {
                suggestionsRef.current = suggestionsBox;
              }}
            />
          ) : (
            <form
              className={classes.fallbackForm}
              onSubmit={handleFallbackSubmit}
            >
              <input
                className={classes.fallbackInput}
                autoFocus
                value={fallbackQuery}
                onChange={(event) => setFallbackQuery(event.target.value)}
                placeholder="Buscar em agrotab.com.br…"
                aria-label="Termo de pesquisa"
              />
              <Button type="submit" variant="primary">
                Pesquisar
              </Button>
            </form>
          )}

          {searchURL && (
            <div className={classes.spinnerWrapper}>
              {isLoading && <Spinner size="medium" />}
            </div>
          )}
        </div>

        {searchURL && (
          <style jsx global>{`
            .gsc-input-box {
              border-radius: 6px !important;
            }
            .gsc-search-button-v2 {
              border-radius: 6px !important;
              cursor: pointer;
              padding: 8px !important;
              background-color: #21262d !important;
            }
            .gsc-input {
              color-scheme: light !important;
            }
            .gssb_c {
              color: #444444;
              left: max(calc(5vw + 16px), calc(50vw - 434px)) !important;
            }
          `}</style>
        )}
      </Overlay>
    );
  }

  return {
    SearchBarButton,
    SearchBarMenuItem,
    SearchBoxOverlay,
    SearchIconButton,
  };
}

function GoogleBox({
  onInputRender = () => {},
  onSuggestionsRender = () => {},
}) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = searchURL;
    document.head.append(script);

    const waitInputBox = waitForElm(".gsc-input-box");
    const waitSuggestionBox = waitForElm(".gssb_c");
    const waitAboveResultsBox = waitForElm(".gsc-above-wrapper-area");

    (async () => {
      const inputBox = await waitInputBox.start();
      const input = inputBox.querySelector("input");
      onInputRender(input);

      const suggestionBox = await waitSuggestionBox.start();
      onSuggestionsRender(suggestionBox);
    })();

    (async () => {
      const aboveResultsBox = await waitAboveResultsBox.start();
      aboveResultsBox.style.display = "block";
    })();

    return () => {
      waitInputBox.cancel();
      waitSuggestionBox.cancel();
      waitAboveResultsBox.cancel();
    };
  }, [onInputRender, onSuggestionsRender]);

  return <div className="gcse-search" data-linktarget="_self" />;
}

function clearGoogleBox() {
  Array.from(document.getElementsByTagName("script")).forEach((elm) => {
    if (elm.src?.includes("google.com/")) {
      elm.remove();
    }
  });

  Array.from(document.getElementsByTagName("link")).forEach((elm) => {
    if (elm.href?.includes("google.com/")) {
      elm.remove();
    }
  });

  Array.from(document.getElementsByTagName("style")).forEach((elm) => {
    if (
      elm.href?.includes("google.com/") ||
      elm.textContent?.includes(".gsc-refinementsGradient") ||
      elm.textContent?.includes(".gsc-completion-container")
    ) {
      elm.remove();
    }
  });

  document.querySelectorAll(".gssb_c").forEach((elm) => elm.remove());

  let elm = document.getElementById("private_ratings");

  while (elm) {
    elm.parentElement?.remove();
    elm = document.getElementById("private_ratings");
  }
}

function waitForElm(selector) {
  let observer;

  const start = () => {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          resolve(document.querySelector(selector));
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  };

  const cancel = () => {
    if (observer) {
      observer.disconnect();
    }
  };

  return {
    cancel,
    start,
  };
}
