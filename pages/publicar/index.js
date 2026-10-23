import { useEffect, useRef, useState } from "react";
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
import ContentEditor from "interface/ContentEditor";
import TagPicker, { MAX_TAGS } from "interface/TagPicker";
import { useConfirmDialog } from "interface/ConfirmDialog";
import DefaultLayout from "interface/DefaultLayout";
import useUser from "interface/useUser";
import { loginHref } from "interface/loginRedirect";
import {
  PUBLISH_TEMPLATES,
  SEND_AFTER_LOGIN_PATH,
  VISITOR_DRAFT_ID,
  clearPublishDraft,
  findPublishTemplate,
  findTemplateGuides,
  isUntouchedTemplateDraft,
  moveVisitorDraft,
  readPublishDraft,
  writePublishDraft,
} from "interface/publishTemplates";
import classes from "./index.module.css";

const MAX_BODY_LENGTH = 20000;
// Custo cobrado pelo servidor ao publicar um anúncio (models/content.js).
const AD_COST = 100;

export default function PublishPage() {
  const { user, isLoading } = useUser();

  return (
    <DefaultLayout
      contentWidth="large"
      metadata={{
        title: "Fazer uma pergunta",
        description:
          "Pergunte à comunidade do AgroTab, conte um relato de campo ou o resultado da sua safra.",
        noIndex: true,
      }}
    >
      <Stack gap="spacious">
        <Heading as="h1">Fazer uma pergunta</Heading>

        {isLoading && <Spinner />}

        {!isLoading && user && !user.features?.includes("create:content") && (
          <Banner
            variant="warning"
            title="Sua conta ainda não pode publicar"
            description="Confirme seu cadastro pelo link enviado ao seu e-mail. Seu texto continua guardado neste aparelho."
          />
        )}

        {!isLoading && (!user || user.features?.includes("create:content")) && (
          <PublishForm key={user?.id || VISITOR_DRAFT_ID} />
        )}
      </Stack>
    </DefaultLayout>
  );
}

// Dicas para o título ser encontrado no Google e entendido no WhatsApp.
function titleHints(title) {
  const text = title.trim();
  if (!text) {
    return [];
  }
  const hints = [];
  if (text.length < 25) {
    hints.push("Conte mais: diga a cultura ou criação, o problema e a fase.");
  }
  if (text.length > 12 && text === text.toUpperCase()) {
    hints.push("Evite escrever tudo em letras maiúsculas.");
  }
  return hints;
}

