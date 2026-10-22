import { useEffect, useState } from "react";
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
import GoogleLoginButton from "interface/GoogleLoginButton";
import PasswordInput from "interface/PasswordInput";
import {
  SEND_AFTER_LOGIN_PATH,
  hasVisitorDraft,
} from "interface/publishTemplates";
import classes from "interface/authForm.module.css";
import ui from "interface/styles.module.css";

export default function RegisterPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Criar conta",
        description: "Crie sua conta de forma gratuita.",
      }}
    >
      <Heading as="h1" className={classes.heading}>
        Criar conta
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
  const [hasDraft, setHasDraft] = useState(false);

  // Quem escreveu uma pergunta antes de ter conta volta para publicá-la.
  useEffect(() => {
    setHasDraft(hasVisitorDraft());
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const empty = [
      [username.trim(), "username", "Informe um nome de usuário."],
      [email.trim(), "email", "Informe seu e-mail."],
      [password, "password", "Crie uma senha."],
    ].find(([value]) => !value);
    if (empty) {
      setError({ message: empty[2], field: empty[1] });
      return;
    }

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
      const message =
        responseBody.message ||
        "Não foi possível criar a conta. Tente novamente.";
      setError({
        message,
        action: responseBody.action,
        field: fieldOf(message),
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
      <GoogleLoginButton
        redirect={hasDraft ? SEND_AFTER_LOGIN_PATH : "/"}
        label="Criar conta com Google"
      />

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
          pattern="[a-zA-Z0-9]+"
          validationStatus={error?.field === "username" ? "error" : undefined}
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
          }}
          size="large"
          block
        />
        {fieldError(error, "username")}
        <FormControl.Caption>
          De 3 a 30 letras e números, sem espaços. Ele aparece nas suas
          publicações e no endereço do seu perfil.
        </FormControl.Caption>
      </FormControl>

      <FormControl required className={classes.field}>
        <FormControl.Label>E-mail</FormControl.Label>
        <TextInput
          type="email"
          autoComplete="username"
          placeholder="Digite seu e-mail"
          validationStatus={error?.field === "email" ? "error" : undefined}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          size="large"
          block
        />
        {fieldError(error, "email")}
        <FormControl.Caption>
          Não aparece para ninguém. Serve para ativar a conta e recuperar a
          senha.
        </FormControl.Caption>
      </FormControl>

      <FormControl id="password" required className={classes.field}>
        <FormControl.Label>Senha</FormControl.Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="Digite sua senha"
          validationStatus={error?.field === "password" ? "error" : undefined}
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          size="large"
          block
        />
        {fieldError(error, "password")}
        <FormControl.Caption>Mínimo de 8 caracteres.</FormControl.Caption>
      </FormControl>

      {error && !error.field && (
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
        {isSubmitting ? "Criando conta..." : "Criar conta"}
      </Button>

      <Text as="p" className={classes.terms}>
        Ao criar a conta, você concorda com os{" "}
        <Link href="/termos-de-uso">Termos de Uso</Link>.
      </Text>

      <div className={classes.links}>
        <span>
          Já tem uma conta? <Link href="/login">Entrar</Link>
        </span>
      </div>
    </form>
  );
}

// A API devolve uma mensagem só; ela vai para o campo de que fala, para o
// leitor de tela anunciar o erro junto do campo.
function fieldOf(message) {
  if (/username|nome de usuário/i.test(message)) {
    return "username";
  }
  if (/e-?mail/i.test(message)) {
    return "email";
  }
  if (/senha/i.test(message)) {
    return "password";
  }
  return null;
}

// Chamada como função (não como <Componente>): o FormControl só reconhece
// o FormControl.Validation filho direto e aí liga a mensagem ao campo.
function fieldError(error, field) {
  if (error?.field !== field) {
    return null;
  }

  return (
    <FormControl.Validation variant="error">
      {[error.message, error.action].filter(Boolean).join(" ")}
    </FormControl.Validation>
  );
}
