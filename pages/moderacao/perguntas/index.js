import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Checkbox,
  Flash,
  FormControl,
  Heading,
  Link,
  Radio,
  RadioGroup,
  Select,
  Spinner,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@primer/react";
import { PlusIcon, TrashIcon } from "@primer/octicons-react";
import DefaultLayout from "interface/DefaultLayout";
import useUser from "interface/useUser";
import QuestionTemplates from "interface/QuestionTemplates";
import communityQuestionCategories from "models/community-question-categories.js";

const OPTIONS_MIN = 2;
const OPTIONS_MAX = 6;

export default function ModeracaoPerguntasPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const canCreate = user?.features?.includes("create:community_question");
  const [template, setTemplate] = useState(null);
  const [scheduleVersion, setScheduleVersion] = useState(0);

  useEffect(() => {
    if (!isLoading && !canCreate) {
      router.replace("/");
    }
  }, [isLoading, canCreate, router]);

  return (
    <DefaultLayout
      contentWidth="medium"
      metadata={{ title: "Nova Pergunta da Comunidade" }}
    >
      <Stack gap="spacious">
        <Stack gap="condensed">
          <Heading as="h1">Nova Pergunta da Comunidade</Heading>
          <Text as="p" sx={{ color: "fg.muted", m: 0 }}>
            A home mostra a pergunta já iniciada e ainda dentro do prazo. Quando
            esse prazo acaba, a próxima da fila assume. Nada fica fixo no ar.
          </Text>
        </Stack>
        {(isLoading || !canCreate) && <Spinner />}
        {!isLoading && canCreate && (
          <>
            <QuestionSchedule version={scheduleVersion} />
            <QuestionTemplates selectedId={template?.id} onPick={setTemplate} />
            <QuestionForm
              key={template?.id ?? "blank"}
              template={template}
              onCreated={() => setScheduleVersion((current) => current + 1)}
            />
          </>
        )}
      </Stack>
    </DefaultLayout>
  );
}

function dateTimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatScheduleDate(value) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function QuestionSchedule({ version }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/v1/community-questions")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!ignore) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!ignore) setItems([]);
      });
    return () => {
      ignore = true;
    };
  }, [version]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Stack gap="condensed">
      <Heading as="h2">Fila da home</Heading>
      <Stack gap="condensed">
        {items.map((question) => {
          const waiting = Date.parse(question.starts_at) > Date.now();
          return (
            <Text as="p" key={question.id} sx={{ m: 0 }}>
              <Text sx={{ fontWeight: "semibold" }}>
                {waiting ? "Na fila" : "Na home agora"}.{" "}
              </Text>
              {question.title}{" "}
              <Text sx={{ color: "fg.muted" }}>
                {formatScheduleDate(question.starts_at)} até{" "}
                {question.ends_at
                  ? formatScheduleDate(question.ends_at)
                  : "sem prazo"}
              </Text>
            </Text>
          );
        })}
      </Stack>
    </Stack>
  );
}

