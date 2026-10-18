import { useState } from "react";
import {
  Button,
  FormControl,
  TextInput,
  Stack,
  Heading,
  Flash,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";

export default function LoginPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Login",
        description: "Acesse sua conta no AgroTab.",
      }}
    >
      <Stack gap="spacious">
        <Heading as="h1">Login</Heading>
        <LoginForm />
      </Stack>
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

      const responseBody = await response.json();
      setErrorMessage(
        responseBody.message ||
          "Não foi possível fazer login. Tente novamente.",
      );
    } catch {
      setErrorMessage(
        "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="normal">
        {errorMessage && (
          <Flash variant="danger" role="alert">
            {errorMessage}
          </Flash>
        )}

        <FormControl>
          <FormControl.Label>Email</FormControl.Label>
          <TextInput
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            block
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Senha</FormControl.Label>
          <TextInput
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            block
          />
        </FormControl>

        <Stack.Item>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </Stack.Item>
      </Stack>
    </form>
  );
}
