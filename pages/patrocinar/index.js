import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Flash,
  FormControl,
  Heading,
  Text,
  TextInput,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import useUser from "interface/useUser";
import classes from "interface/authForm.module.css";
import ui from "interface/styles.module.css";

export default function SponsorshipPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Patrocinar",
        description: "Publique um link no topo do feed do AgroTab.",
        noIndex: true,
      }}
    >
      <Heading as="h1" className={classes.heading}>
        Patrocinar
      </Heading>
      <Text as="p" className={ui.muted}>
        O link aparece no topo do feed e nas publicações, com a frase
        &quot;Contribuindo com&quot; o seu usuário. Não há cobrança.
      </Text>
      {user && <SponsorshipForm />}
    </DefaultLayout>
  );
}

function SponsorshipForm() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/sponsorships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, url }),
      });
      const responseBody = await response.json();

      if (response.status === 201) {
        setTitle("");
        setUrl("");
        setSuccessMessage("Patrocínio publicado. Ele já aparece no feed.");
        return;
      }

      setErrorMessage(
        responseBody.message ||
          "Não foi possível publicar o patrocínio. Tente novamente.",
      );
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={classes.form} onSubmit={handleSubmit}>
      <FormControl required className={classes.field}>
        <FormControl.Label htmlFor="title">Título</FormControl.Label>
        <TextInput
          id="title"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          size="large"
          block
        />
      </FormControl>

      <FormControl required className={classes.field}>
        <FormControl.Label htmlFor="url">Link</FormControl.Label>
        <TextInput
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
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
        {isSubmitting ? "Publicando..." : "Publicar"}
      </Button>
    </form>
  );
}
