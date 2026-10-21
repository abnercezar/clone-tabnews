import { useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  FormControl,
  TextInput,
  Heading,
  Flash,
  Link,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import PasswordInput from "interface/PasswordInput";
import classes from "interface/authForm.module.css";
import { safeRedirectPath } from "interface/loginRedirect";

export default function LoginPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Entrar",
        description: "Acesse sua conta no AgroTab.",
      }}
    >
      <Heading as="h1" className={classes.heading}>
        Entrar
      </Heading>
      <LoginForm />
    </DefaultLayout>
  );
}

function LoginForm() {
  const { query } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    // O Primer marca os campos com aria-required, sem validação nativa:
    // campo vazio é barrado aqui, antes de ir ao servidor.
    if (!email.trim() || !password) {
      setErrorMessage("Preencha o e-mail e a senha para entrar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = { email, password };
      const response = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 201) {
        // Volta para onde a pessoa estava (votar, responder, publicar).
        location.href = safeRedirectPath(query.redirect);
        return;
      }

      const responseBody = await response.json().catch(() => ({}));

      if (response.status === 403) {
        const parts = [responseBody.message, responseBody.action].filter(
          Boolean,
        );
        setErrorMessage(
          parts.length > 0
            ? parts.join(" ")
            : "O seu usuário ainda não está ativado. Verifique seu e-mail.",
        );
        return;
      }

      setErrorMessage(
        responseBody.message ||
          "Não foi possível fazer login. Tente novamente.",
      );
    } catch {
      setErrorMessage(
        "Não foi possível se conectar ao AgroTab. Por favor, verifique sua conexão.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={classes.form} onSubmit={handleSubmit}>
      <FormControl required className={classes.field}>
        <FormControl.Label>E-mail</FormControl.Label>
        <TextInput
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          autoFocus
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          size="large"
          block
        />
      </FormControl>

      <FormControl id="password" required className={classes.field}>
        <FormControl.Label>Senha</FormControl.Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Digite sua senha"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          size="large"
          block
        />
      </FormControl>

      {errorMessage && (
        <Flash variant="danger" role="alert" className={classes.flash}>
          {errorMessage}
        </Flash>
      )}

      <Button
        type="submit"
        variant="primary"
        size="large"
        className={classes.submit}
        disabled={isSubmitting}
        block
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>

      <div className={classes.links}>
        <span>
          Novo no AgroTab? <Link href="/cadastro">Criar conta</Link>
        </span>
        <span>
          Esqueceu sua senha?{" "}
          <Link href="/cadastro/recuperar">Recuperar a senha</Link>
        </span>
      </div>
    </form>
  );
}
