import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  Banner,
  Button,
  Checkbox,
  FormControl,
  LinkButton,
  TextInput,
  Spinner,
  Stack,
  Heading,
  Flash,
  Text,
} from "@primer/react";
import { useConfirmDialog } from "interface/ConfirmDialog";
import DefaultLayout from "interface/DefaultLayout";
import useUser from "interface/useUser";
import { loginHref } from "interface/loginRedirect";
import {
  PUBLISH_TEMPLATES,
  clearPublishDraft,
  findPublishTemplate,
  findTemplateGuides,
  readPublishDraft,
  writePublishDraft,
} from "interface/publishTemplates";

const CommentEditor = dynamic(() => import("interface/CommentEditor"), {
  ssr: false,
});

const MAX_BODY_LENGTH = 20000;
// Custo cobrado pelo servidor ao publicar um anúncio (models/content.js).
const AD_COST = 100;

export default function PublishPage() {
  const { user, isLoading } = useUser();
  const { asPath } = useRouter();

  return (
    <DefaultLayout
      contentWidth="large"
      metadata={{
        title: "Publicar",
        description:
          "Publique uma pergunta, um relato de campo ou um resultado de safra no AgroTab.",
      }}
    >
      <Stack gap="spacious">
        <Heading as="h1">Publicar</Heading>

        {isLoading && <Spinner />}

        {!isLoading && !user && (
          <Stack gap="normal">
            <Banner
              variant="info"
              title="Entre para publicar"
              description="Só quem tem conta ativada pode publicar no AgroTab."
            />
            <Stack direction="horizontal" gap="condensed">
              <LinkButton href={loginHref(asPath)} variant="primary">
                Entrar
              </LinkButton>
              <LinkButton href="/cadastro">Criar conta</LinkButton>
            </Stack>
          </Stack>
        )}

        {!isLoading && user && !user.features?.includes("create:content") && (
          <Banner
            variant="warning"
            title="Sua conta ainda não pode publicar"
            description="Sua conta não tem permissão para criar conteúdos. Entre em contato com a equipe do AgroTab."
          />
        )}

        {!isLoading && user && user.features?.includes("create:content") && (
          <PublishForm />
        )}
      </Stack>
    </DefaultLayout>
  );
}

