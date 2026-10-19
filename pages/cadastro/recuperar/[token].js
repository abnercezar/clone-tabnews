import { useState } from "react";
import { useRouter } from "next/router";
import { Button, Flash, FormControl, Heading } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import PasswordInput from "interface/PasswordInput";
import classes from "interface/authForm.module.css";

export default function NewPasswordPage() {
  const router = useRouter();
  const tokenId = router.query.token;

  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Defina uma nova senha",
        description: "Escolha uma nova senha para a sua conta no AgroTab.",
      }}
    >
      <Heading as="h1" className={classes.heading}>
        Defina uma nova senha
      </Heading>
      {tokenId ? <NewPasswordForm tokenId={tokenId} /> : null}
    </DefaultLayout>
  );
}

function NewPasswordForm({ tokenId }) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== passwordConfirmation) {
      setErrorMessage(
        "As senhas não conferem. Digite a mesma senha nos dois campos.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/recovery", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token_id: tokenId,
          password,
        }),
      });

      if (response.status === 200) {
        location.href = "/cadastro/recuperar/sucesso";
        return;
      }

      const responseBody = await response.json();
      setErrorMessage(
        responseBody.message ||
          "Não foi possível alterar a senha. Tente novamente.",
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
      <FormControl id="password" required className={classes.field}>
        <FormControl.Label>Senha</FormControl.Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          size="large"
          block
        />
      </FormControl>

      <FormControl
        id="password-confirmation"
        required
        className={classes.field}
      >
        <FormControl.Label>Confirme a senha</FormControl.Label>
        <PasswordInput
          id="password-confirmation"
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(event) => {
            setPasswordConfirmation(event.target.value);
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
        {isSubmitting ? "Alterando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
