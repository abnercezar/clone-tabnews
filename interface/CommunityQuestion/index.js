import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useReward } from "react-rewards";
import {
  Button,
  Flash,
  FormControl,
  Link,
  LinkButton,
  Spinner,
  Text,
  TextInput,
} from "@primer/react";
import {
  CheckCircleFillIcon,
  CommentIcon,
  PencilIcon,
} from "@primer/octicons-react";
import PastTime, { formatPastDuration } from "interface/PastTime";
import useUser from "interface/useUser";
import { loginHref } from "interface/loginRedirect";
import {
  clearDraft,
  computeResults,
  describeViewerResult,
  readDraft,
  writeDraft,
} from "./results.js";
import styles from "./index.module.css";

const CommentEditor = dynamic(() => import("interface/CommentEditor"), {
  ssr: false,
});

const MAX_BODY_LENGTH = 20000;
const MAX_TITLE_LENGTH = 256;

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

// `fallback`: o que mostrar para visitantes quando não há pergunta aberta
// (a home usa para destacar uma pergunta da semana com feed vazio).
export default function CommunityQuestion({ onPublished, fallback = null }) {
  const { user } = useUser();
  const [question, setQuestion] = useState(null);
  const [status, setStatus] = useState("loading");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerSeed, setComposerSeed] = useState(null);
  const [newContribution, setNewContribution] = useState(null);

  const loadQuestion = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/v1/community-questions/active");
      if (response.status === 404) {
        setStatus("empty");
        return;
      }
      if (!response.ok) {
        setStatus("error");
        return;
      }
      setQuestion(await response.json());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  // A sessão chega depois da primeira carga: recarrega para trazer o voto.
  const userId = user?.id;
  useEffect(() => {
    if (userId) {
      loadQuestion();
    }
  }, [userId, loadQuestion]);

  if (status === "loading" && !question) {
    return <QuestionSkeleton />;
  }

  if (status === "error" && !question) {
    // Para quem só visita, uma falha aqui não deve ser a primeira impressão
    // da home: o card some. Quem cria perguntas vê o aviso para agir.
    if (!user?.features?.includes("create:community_question")) {
      return null;
    }

    return (
      <section className={styles.card} aria-labelledby="cq-error-title">
        <p className={styles.eyebrow}>Pergunta da semana</p>
        <h2 id="cq-error-title" className={styles.emptyTitle}>
          Não conseguimos carregar a pergunta agora.
        </h2>
        <Button onClick={loadQuestion}>Tentar novamente</Button>
      </section>
    );
  }

  if (status === "empty") {
    return <EmptyQuestion user={user} fallback={fallback} />;
  }

  function openComposer(seed) {
    setComposerSeed(seed ?? null);
    setIsComposerOpen(true);
  }

  function handleVoted(updatedQuestion) {
    setQuestion((current) => ({ ...current, ...updatedQuestion }));
  }

  function handlePublished(createdContent) {
    setIsComposerOpen(false);
    onPublished?.(createdContent);
    setNewContribution(createdContent);
    setQuestion((current) => {
      const counts = { ...current.contributions_by_category };
      const key = createdContent.community_question_category;
      counts[key] = Number(counts[key] ?? 0) + 1;
      return { ...current, contributions_by_category: counts };
    });
  }

  const categoryLabel =
    question.categories?.find((item) => item.slug === question.category)
      ?.label ?? question.category;

  return (
    <section
      id="pergunta"
      className={styles.card}
      aria-labelledby="cq-title"
      data-testid="community-question"
    >
      <div className={styles.header}>
        <p className={styles.eyebrow}>
          <span className={styles.pulse} aria-hidden="true" />
          Pergunta da semana
        </p>
        <span className={styles.categoryBadge}>{categoryLabel}</span>
        {question.ends_at && (
          <span className={styles.deadline}>
            Encerra em{" "}
            {formatPastDuration(Date.now(), Date.parse(question.ends_at))}
          </span>
        )}
      </div>

      <h2 id="cq-title" className={styles.title}>
        {question.title}
      </h2>
      {question.description && (
        <p className={styles.description}>{question.description}</p>
      )}

      {question.kind === "poll" && (
        <Poll
          question={question}
          user={user}
          onVoted={handleVoted}
          onExplain={(option) =>
            openComposer({ body: `Escolhi **${option.label}** porque ` })
          }
        />
      )}

      {newContribution && !isComposerOpen && (
        <PublishedNotice content={newContribution} />
      )}

      {isComposerOpen ? (
        <Composer
          question={question}
          user={user}
          seed={composerSeed}
          onCancel={() => setIsComposerOpen(false)}
          onPublished={handlePublished}
        />
      ) : (
        <div className={styles.shareRow}>
          <Button
            leadingVisual={PencilIcon}
            variant={question.kind === "open" ? "primary" : "default"}
            onClick={() => openComposer()}
          >
            Compartilhar minha experiência
          </Button>
          <Text as="p" className={styles.shareHint}>
            Vira uma publicação no AgroTab, com comentários e votos de útil.
          </Text>
        </div>
      )}

      <Contributions question={question} newContribution={newContribution} />
    </section>
  );
}

