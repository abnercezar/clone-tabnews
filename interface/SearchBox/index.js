import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  ActionList,
  Button,
  FormControl,
  Heading,
  IconButton,
  Overlay,
  TextInput,
} from "@primer/react";
import { SearchIcon, XCircleFillIcon } from "@primer/octicons-react";
import classes from "./index.module.css";

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
    const router = useRouter();
    const inputRef = useRef(null);
    const [query, setQuery] = useState("");

    useEffect(() => {
      if (!isOpen) {
        return;
      }
      const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
    }, []);

    function handleClose() {
      setIsOpen(false);
      setQuery("");
    }

    function handleSubmit(event) {
      event.preventDefault();
      const term = query.trim();
      handleClose();
      if (term) {
        router.push(`/?q=${encodeURIComponent(term)}`);
      } else {
        router.push("/");
      }
    }

    if (!isOpen) {
      return null;
    }

    return (
      <Overlay
        returnFocusRef={returnFocusRef}
        onEscape={handleClose}
        onClickOutside={handleClose}
        aria-labelledby="search-title"
        top={32}
        left="50vw"
        anchorSide="inside-center"
        className={classes.overlay}
      >
        <div className={classes.scrollArea}>
          <div className={classes.header}>
            <Heading as="h2" id="search-title" className={classes.title}>
              Pesquisar no AgroTab
            </Heading>
            <IconButton
              icon={XCircleFillIcon}
              variant="invisible"
              aria-label="Fechar pesquisa"
              onClick={handleClose}
            />
          </div>

          <form className={classes.form} onSubmit={handleSubmit}>
            <FormControl>
              <FormControl.Label visuallyHidden>Termo</FormControl.Label>
              <TextInput
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar publicações..."
                leadingVisual={SearchIcon}
                block
              />
            </FormControl>
            <Button type="submit" variant="primary" className={classes.submit}>
              Pesquisar
            </Button>
          </form>
        </div>
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
