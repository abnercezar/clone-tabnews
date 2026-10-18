import { useState } from "react";
import {
  Button,
  Flash,
  FormControl,
  TextInput,
  Heading,
  Link,
  Text,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import PasswordInput from "interface/PasswordInput";
import classes from "interface/authForm.module.css";
import ui from "interface/styles.module.css";

export default function RegisterPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Cadastro",
        description: "Crie sua conta de forma gratuita.",
      }}
    >
      <Heading as="h1" className={classes.heading}>
        Cadastro
      </Heading>
      <RegisterForm />
    </DefaultLayout>
  );
}

function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const requestBody = { username, email, password };
      const response = await fetch("/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 201) {
        location.href = "/cadastro/confirmar";
        return;
      }

      const responseBody = await response.json();
      setError({
        message:
          responseBody.message ||
          "Não foi possível criar o cadastro. Tente novamente.",
        action: responseBody.action,
      });
    } catch {
      setError({
        message:
          "Não foi possível se conectar ao AgroTab. Por favor, verifique sua conexão.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={classes.form} onSubmit={handleSubmit}>
      <FormControl required className={classes.field}>
        <FormControl.Label>Nome de usuário</FormControl.Label>
        <TextInput
          type="text"
          name="name"
          autoComplete="off"
          placeholder="produtor123"
          autoFocus
          minLength={3}
          maxLength={30}
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
          }}
          size="large"
          block
        />
      </FormControl>

      <FormControl required className={classes.field}>
        <FormControl.Label>Seu Email</FormControl.Label>
        <TextInput
          type="email"
          autoComplete="username"
          placeholder="Digite seu email"
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
          autoComplete="new-password"
          placeholder="Digite sua senha"
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          size="large"
          block
        />
        <FormControl.Caption>Mínimo de 8 caracteres.</FormControl.Caption>
      </FormControl>

      {error && (
        <Flash variant="danger" role="alert" className={classes.flash}>
          <Text as="p" className={ui.flashText}>
            {error.message}
          </Text>
          {error.action && (
            <Text as="p" className={ui.flashAction}>
              {error.action}
            </Text>
          )}
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
        {isSubmitting ? "Criando cadastro..." : "Criar cadastro"}
      </Button>

      <div className={classes.links}>
        <span>
          Já tem uma conta? <Link href="/login">Faça login.</Link>
        </span>
      </div>
    </form>
  );
}
