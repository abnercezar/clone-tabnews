import { useState } from "react";
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

export default function LoginPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Login",
        description: "Acesse sua conta no AgroTab.",
      }}
    >
      <Heading as="h1" className={classes.heading}>
        Login
      </Heading>
      <LoginForm />
    </DefaultLayout>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
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
        location.href = "/";
        return;
      }

      if (response.status === 403) {
        setErrorMessage(
          "Sua conta ainda não foi ativada. Abra o email de ativação enviado pelo AgroTab.",
        );
        return;
      }

      const responseBody = await response.json();
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
        <FormControl.Label>Seu Email</FormControl.Label>
        <TextInput
          type="email"
          autoComplete="email"
          placeholder="Digite seu email"
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
        {isSubmitting ? "Entrando..." : "Login"}
      </Button>

      <div className={classes.links}>
        <span>
          Novo no AgroTab? <Link href="/cadastro">Crie sua conta aqui.</Link>
        </span>
      </div>
    </form>
  );
}