function PublishForm() {
  const { user, mutate } = useUser();
  const confirm = useConfirmDialog();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAd, setIsAd] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const draftReady = useRef(false);
  const isTooLong = body.length > MAX_BODY_LENGTH;
  const missing = [!title.trim() && "o título", !body.trim() && "o conteúdo"]
    .filter(Boolean)
    .join(" e ");
  const leftoverGuides = findTemplateGuides(body);
  const balance = user?.tabcash ?? 0;
  const canSponsor = balance >= AD_COST;

  const { query } = useRouter();

  // O texto fica guardado no navegador até publicar: fechar a aba ou a
  // sessão expirar não apaga o que a pessoa escreveu.
  useEffect(() => {
    const draft = readPublishDraft(user.id);
    if (draft) {
      setTitle(draft.title);
      setBody(draft.body);
      setRestoredDraft(true);
    }
    draftReady.current = true;
  }, [user.id]);

  useEffect(() => {
    if (draftReady.current) {
      writePublishDraft(user.id, { title, body });
    }
  }, [user.id, title, body]);

  function discardDraft() {
    clearPublishDraft(user.id);
    setTitle("");
    setBody(findPublishTemplate(query.modelo)?.body ?? "");
    setRestoredDraft(false);
  }

  // /publicar?modelo=pergunta (links da home) já abre com o roteiro.
  useEffect(() => {
    const template = findPublishTemplate(query.modelo);
    if (template) {
      setBody((current) => (current.trim() ? current : template.body));
    }
  }, [query.modelo]);

  async function applyTemplate(template) {
    if (body.trim()) {
      const confirmed = await confirm({
        title: "Substituir o texto atual?",
        body: "O texto atual será trocado pelo modelo selecionado.",
        confirmLabel: "Substituir",
      });

      if (!confirmed) {
        return;
      }
    }
    setBody(template.body);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (isTooLong) {
      setErrorMessage(
        `O conteúdo ultrapassa o limite de ${MAX_BODY_LENGTH} caracteres.`,
      );
      return;
    }

    if (isAd) {
      const confirmed = await confirm({
        title: `Usar ${AD_COST} AgroCash nesta publicação?`,
        body: `A publicação vai aparecer no espaço de anúncio, marcada como Patrocinado. Seu saldo vai de ${balance} para ${balance - AD_COST} AgroCash.`,
        confirmLabel: "Patrocinar e publicar",
      });

      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          type: isAd ? "ad" : "content",
        }),
      });

      const responseBody = await response.json();

      if (response.status === 201) {
        clearPublishDraft(user.id);
        mutate();
        const params = new URLSearchParams({ publicado: "1" });
        if (responseBody.first_publication) {
          params.set("primeira", "1");
        }
        location.href = `/${responseBody.owner_username ?? ""}/${responseBody.slug}?${params}`;
        return;
      }

      if (response.status === 403) {
        setErrorMessage("Você precisa estar logado para publicar.");
        return;
      }

      setErrorMessage(
        responseBody.message || "Não foi possível publicar. Tente novamente.",
      );
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="normal">
        {restoredDraft && (
          <Flash role="status">
            Recuperamos o texto que você não chegou a publicar.{" "}
            <Button size="small" variant="invisible" onClick={discardDraft}>
              Descartar rascunho
            </Button>
          </Flash>
        )}

        {errorMessage && (
          <Flash variant="danger" role="alert">
            {errorMessage}
          </Flash>
        )}

        <FormControl required>
          <FormControl.Label>Título</FormControl.Label>
          <TextInput
            value={title}
            maxLength={256}
            onChange={(event) => setTitle(event.target.value)}
            block
          />
        </FormControl>
        <Stack gap="condensed">
          <Text sx={{ color: "fg.muted", fontSize: 1 }}>
            Não sabe por onde começar? Use um modelo:
          </Text>
          <Stack direction="horizontal" gap="condensed" wrap="wrap">
            {PUBLISH_TEMPLATES.map((template) => (
              <Button
                key={template.label}
                type="button"
                size="small"
                onClick={() => applyTemplate(template)}
              >
                {template.label}
              </Button>
            ))}
          </Stack>
        </Stack>

        <FormControl required>
          <FormControl.Label>Conteúdo</FormControl.Label>
          <CommentEditor
            value={body}
            onChange={setBody}
            initialHeight="45vh"
            isInvalid={isTooLong}
            autofocus={false}
          />
          <FormControl.Caption>
            Use a barra do editor para negrito, listas e links. Para mostrar uma
            imagem que já está na internet, escreva
            ![descrição](endereço-da-imagem).
          </FormControl.Caption>
        </FormControl>

        <Text
          sx={{
            color: isTooLong ? "danger.fg" : "fg.muted",
            fontSize: 0,
          }}
          aria-live="polite"
        >
          {body.length}/{MAX_BODY_LENGTH}
        </Text>

        {leftoverGuides.length > 0 && (
          <Flash variant="warning">
            Ainda há trechos do modelo entre colchetes, como “
            {leftoverGuides[0]}”. Troque pelos seus dados ou apague antes de
            publicar.
          </Flash>
        )}

        <Heading as="h2" variant="small">
          Opção paga
        </Heading>
        {/* O FormControl liga rótulo e caixa pelo próprio id; um id fixo
            na caixa era sobrescrito e deixava o rótulo solto. */}
        <FormControl id="is-ad" disabled={!canSponsor}>
          <FormControl.Label>
            Patrocinar publicação ({AD_COST} AgroCash)
          </FormControl.Label>
          <Checkbox
            checked={isAd}
            onChange={(event) => setIsAd(event.target.checked)}
          />
          <FormControl.Caption>
            Seu saldo atual: {balance} AgroCash.{" "}
            {canSponsor
              ? "A publicação aparece no espaço de anúncio, marcada como Patrocinado. Você confirma antes de gastar."
              : `Para patrocinar, é preciso ter pelo menos ${AD_COST} AgroCash.`}
          </FormControl.Caption>
        </FormControl>

        <Stack.Item>
          {missing && (
            <Text
              as="p"
              id="publish-missing"
              sx={{ color: "fg.muted", fontSize: 1, mt: 0, mb: 2 }}
            >
              Para publicar, preencha {missing}.
            </Text>
          )}
          <Button
            aria-describedby={missing ? "publish-missing" : undefined}
            type="submit"
            variant="primary"
            disabled={
              isSubmitting || isTooLong || !title.trim() || !body.trim()
            }
          >
            {isSubmitting ? "Publicando..." : "Publicar"}
          </Button>
        </Stack.Item>
      </Stack>
    </form>
  );
}
