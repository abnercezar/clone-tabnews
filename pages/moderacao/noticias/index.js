import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Flash,
  FormControl,
  Heading,
  Link,
  Spinner,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import TagPicker from "interface/TagPicker";
import useUser from "interface/useUser";

export default function ModeracaoNoticiasPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const canReview = user?.features?.includes("review:news");
  const [items, setItems] = useState(null);
  const [message, setMessage] = useState(null);
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !canReview) {
      router.replace("/");
    }
  }, [isLoading, canReview, router]);

  const loadPending = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/news?status=pending");
      const body = await response.json();
      setItems(response.ok && Array.isArray(body) ? body : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (canReview) loadPending();
  }, [canReview, loadPending]);

  async function collectNow() {
    setIsCollecting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/news/curation", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setMessage({ variant: "danger", text: body.message });
        return;
      }
      const failed = body.feeds.filter((feed) => feed.error).length;
      setMessage({
        variant: "success",
        text: `${body.created} notícias novas na fila (${body.candidates} lidas nos feeds${failed ? `, ${failed} feeds sem resposta` : ""}).`,
      });
      await loadPending();
    } catch {
      setMessage({
        variant: "danger",
        text: "Não foi possível coletar agora.",
      });
    } finally {
      setIsCollecting(false);
    }
  }

  function removeFromList(id, text) {
    setItems((current) => current.filter((item) => item.id !== id));
    setMessage({ variant: "success", text });
  }

  return (
    <DefaultLayout
      contentWidth="medium"
      metadata={{ title: "Curadoria de notícias", noIndex: true }}
    >
      <Stack gap="spacious">
        <Stack gap="condensed">
          <Heading as="h1">Curadoria de notícias</Heading>
          <Text as="p" sx={{ color: "fg.muted", m: 0 }}>
            Todo dia de manhã o AgroTab lê os portais do agro, escolhe as
            notícias mais úteis e escreve um resumo. Nada vai ao ar sem a sua
            aprovação: revise, ajuste se quiser e publique.
          </Text>
          <div>
            <Button onClick={collectNow} disabled={isCollecting}>
              {isCollecting ? "Coletando…" : "Coletar agora"}
            </Button>
          </div>
        </Stack>

        {message && (
          <Flash
            variant={message.variant}
            role={message.variant === "danger" ? "alert" : "status"}
          >
            {message.text}
          </Flash>
        )}

        {(isLoading || !canReview || items === null) && <Spinner />}

        {items && items.length === 0 && (
          <Text as="p" sx={{ color: "fg.muted" }}>
            Nenhuma notícia esperando revisão.
          </Text>
        )}

        {items &&
          items.map((item) => (
            <NewsCard key={item.id} item={item} onDone={removeFromList} />
          ))}
      </Stack>
    </DefaultLayout>
  );
}

function NewsCard({ item, onDone }) {
  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary);
  const [question, setQuestion] = useState(item.discussion_question || "");
  const [tags, setTags] = useState(item.tags || []);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);

  async function review(action) {
    setIsSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/news/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "publish"
            ? {
                action,
                title,
                summary,
                discussion_question: question,
                tags,
              }
            : { action },
        ),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.message);
        return;
      }
      onDone(
        item.id,
        action === "publish"
          ? `Publicada: ${body.title}`
          : `Descartada: ${item.title}`,
      );
    } catch {
      setError("Não foi possível salvar agora.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Stack
      gap="normal"
      sx={{
        border: "1px solid",
        borderColor: "border.default",
        borderRadius: 2,
        p: 3,
      }}
    >
      <Text as="p" sx={{ m: 0, color: "fg.muted", fontSize: 1 }}>
        {item.source_name} · relevância {item.relevance}/10
        {item.ai_curated ? "" : " · resumo sem IA, revise com atenção"} ·{" "}
        <Link href={item.source_url} target="_blank" rel="noreferrer">
          abrir notícia original
        </Link>
      </Text>

      <FormControl>
        <FormControl.Label>Título</FormControl.Label>
        <TextInput
          block
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </FormControl>

      <FormControl>
        <FormControl.Label>Resumo</FormControl.Label>
        <Textarea
          block
          rows={5}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
      </FormControl>

      <FormControl>
        <FormControl.Label>Pergunta para o debate</FormControl.Label>
        <TextInput
          block
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </FormControl>

      <FormControl>
        <FormControl.Label>Tags</FormControl.Label>
        <TagPicker value={tags} onChange={setTags} />
      </FormControl>

      {error && (
        <Flash variant="danger" role="alert">
          {error}
        </Flash>
      )}

      <Stack direction="horizontal" gap="condensed">
        <Button
          variant="primary"
          disabled={isSending}
          onClick={() => review("publish")}
        >
          Publicar
        </Button>
        <Button
          variant="danger"
          disabled={isSending}
          onClick={() => review("reject")}
        >
          Descartar
        </Button>
      </Stack>
    </Stack>
  );
}