function QuestionSkeleton() {
  return (
    <section
      className={styles.card}
      aria-busy="true"
      aria-label="Carregando a Pergunta da Comunidade"
    >
      <div className={`${styles.skeleton} ${styles.skeletonShort}`} />
      <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </section>
  );
}

function EmptyQuestion({ user, fallback }) {
  const canCreate = user?.features?.includes("create:community_question");

  // Na home o feed e os modelos já orientam a primeira participação;
  // sem pergunta ativa, o card só aparece para quem pode criar uma.
  if (!canCreate) {
    return fallback;
  }

  return (
    <section
      className={styles.card}
      aria-labelledby="cq-empty-title"
      data-testid="community-question-empty"
    >
      <p className={styles.eyebrow}>Pergunta da semana</p>
      <h2 id="cq-empty-title" className={styles.emptyTitle}>
        Nenhuma pergunta aberta agora.
      </h2>
      <p className={styles.description}>
        Só você vê este aviso. Crie uma pergunta para ela aparecer aqui para
        toda a comunidade.
      </p>
      <div className={styles.shareRow}>
        <LinkButton href="/moderacao/perguntas" variant="primary">
          Criar uma pergunta
        </LinkButton>
      </div>
    </section>
  );
}

function Poll({ question, user, onVoted, onExplain }) {
  const rewardId = `cq-reward-${useId().replace(/:/g, "")}`;
  const { reward } = useReward(rewardId, "emoji", {
    emoji: ["🌱", "🌾", "🌽", "🐄"],
    elementCount: 14,
    spread: 60,
    lifetime: 90,
    position: "absolute",
  });
  const [pendingOptionId, setPendingOptionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const canVote = user?.features?.includes("create:community_question_vote");
  const hasVoted = Boolean(question.viewer_option_id);

  // Dispara depois que o resultado já está na tela, a partir da âncora nova.
  useEffect(() => {
    if (justVoted && !prefersReducedMotion()) {
      reward();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justVoted]);

  async function handleVote(option) {
    setErrorMessage(null);

    if (!user) {
      setShowLoginHint(true);
      return;
    }

    if (!canVote) {
      setErrorMessage("Sua conta ainda não pode votar. Ative sua conta.");
      return;
    }

    setPendingOptionId(option.id);

    try {
      const response = await fetch(
        `/api/v1/community-questions/${question.id}/votes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ option_id: option.id }),
        },
      );
      const responseBody = await response.json();

      if (response.status === 201) {
        onVoted(responseBody);
        setJustVoted(true);
        return;
      }

      setErrorMessage(
        responseBody.message || "Não foi possível registrar seu voto.",
      );
    } catch {
      setErrorMessage("Sem conexão. Seu voto não foi registrado.");
    } finally {
      setPendingOptionId(null);
    }
  }

  if (question.results_visible) {
    const results = computeResults(question.options, question.total_votes);
    const insight = describeViewerResult(
      results,
      question.viewer_option_id,
      question.total_votes,
    );
    const viewerOption = results.find(
      (option) => option.id === question.viewer_option_id,
    );

    return (
      <div className={styles.poll}>
        <span
          id={rewardId}
          className={styles.rewardAnchor}
          aria-hidden="true"
        />
        <ol className={styles.results} aria-label="Resultado da enquete">
          {results.map((option) => {
            const isViewerChoice = option.id === question.viewer_option_id;
            return (
              <li
                key={option.id}
                className={`${styles.result} ${isViewerChoice ? styles.resultChosen : ""}`}
              >
                <span
                  className={styles.resultBar}
                  style={{ "--cq-percent": `${option.percent}%` }}
                  aria-hidden="true"
                />
                <span className={styles.resultLabel}>
                  {isViewerChoice && (
                    <CheckCircleFillIcon
                      size={16}
                      className={styles.resultCheck}
                      aria-label="Seu voto"
                    />
                  )}
                  {option.label}
                </span>
                <span className={styles.resultValue}>
                  {option.percent}%
                  <span className={styles.srOnly}>
                    {`, ${pluralize(option.votes, "voto", "votos")}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className={styles.pollMeta} aria-live="polite">
          {justVoted && <strong>Voto registrado. </strong>}
          {insight ??
            `${pluralize(question.total_votes, "voto", "votos")} até agora.`}
          {insight && (
            <span className={styles.muted}>
              {` · ${pluralize(question.total_votes, "voto", "votos")}`}
            </span>
          )}
        </p>
        {viewerOption && (
          <button
            type="button"
            className={styles.explainButton}
            onClick={() => onExplain(viewerOption)}
          >
            Por que você escolheu “{viewerOption.label}”? Conte como foi na sua
            propriedade →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.poll}>
      <span id={rewardId} className={styles.rewardAnchor} aria-hidden="true" />
      <ul className={styles.options} aria-label="Alternativas">
        {question.options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className={styles.option}
              onClick={() => handleVote(option)}
              disabled={Boolean(pendingOptionId) || hasVoted}
              aria-busy={pendingOptionId === option.id}
            >
              <span className={styles.optionRadio} aria-hidden="true">
                {pendingOptionId === option.id && <Spinner size="small" />}
              </span>
              {option.label}
            </button>
          </li>
        ))}
      </ul>

      <p className={styles.pollMeta} aria-live="polite">
        {question.total_votes === 0
          ? "Seja a primeira pessoa a votar."
          : `${pluralize(question.total_votes, "pessoa já votou", "pessoas já votaram")}. Vote para ver o resultado.`}
      </p>

      {showLoginHint && (
        <Flash className={styles.inlineFlash} role="status">
          Para votar, entre na sua conta.{" "}
          <Link href={loginHref("/#pergunta")}>Entrar</Link> ou{" "}
          <Link href="/cadastro">criar conta grátis</Link>.
        </Flash>
      )}

      {errorMessage && (
        <Flash variant="danger" className={styles.inlineFlash} role="alert">
          {errorMessage}
        </Flash>
      )}
    </div>
  );
}

function Composer({ question, user, seed, onCancel, onPublished }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(question.category);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleRef = useRef(null);
  const draftReady = useRef(false);
  const isTooLong = body.length > MAX_BODY_LENGTH;
  const canPublish = user?.features?.includes("create:content");

  useEffect(() => {
    const draft = readDraft(question.id);
    if (draft) {
      setTitle(draft.title);
      setBody(draft.body);
      if (draft.category) setCategory(draft.category);
      setRestoredDraft(true);
    } else if (seed?.body) {
      setBody(seed.body);
    }
    draftReady.current = true;
    titleRef.current?.focus();
  }, [question.id, seed]);

  useEffect(() => {
    if (draftReady.current) {
      writeDraft(question.id, { title, body, category });
    }
  }, [question.id, title, body, category]);

  if (!user) {
    return (
      <div className={styles.composer}>
        <p className={styles.description}>
          Entre para transformar sua experiência em uma publicação que outras
          pessoas do campo vão encontrar.
        </p>
        <div className={styles.shareRow}>
          <LinkButton href={loginHref("/#pergunta")} variant="primary">
            Entrar
          </LinkButton>
          <LinkButton href="/cadastro">Criar conta</LinkButton>
          <Button variant="invisible" onClick={onCancel}>
            Agora não
          </Button>
        </div>
      </div>
    );
  }

  if (!canPublish) {
    return (
      <Flash variant="warning" className={styles.inlineFlash}>
        Sua conta ainda não pode publicar. Confirme a ativação pelo e-mail.
      </Flash>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (isTooLong) {
      setErrorMessage(
        `O relato ultrapassa o limite de ${MAX_BODY_LENGTH} caracteres.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          community_question_id: question.id,
          community_question_category: category,
        }),
      });
      const responseBody = await response.json();

      if (response.status === 201) {
        clearDraft(question.id);
        onPublished(responseBody);
        return;
      }

      // O texto continua no formulário (e no rascunho) para corrigir e reenviar.
      setErrorMessage(
        responseBody.action
          ? `${responseBody.message} ${responseBody.action}`
          : responseBody.message || "Não foi possível publicar.",
      );
    } catch {
      setErrorMessage(
        "Sem conexão. Seu texto foi guardado neste navegador; tente de novo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onCancel();
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  }

  return (
    <form
      className={styles.composer}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      aria-label="Compartilhar experiência"
    >
      {restoredDraft && (
        <Text as="p" className={styles.draftNote} role="status">
          Recuperamos o rascunho que você começou neste navegador.
        </Text>
      )}

      {errorMessage && (
        <Flash variant="danger" role="alert">
          {errorMessage}
        </Flash>
      )}

      <fieldset className={styles.categoryField}>
        <legend className={styles.legend}>
          Sobre qual tema é a sua experiência?
        </legend>
        <div className={styles.chips}>
          {question.categories.map((item) => (
            <label
              key={item.slug}
              className={`${styles.chip} ${category === item.slug ? styles.chipSelected : ""}`}
            >
              <input
                type="radio"
                name="cq-category"
                value={item.slug}
                checked={category === item.slug}
                onChange={() => setCategory(item.slug)}
                className={styles.srOnly}
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      <FormControl required>
        <FormControl.Label>Título</FormControl.Label>
        <TextInput
          ref={titleRef}
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Antecipar a dessecação salvou meu plantio de soja"
          block
        />
      </FormControl>

      <FormControl required>
        <FormControl.Label>Sua experiência</FormControl.Label>
        <CommentEditor
          value={body}
          onChange={setBody}
          initialHeight="180px"
          isInvalid={isTooLong}
          autofocus={false}
        />
        <FormControl.Caption>
          O que aconteceu, o que você fez e o que faria diferente. Números e
          região ajudam quem vai ler.
        </FormControl.Caption>
      </FormControl>

      <div className={styles.composerActions}>
        <Text
          className={isTooLong ? styles.countOver : styles.count}
          aria-live="polite"
        >
          {body.length}/{MAX_BODY_LENGTH}
        </Text>
        <Button type="button" variant="invisible" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || isTooLong || !title.trim() || !body.trim()}
        >
          {isSubmitting ? "Publicando..." : "Publicar experiência"}
        </Button>
      </div>
    </form>
  );
}

function PublishedNotice({ content }) {
  const noticeRef = useRef(null);
  const rewardId = `cq-published-${useId().replace(/:/g, "")}`;
  const { reward } = useReward(rewardId, "confetti", {
    position: "absolute",
    lifetime: 100,
    elementCount: 70,
    spread: 70,
  });

  useEffect(() => {
    noticeRef.current?.focus();
    if (!prefersReducedMotion()) {
      reward();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id]);

  return (
    <div
      ref={noticeRef}
      tabIndex={-1}
      className={styles.publishedNotice}
      role="status"
    >
      <span id={rewardId} className={styles.rewardAnchor} aria-hidden="true" />
      <CheckCircleFillIcon size={16} aria-hidden="true" />
      <span>
        Sua experiência foi publicada e já aparece para a comunidade.{" "}
        <Link href={`/${content.owner_username}/${content.slug}`}>
          Ver publicação
        </Link>
      </span>
    </div>
  );
}

function Contributions({ question, newContribution }) {
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const counts = question.contributions_by_category || {};
  const totalContributions = Object.values(counts).reduce(
    (sum, value) => sum + Number(value),
    0,
  );
  const labelOf = (slug) =>
    question.categories?.find((item) => item.slug === slug)?.label ?? slug;

  const load = useCallback(
    async (nextPage, append) => {
      setErrorMessage(null);
      try {
        const params = new URLSearchParams({ page: String(nextPage) });
        if (filter) params.set("category", filter);
        const response = await fetch(
          `/api/v1/community-questions/${question.id}/contributions?${params}`,
        );
        if (!response.ok) {
          setErrorMessage("Não foi possível carregar as experiências.");
          if (!append) setItems([]);
          return;
        }
        const data = await response.json();
        setTotal(Number(response.headers.get("X-Total-Count") || 0));
        setItems((current) => (append ? [...(current || []), ...data] : data));
        setPage(nextPage);
      } catch {
        setErrorMessage("Sem conexão para carregar as experiências.");
        if (!append) setItems([]);
      }
    },
    [filter, question.id],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  // A publicação recém-criada entra no topo sem recarregar a lista.
  useEffect(() => {
    if (!newContribution) return;
    if (filter && newContribution.community_question_category !== filter) {
      return;
    }
    setItems((current) => {
      const list = current || [];
      if (list.some((item) => item.id === newContribution.id)) return list;
      return [{ ...newContribution, children_count: 0 }, ...list];
    });
    setTotal((current) => current + 1);
  }, [newContribution, filter]);

  async function handleLoadMore() {
    setIsLoadingMore(true);
    await load(page + 1, true);
    setIsLoadingMore(false);
  }

  const categoriesWithContributions = Object.keys(counts).filter(
    (slug) => Number(counts[slug]) > 0,
  );

  return (
    <div className={styles.contributions}>
      <div className={styles.contributionsHeader}>
        <h3 className={styles.contributionsTitle}>
          Experiências da comunidade
          {totalContributions > 0 && (
            <span className={styles.counter}>{totalContributions}</span>
          )}
        </h3>
        {categoriesWithContributions.length > 1 && (
          <div
            className={styles.filters}
            role="group"
            aria-label="Filtrar por tema"
          >
            <button
              type="button"
              className={`${styles.chip} ${filter === "" ? styles.chipSelected : ""}`}
              aria-pressed={filter === ""}
              onClick={() => setFilter("")}
            >
              Todas
            </button>
            {categoriesWithContributions.map((slug) => (
              <button
                key={slug}
                type="button"
                className={`${styles.chip} ${filter === slug ? styles.chipSelected : ""}`}
                aria-pressed={filter === slug}
                onClick={() => setFilter(slug)}
              >
                {labelOf(slug)}{" "}
                <span className={styles.muted}>{counts[slug]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {errorMessage && (
        <Flash variant="danger" className={styles.inlineFlash}>
          {errorMessage}{" "}
          <Button size="small" onClick={() => load(1, false)}>
            Tentar novamente
          </Button>
        </Flash>
      )}

      {items === null && !errorMessage && <Spinner size="small" />}

      {items && items.length === 0 && !errorMessage && (
        <p className={styles.emptyContributions}>
          Ninguém contou ainda. A sua pode ser a primeira referência sobre isso
          aqui no AgroTab.
        </p>
      )}

      {items && items.length > 0 && (
        <ul className={styles.contributionList}>
          {items.map((item) => (
            <li
              key={item.id}
              className={`${styles.contribution} ${item.id === newContribution?.id ? styles.contributionNew : ""}`}
            >
              <Link
                href={`/${item.owner_username}/${item.slug}`}
                className={styles.contributionTitle}
              >
                {item.title}
              </Link>
              <div className={styles.contributionMeta}>
                <span className={styles.metaCategory}>
                  {labelOf(item.community_question_category)}
                </span>
                <span>
                  {pluralize(item.tabcoins ?? 0, "agrocoin", "agrocoins")}
                </span>
                <span>
                  <CommentIcon size={12} aria-hidden="true" />{" "}
                  {pluralize(
                    item.children_count ?? 0,
                    "comentário",
                    "comentários",
                  )}
                </span>
                <Link href={`/${item.owner_username}`}>
                  {item.owner_username}
                </Link>
                <PastTime date={item.published_at} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {items && items.length < total && (
        <Button
          size="small"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className={styles.loadMore}
        >
          {isLoadingMore ? "Carregando..." : "Ver mais experiências"}
        </Button>
      )}
    </div>
  );
}