function QuestionForm({ template, onCreated }) {
  const [title, setTitle] = useState(template?.title ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [category, setCategory] = useState(
    template?.category ?? communityQuestionCategories[0].slug,
  );
  const [kind, setKind] = useState(template?.kind ?? "open");
  const [options, setOptions] = useState(
    template?.kind === "poll" ? template.options : ["", ""],
  );
  const [alwaysShowResults, setAlwaysShowResults] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState(() =>
    dateTimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const [errorMessage, setErrorMessage] = useState(null);
  const [created, setCreated] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateOption(index, value) {
    setOptions((current) =>
      current.map((option, position) => (position === index ? value : option)),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setCreated(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/community-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description.trim() || undefined,
          category,
          kind,
          options: kind === "poll" ? options : undefined,
          results_visibility: alwaysShowResults ? "always" : "after_vote",
          starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
          ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
        }),
      });
      const responseBody = await response.json();

      if (response.status === 201) {
        setCreated(responseBody);
        setTitle("");
        setDescription("");
        setOptions(["", ""]);
        setStartsAt("");
        setEndsAt(
          dateTimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        );
        onCreated?.();
        return;
      }

      setErrorMessage(
        responseBody.action
          ? `${responseBody.message} ${responseBody.action}`
          : responseBody.message || "Não foi possível criar a pergunta.",
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
        {created && (
          <Flash variant="success" role="status">
            Pergunta publicada: “{created.title}”.{" "}
            <Link href="/#pergunta">Ver na home</Link>
          </Flash>
        )}
        {errorMessage && (
          <Flash variant="danger" role="alert">
            {errorMessage}
          </Flash>
        )}

        <FormControl required>
          <FormControl.Label>Pergunta</FormControl.Label>
          <TextInput
            value={title}
            maxLength={256}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Como você está financiando o custeio desta safra?"
            block
          />
        </FormControl>

        <FormControl>
          <FormControl.Label>Contexto (opcional)</FormControl.Label>
          <Textarea
            value={description}
            maxLength={1000}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            block
          />
        </FormControl>

        <FormControl required>
          <FormControl.Label>Tema</FormControl.Label>
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {communityQuestionCategories.map((item) => (
              <Select.Option key={item.slug} value={item.slug}>
                {item.label}
              </Select.Option>
            ))}
          </Select>
        </FormControl>

        <RadioGroup
          name="kind"
          onChange={(value) => setKind(value)}
          aria-labelledby="kind-label"
        >
          <RadioGroup.Label id="kind-label">Formato</RadioGroup.Label>
          <FormControl>
            <Radio value="open" checked={kind === "open"} />
            <FormControl.Label>Só relatos abertos</FormControl.Label>
          </FormControl>
          <FormControl>
            <Radio value="poll" checked={kind === "poll"} />
            <FormControl.Label>Enquete + relatos</FormControl.Label>
          </FormControl>
        </RadioGroup>

        {kind === "poll" && (
          <Stack gap="condensed">
            <Text as="p" sx={{ fontWeight: "semibold", m: 0 }}>
              Alternativas
            </Text>
            {options.map((option, index) => (
              <Stack key={index} direction="horizontal" gap="condensed">
                <TextInput
                  aria-label={`Alternativa ${index + 1}`}
                  value={option}
                  maxLength={120}
                  onChange={(event) => updateOption(index, event.target.value)}
                  block
                />
                {options.length > OPTIONS_MIN && (
                  <Button
                    type="button"
                    variant="invisible"
                    aria-label={`Remover alternativa ${index + 1}`}
                    leadingVisual={TrashIcon}
                    onClick={() =>
                      setOptions((current) =>
                        current.filter((_, position) => position !== index),
                      )
                    }
                  />
                )}
              </Stack>
            ))}
            {options.length < OPTIONS_MAX && (
              <Stack.Item>
                <Button
                  type="button"
                  leadingVisual={PlusIcon}
                  onClick={() => setOptions((current) => [...current, ""])}
                >
                  Adicionar alternativa
                </Button>
              </Stack.Item>
            )}
            <FormControl>
              <Checkbox
                checked={alwaysShowResults}
                onChange={(event) => setAlwaysShowResults(event.target.checked)}
              />
              <FormControl.Label>
                Mostrar o resultado antes de votar
              </FormControl.Label>
              <FormControl.Caption>
                Por padrão o resultado aparece só para quem votou, para não
                influenciar a escolha.
              </FormControl.Caption>
            </FormControl>
          </Stack>
        )}

        <FormControl>
          <FormControl.Label>Começa em</FormControl.Label>
          <TextInput
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <FormControl.Caption>
            Em branco, começa agora. Uma data futura deixa a pergunta na fila.
          </FormControl.Caption>
        </FormControl>

        <FormControl>
          <FormControl.Label>Fica na home até</FormControl.Label>
          <TextInput
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
          <FormControl.Caption>
            Quando esse horário chega, a home passa para a próxima pergunta já
            iniciada.
          </FormControl.Caption>
        </FormControl>

        <Stack.Item>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Publicando..." : "Publicar pergunta"}
          </Button>
        </Stack.Item>
      </Stack>
    </form>
  );
}
