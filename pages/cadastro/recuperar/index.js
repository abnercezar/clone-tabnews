import { useState } from "react";
import { Button, Flash, FormControl, TextInput, Heading } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import classes from "interface/authForm.module.css";

export default function RecoverPasswordPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Recuperação de senha",
        description: "Redefina a senha da sua conta no AgroTab.",
        noIndex: true,
      }}
    >
      <Heading as="h1" className={classes.heading}>
        Recuperação de senha
      </Heading>
      <RecoverPasswordForm />
    </DefaultLayout>
  );
}

function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [successEmail, setSuccessEmail] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessEmail(null);

    if (!email.trim()) {
      setErrorMessage("Informe o e-mail da sua conta.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.status === 201) {
        setSuccessEmail(email);
        return;
      }

      const responseBody = await response.json();
      setErrorMessage(
        responseBody.message ||
          "Não foi possível solicitar a recuperação. Tente novamente.",
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
        <FormControl.Label>Digite seu e-mail</FormControl.Label>
        <TextInput
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
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

      {successEmail && (
        <Flash variant="success" role="status" className={classes.flash}>
          {`Caso o e-mail "${successEmail}" esteja cadastrado, enviaremos um link para definir uma nova senha.`}
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
        {isSubmitting ? "Enviando..." : "Recuperar"}
      </Button>
    </form>
  );
}
