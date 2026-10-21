import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  ActionList,
  Button,
  Heading,
  IconButton,
  Link,
  Overlay,
  Spinner,
} from "@primer/react";
import { SearchIcon, XCircleFillIcon } from "@primer/octicons-react";
import { createExcerpt } from "interface/excerpt";
import classes from "./index.module.css";

const searchId = (process.env.NEXT_PUBLIC_SEARCH_ID || "").trim();
const searchURL = searchId
  ? `${process.env.NEXT_PUBLIC_SEARCH_URL || "https://cse.google.com/cse.js?cx="}${searchId}`
  : "";

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
        top={72}
        left="50vw"
        anchorSide="inside-center"
        className={classes.overlay}
      >
        <div
          className={isLoading ? classes.scrollAreaLoading : classes.scrollArea}
        >
          <div className={classes.header}>
            <Heading as="h2" id="search-title" className={classes.title}>
              {searchURL ? "Pesquisar com o Google" : "Pesquisar"}
            </Heading>
            <IconButton
              icon={XCircleFillIcon}
              variant="invisible"
              aria-label="Fechar pesquisa"
              onClick={handleClose}
              className={classes.closeButton}
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
            <AgroSearch
              query={fallbackQuery}
              onQueryChange={setFallbackQuery}
              onNavigate={handleClose}
            />
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

function AgroSearch({ query, onQueryChange, onNavigate }) {
  const router = useRouter();
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setResults(null);
      setErrorMessage(null);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams({
          q: term,
          per_page: "8",
          strategy: "new",
        });
        const response = await fetch(`/api/v1/contents?${params}`, {
          signal: abortController.signal,
        });

        const payload = await response.json();

        if (!response.ok || !Array.isArray(payload)) {
          setResults([]);
          setErrorMessage("Não foi possível pesquisar agora.");
          return;
        }

        setResults(payload);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setResults([]);
        setErrorMessage("Não foi possível conectar ao servidor.");
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [query]);

  const term = query.trim();
  const list = Array.isArray(results) ? results : [];

  return (
    <form
      className={classes.fallbackForm}
      onSubmit={(event) => event.preventDefault()}
    >
      <div className={classes.searchRow}>
        <input
          className={classes.fallbackInput}
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Pesquisar no AgroTab"
          aria-label="Termo de pesquisa"
          enterKeyHint="search"
        />
        <button
          type="submit"
          className={classes.searchButton}
          aria-label="Pesquisar"
        >
          <SearchIcon size={16} />
        </button>
      </div>

      {isSearching && <p className={classes.status}>Pesquisando…</p>}

      {errorMessage && <p className={classes.empty}>{errorMessage}</p>}

      {results && list.length === 0 && !isSearching && !errorMessage && (
        <p className={classes.empty}>
          Nenhuma publicação encontrada para “{term}”.
        </p>
      )}

      {list.length > 0 && (
        <ul className={classes.results}>
          {list.map((content) => {
            const href = `/${content.owner_username}/${content.slug}`;
            const excerpt = createExcerpt(content.body, 140);
            const showExcerpt = excerpt && excerpt !== content.title;

            return (
              <li key={content.id}>
                <Link
                  href={href}
                  className={classes.resultLink}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate();
                    router.push(href);
                  }}
                >
                  <span className={classes.resultTitle}>{content.title}</span>
                  <span className={classes.resultPath}>{href}</span>
                  {showExcerpt && (
                    <span className={classes.resultSnippet}>{excerpt}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
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