function PublishForm() {
  const { user, mutate } = useUser();
  const router = useRouter();
  const confirm = useConfirmDialog();
  const draftId = user?.id || VISITOR_DRAFT_ID;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState([]);
  const [isAd, setIsAd] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorAction, setErrorAction] = useState(null);
  const [showDraftNote, setShowDraftNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [autoSending, setAutoSending] = useState(false);
  const draftReady = useRef(false);
  const formRef = useRef(null);
  const isTooLong = body.length > MAX_BODY_LENGTH;
  const missing = [
    !title.trim() && "o título",
    !body.trim() && "o texto",
    tags.length === 0 && "ao menos uma tag",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/, ([^,]*)$/, " e $1");
  const leftoverGuides = findTemplateGuides(body);
  const balance = user?.tabcash ?? 0;
  const canSponsor = balance >= AD_COST;
  const hints = titleHints(title);

  // O texto fica guardado no navegador até publicar: fechar a aba, a
  // sessão expirar ou parar para criar a conta não apaga o que foi escrito.
  // Um modelo ainda intacto não conta como rascunho.
  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (user) {
      moveVisitorDraft(user.id);
    }

    const draft = readPublishDraft(draftId);
    if (draft && isUntouchedTemplateDraft(draft)) {
      clearPublishDraft(draftId);
    } else if (draft) {
      setTitle(draft.title);
      setBody(draft.body);
      setTags(draft.tags.slice(0, MAX_TAGS));
      setRestoredDraft(true);

      if (user && router.query.enviar === "1") {
        setAutoSending(true);
      }
    } else {
      const template = findPublishTemplate(router.query.modelo);
      if (template) {
        setBody(template.body);
      }
      if (typeof router.query.tag === "string") {
        setTags([router.query.tag]);
      }
    }
    draftReady.current = true;
    // Só na abertura do formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, draftId]);

  useEffect(() => {
    if (draftReady.current) {
      writePublishDraft(draftId, { title, body, tags });
    }
  }, [draftId, title, body, tags]);

  // Depois do login, o rascunho é publicado sem a pessoa ter de clicar de novo.
  useEffect(() => {
    if (!autoSending) {
      return;
    }
    setAutoSending(false);
    router.replace("/publicar", undefined, { shallow: true });
    formRef.current?.requestSubmit();
  }, [autoSending, router]);

  function discardDraft() {
    clearPublishDraft(draftId);
    setTitle("");
    setBody("");
    setTags([]);
    setRestoredDraft(false);
  }

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

  function reportError(message, action = null, keepDraftNote = false) {
    setErrorMessage(message);
    setErrorAction(action);
    setShowDraftNote(keepDraftNote);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    reportError(null);

    if (isTooLong) {
      reportError(
        `O texto ultrapassa o limite de ${MAX_BODY_LENGTH} caracteres.`,
      );
      return;
    }

    if (missing) {
      reportError(`Para publicar, preencha ${missing}.`);
      return;
    }

    // Visitante: o texto já está salvo; entra ou cria a conta e volta aqui.
    if (!user) {
      writePublishDraft(VISITOR_DRAFT_ID, { title, body, tags });
      router.push(loginHref(SEND_AFTER_LOGIN_PATH));
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
          tags,
          type: isAd ? "ad" : "content",
        }),
      });

      const responseBody = await response.json();

      if (response.status === 201) {
        clearPublishDraft(draftId);
        mutate();
        const params = new URLSearchParams({ publicado: "1" });
        if (responseBody.first_publication) {
          params.set("primeira", "1");
        }
        location.href = `/${responseBody.owner_username ?? ""}/${responseBody.slug}?${params}`;
        return;
      }

      reportError(
        responseBody.message || "Não foi possível publicar. Tente novamente.",
        responseBody.action,
        true,
      );
    } catch {
      reportError(
        "Não foi possível conectar ao servidor.",
        "Seu texto continua guardado neste aparelho.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <Stack gap="normal">
        {!user && (
          <Flash>
            Pode escrever à vontade: o texto fica guardado neste aparelho. Na
            hora de publicar, você entra ou cria sua conta e a pergunta é
            enviada em seguida.
          </Flash>
        )}

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
            <p className={classes.flashText}>{errorMessage}</p>
            {errorAction && (
              <p className={classes.flashAction}>{errorAction}</p>
            )}
            {showDraftNote && (
              <p className={classes.flashAction}>
                Seu texto continua guardado neste aparelho.
              </p>
            )}
          </Flash>
        )}

        <FormControl required>
          <FormControl.Label>Título</FormControl.Label>
          <TextInput
            value={title}
            maxLength={256}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Como controlar percevejo na soja após o R5?"
            block
          />
          <FormControl.Caption>
            Escreva como você buscaria no Google: cultura, problema e fase.
          </FormControl.Caption>
        </FormControl>
        {hints.map((hint) => (
          <Text
            key={hint}
            as="p"
            sx={{ color: "attention.fg", fontSize: 1, m: 0 }}
          >
            {hint}
          </Text>
        ))}

        <fieldset className={classes.tags}>
          <legend className={classes.tagsLegend}>
            Tags{" "}
            <span className={classes.tagsHint}>
              (escolha de 1 a {MAX_TAGS})
            </span>
          </legend>
          <Text as="p" sx={{ color: "fg.muted", fontSize: 0, mt: 0, mb: 2 }}>
            Ajudam quem planta ou cria o mesmo que você a achar sua pergunta.
          </Text>
          <TagPicker value={tags} onChange={setTags} />
        </fieldset>

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
          <FormControl.Label>Texto</FormControl.Label>
          <ContentEditor
            value={body}
            onChange={setBody}
            label="Texto"
            initialHeight="40vh"
            isInvalid={isTooLong}
            autofocus={false}
            placeholder="Conte o que está acontecendo, onde e o que você já tentou."
          />
          <FormControl.Caption>
            Use a barra para negrito, lista, link e fotos (até 6, JPEG, PNG ou
            WebP, no máximo 8 MB). Vídeo não é aceito.
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

        {user && (
          <>
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
          </>
        )}

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
          <Stack direction="horizontal" gap="condensed" wrap="wrap">
            <Button
              aria-describedby={missing ? "publish-missing" : undefined}
              type="submit"
              variant="primary"
              disabled={isSubmitting || isTooLong || Boolean(missing)}
            >
              {isSubmitting
                ? "Publicando..."
                : user
                  ? "Publicar"
                  : "Entrar e publicar"}
            </Button>
            {!user && (
              <LinkButton href="/cadastro" variant="invisible">
                Ainda não tenho conta
              </LinkButton>
            )}
          </Stack>
        </Stack.Item>
      </Stack>
    </form>
  );
}
