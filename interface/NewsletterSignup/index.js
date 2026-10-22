import { useEffect, useState } from "react";
import { Button, Flash, FormControl, TextInput } from "@primer/react";
import useUser from "interface/useUser";
import classes from "./index.module.css";

export default function NewsletterSignup({
  size = "medium",
  showCaption = true,
}) {
  const { user } = useUser();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail((current) => current || user.email);
    }
  }, [user?.email]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSentTo(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage("Informe o seu e-mail.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/newsletter/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (response.status === 202) {
        setSentTo(trimmed);
        return;
      }

      const responseBody = await response.json();
      setErrorMessage(
        responseBody.message ||
          "Não foi possível fazer a inscrição. Tente novamente.",
      );
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={classes.form} onSubmit={handleSubmit} noValidate>
      <FormControl required>
        <FormControl.Label>Seu e-mail</FormControl.Label>
        <div className={classes.row}>
          <TextInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            size={size}
            className={classes.input}
            block
          />
          <Button
            type="submit"
            variant="primary"
            size={size}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Quero receber"}
          </Button>
        </div>
        {showCaption && (
          <FormControl.Caption>
            Uma vez por semana, só com as publicações de destaque. Você sai
            quando quiser pelo link de cada e-mail.
          </FormControl.Caption>
        )}
      </FormControl>

      {errorMessage && (
        <Flash variant="danger" role="alert">
          {errorMessage}
        </Flash>
      )}

      {sentTo && (
        <Flash variant="success" role="status">
          {`Se "${sentTo}" ainda não estiver na lista, enviamos um link de confirmação. A inscrição só vale depois de você abrir esse link.`}
        </Flash>
      )}
    </form>
  );
}
