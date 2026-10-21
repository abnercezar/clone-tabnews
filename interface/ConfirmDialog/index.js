import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { ConfirmationDialog } from "@primer/react";
import classes from "./index.module.css";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const nextRequest =
      typeof options === "string"
        ? { title: "Confirmar", body: options }
        : options;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setRequest(nextRequest);
    });
  }, []);

  function settle(accepted) {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(accepted);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <ConfirmationDialog
          title={request.title || "Confirmar"}
          onClose={(gesture) => settle(gesture === "confirm")}
          cancelButtonContent={request.cancelLabel || "Cancelar"}
          confirmButtonContent={request.confirmLabel || "Confirmar"}
          confirmButtonType={request.danger ? "danger" : "primary"}
        >
          <div className={classes.body}>{request.body}</div>
        </ConfirmationDialog>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const confirm = useContext(ConfirmContext);

  if (!confirm) {
    throw new Error(
      "useConfirmDialog precisa estar dentro de ConfirmProvider.",
    );
  }

  return confirm;
}
