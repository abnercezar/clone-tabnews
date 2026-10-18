import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button, Flash, FormControl, Heading, TextInput } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import PasswordInput from "interface/PasswordInput";
import useUser from "interface/useUser";
import classes from "interface/authForm.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, mutate } = useUser();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Editar perfil",
        description: "Atualize seu usuário, e-mail e senha no AgroTab.",
      }}
    >
      <Heading as="h1" className={classes.heading}>
        Editar perfil
      </Heading>
      {user && <ProfileForm user={user} mutate={mutate} />}
    </DefaultLayout>
  );
}

function ProfileForm({ user, mutate }) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [savedUsername, setSavedUsername] = useState(user.username);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const requestBody = {
      username,
      email,
    };

    if (password) {
      requestBody.password = password;
    }

    try {
      const response = await fetch(
        `/api/v1/users/${encodeURIComponent(savedUsername)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );
      const responseBody = await response.json();

      if (!response.ok) {
        setErrorMessage(
          responseBody.message || "Não foi possível atualizar o perfil.",
        );
        return;
      }

      setSavedUsername(responseBody.username);
      setUsername(responseBody.username);
      setEmail(responseBody.email);
      setPassword("");
      setSuccessMessage("Perfil atualizado.");
      await mutate();
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
        <FormControl.Label htmlFor="username">Usuário</FormControl.Label>
        <TextInput
          id="username"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
          }}
          size="large"
          block
        />
      </FormControl>

      <FormControl required className={classes.field}>
        <FormControl.Label htmlFor="email">Seu Email</FormControl.Label>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          size="large"
          block
        />
      </FormControl>

      <FormControl id="password" className={classes.field}>
        <FormControl.Label>Nova senha</FormControl.Label>
        <FormControl.Caption>
          Deixe em branco para manter a senha atual.
        </FormControl.Caption>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="Digite uma nova senha"
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

      {successMessage && (
        <Flash variant="success" role="status" className={classes.flash}>
          {successMessage}
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
        {isSubmitting ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
