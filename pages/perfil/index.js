import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Checkbox,
  Flash,
  FormControl,
  Heading,
  Select,
  TextInput,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import PasswordInput from "interface/PasswordInput";
import useUser from "interface/useUser";
import { useTags } from "interface/TagPicker";
import { MAX_CROPS, OCCUPATIONS, STATES } from "models/profile.js";
import classes from "interface/authForm.module.css";
import profileClasses from "./index.module.css";

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
        description:
          "Atualize seu usuário, ocupação, culturas, e-mail e senha no AgroTab.",
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
  const [occupation, setOccupation] = useState(user.occupation || "");
  const [state, setState] = useState(user.state || "");
  const [crops, setCrops] = useState(user.crops || []);
  const [notifyReplies, setNotifyReplies] = useState(
    user.notify_replies !== false,
  );
  const tags = useTags();
  const cropTags = (tags || []).filter((tag) => tag.category === "cultura");

  function toggleCrop(slug) {
    if (crops.includes(slug)) {
      setCrops(crops.filter((crop) => crop !== slug));
    } else if (crops.length < MAX_CROPS) {
      setCrops([...crops, slug]);
    }
  }
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
      occupation: occupation || null,
      state: state || null,
      crops,
      notify_replies: notifyReplies,
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

      const emailPendingConfirmation =
        email.trim().toLowerCase() !== responseBody.email.toLowerCase();

      setSuccessMessage(
        emailPendingConfirmation
          ? "Perfil atualizado. Enviamos um link de confirmação para o novo e-mail."
          : "Perfil atualizado.",
      );
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

      <Heading as="h2" variant="small" className={profileClasses.section}>
        Como você aparece na comunidade
      </Heading>

      <FormControl className={classes.field}>
        <FormControl.Label htmlFor="occupation">Ocupação</FormControl.Label>
        <Select
          id="occupation"
          value={occupation}
          onChange={(event) => setOccupation(event.target.value)}
          block
        >
          <Select.Option value="">Prefiro não informar</Select.Option>
          {OCCUPATIONS.map((item) => (
            <Select.Option key={item.value} value={item.value}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
        <FormControl.Caption>
          Aparece ao lado do seu nome nas publicações e comentários.
        </FormControl.Caption>
      </FormControl>

      <FormControl className={classes.field}>
        <FormControl.Label htmlFor="state">Estado</FormControl.Label>
        <Select
          id="state"
          value={state}
          onChange={(event) => setState(event.target.value)}
          block
        >
          <Select.Option value="">Prefiro não informar</Select.Option>
          {STATES.map((uf) => (
            <Select.Option key={uf} value={uf}>
              {uf}
            </Select.Option>
          ))}
        </Select>
      </FormControl>

      <fieldset className={profileClasses.crops}>
        <legend className={profileClasses.legend}>
          Culturas e criações (até {MAX_CROPS})
        </legend>
        <div className={profileClasses.cropOptions}>
          {cropTags.map((tag) => (
            <FormControl key={tag.slug} layout="horizontal">
              <Checkbox
                checked={crops.includes(tag.slug)}
                disabled={
                  !crops.includes(tag.slug) && crops.length >= MAX_CROPS
                }
                onChange={() => toggleCrop(tag.slug)}
              />
              <FormControl.Label>{tag.label}</FormControl.Label>
            </FormControl>
          ))}
        </div>
      </fieldset>

      <Heading
        as="h2"
        variant="small"
        id="avisos"
        className={profileClasses.section}
      >
        Avisos por e-mail
      </Heading>

      <FormControl layout="horizontal" className={classes.field}>
        <Checkbox
          checked={notifyReplies}
          onChange={(event) => setNotifyReplies(event.target.checked)}
        />
        <FormControl.Label>
          Avisar quando alguém responder minhas publicações e comentários
        </FormControl.Label>
      </FormControl>

      <Heading as="h2" variant="small" className={profileClasses.section}>
        Acesso
      </Heading>

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
