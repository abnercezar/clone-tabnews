import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  ActionList,
  ActionMenu,
  Banner,
  Button,
  Flash,
  Heading,
  IconButton,
  Link,
  Spinner,
  Stack,
  Text,
  Tooltip,
} from "@primer/react";
import {
  KebabHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "@primer/octicons-react";
import { useConfirmDialog } from "interface/ConfirmDialog";
import DefaultLayout from "interface/DefaultLayout";
import Confetti from "interface/Confetti";
import MarkdownViewer from "interface/MarkdownViewer";
import PastTime from "interface/PastTime";
import Sponsorship from "interface/Sponsorship";
import CommentForm from "interface/CommentForm";
import ShareButtons from "interface/ShareButtons";
import AuthorCredential from "interface/AuthorCredential";
import TagList from "interface/TagList";
import ContentEditForm from "interface/ContentEditForm";
import TabCoinButtons from "interface/TabCoinButtons";
import { loginHref } from "interface/loginRedirect";
import useUser from "interface/useUser";
import { formatReadingTime } from "interface/readingTime";
import { splitComment } from "interface/commentText";
import { createExcerpt } from "interface/excerpt";
import ui from "interface/styles.module.css";
import controller from "infra/controller.js";
import webserver from "infra/webserver";
import { NotFoundError } from "infra/errors.js";
import authorization from "models/authorization.js";
import contentModel from "models/content.js";

// Remonta a página a cada post: navegar de um post para outro não mostra
// conteúdo, comentários nem respostas do post anterior.
export default function ContentRoute(props) {
  const { query } = useRouter();

  return <ContentPage key={`${query.username}/${query.slug}`} {...props} />;
}

function ContentPage({
  initialContent = null,
  initialComments = [],
  notFound = false,
}) {
  const router = useRouter();
  const { username, slug, publicado, primeira } = router.query;
  const { user, isLoading: isLoadingUser } = useUser();
  const confirm = useConfirmDialog();
  const [content, setContent] = useState(initialContent);
  const [comments, setComments] = useState(initialComments);
  const [sponsorship, setSponsorship] = useState(null);
  const [isReplyingToPost, setIsReplyingToPost] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    notFound ? "Conteúdo não encontrado." : null,
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (publicado === "1") {
      setShowConfetti(true);
    }
  }, [publicado]);

  useEffect(() => {
    if (!username || !slug) {
      return;
    }

    async function loadContent() {
      try {
        // Conteúdo já veio do servidor (SSR): só busca o que depende do cliente.
        if (notFound) {
          setContent(null);
          setErrorMessage("Conteúdo não encontrado.");
          return;
        }

        if (initialContent) {
          setContent(initialContent);
          setErrorMessage(null);
        } else {
          const response = await fetch(`/api/v1/contents/${username}/${slug}`);
          if (response.status === 404) {
            setErrorMessage("Conteúdo não encontrado.");
            return;
          }
          if (!response.ok) {
            setErrorMessage("Não foi possível carregar o conteúdo.");
            return;
          }
          const contentFound = await response.json();
          setContent(contentFound);
        }

        const commentsResponse = await fetch(
          `/api/v1/contents/${username}/${slug}/children`,
        );
        if (commentsResponse.ok) {
          setComments(await commentsResponse.json());
        }

        const sponsorshipResponse = await fetch("/api/v1/sponsorships");
        if (sponsorshipResponse.ok) {
          const sponsorships = await sponsorshipResponse.json();
          setSponsorship(sponsorships[0] || null);
        }
      } catch {
        setErrorMessage("Não foi possível conectar ao servidor.");
      }
    }
    loadContent();
  }, [username, slug, initialContent, notFound]);

  async function handleDelete() {
    const confirmed = await confirm({
      title: "Excluir esta publicação?",
      body: "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/v1/contents/${username}/${slug}`, {
      method: "DELETE",
    });

    if (response.ok) {
      location.href = "/";
      return;
    }

    setErrorMessage("Não foi possível excluir a publicação.");
  }

  return (
    <DefaultLayout
      contentWidth="large"
      metadata={{
        title: content
          ? content.title
          : notFound
            ? "Conteúdo não encontrado"
            : "Conteúdo",
        description: content ? createExcerpt(content.body) : undefined,
        type: content ? "article" : undefined,
        author: content?.owner_username,
        canonicalPath: content
          ? `/${content.owner_username}/${content.slug}`
          : undefined,
        publishedTime: content?.published_at,
        image: content ? ogImagePath(content) : undefined,
        jsonLd: content ? buildJsonLd(content, comments) : undefined,
      }}
    >
      {showConfetti && <Confetti />}

      <Stack gap="normal">
        {primeira === "1" && (
          <Banner
            variant="success"
            title="Sua primeira publicação no AgroTab"
            description="Ela já está no feed para a comunidade ler."
          />
        )}

        {publicado === "1" && primeira !== "1" && (
          <Banner variant="success" title="Publicação feita" />
        )}

        {errorMessage && (
          <Stack gap="normal">
            <Flash variant="danger">{errorMessage}</Flash>
            <Link href="/">Voltar para os conteúdos</Link>
          </Stack>
        )}

        {!content && !errorMessage && <Spinner />}

        {content && (
          <article className={ui.contentWithVotes}>
            <TabCoinButtons
              content={content}
              onBalanceChange={(nextContent) =>
                setContent({ ...content, ...nextContent })
              }
            />
            <div className={ui.contentWithVotesBody}>
              <Stack gap="normal">
                <div className={ui.contentMetadataRow}>
                  <div className={ui.contentMetadata}>
                    <Link
                      className={ui.authorLabel}
                      href={`/${encodeURIComponent(content.owner_username)}`}
                    >
                      {content.owner_username}
                    </Link>
                    <AuthorCredential
                      occupation={content.owner_occupation}
                      state={content.owner_state}
                      founder={content.owner_founder}
                    />
                    <span>·</span>
                    <span>{formatReadingTime(content.body)}</span>
                    <span>·</span>
                    <PastTime date={content.published_at} />
                  </div>
                  {(canEditContent(user, content) ||
                    user?.id === content.owner_id) &&
                    !isEditing && (
                      <ContentOptionsMenu
                        onEdit={
                          canEditContent(user, content)
                            ? () => setIsEditing(true)
                            : undefined
                        }
                        onDelete={
                          user?.id === content.owner_id
                            ? handleDelete
                            : undefined
                        }
                      />
                    )}
                </div>
                {isEditing ? (
                  <ContentEditForm
                    content={content}
                    onCancel={() => setIsEditing(false)}
                    onSaved={(updated) => {
                      setIsEditing(false);
                      if (
                        updated.slug !== content.slug ||
                        updated.owner_username !== content.owner_username
                      ) {
                        router.replace(
                          `/${updated.owner_username}/${updated.slug}`,
                        );
                        return;
                      }
                      setContent(updated);
                    }}
                  />
                ) : (
                  <>
                    <Heading as="h1" className={ui.articleTitle}>
                      {content.title}
                    </Heading>
                    <TagList tags={content.tags} />
                    <div className={ui.contentBody}>
                      <MarkdownViewer value={content.body} rich />
                    </div>
                  </>
                )}
              </Stack>
            </div>
          </article>
        )}

        {content && (
          <ReplyBox
            framed
            isOpen={isReplyingToPost}
            onOpen={() => setIsReplyingToPost(true)}
            username={content.owner_username}
            slug={content.slug}
            title={content.title}
            user={user}
            router={router}
            isLoadingUser={isLoadingUser}
          >
            {isReplyingToPost && (
              <CommentForm
                parentId={content.id}
                onCancel={() => setIsReplyingToPost(false)}
                onCreated={(comment) => {
                  setComments([...comments, comment]);
                  setIsReplyingToPost(false);
                }}
              />
            )}
          </ReplyBox>
        )}

        {content && (
          <Sponsorship
            sponsorship={sponsorship}
            onRemoved={() => setSponsorship(null)}
          />
        )}

        {content && (
          <section id="comentarios">
            <Stack gap="normal">
              <Heading as="h2" variant="small">
                Comentários ({comments.length})
              </Heading>

              {comments.length === 0 && (
                <Text className={ui.muted}>
                  Nenhum comentário ainda. Seja o primeiro a comentar.
                </Text>
              )}

              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  user={user}
                  router={router}
                  isLoadingUser={isLoadingUser}
                />
              ))}
            </Stack>
          </section>
        )}

        {content && (
          <nav aria-label="Continuar lendo" className={ui.continueReading}>
            <Link href={`/${encodeURIComponent(content.owner_username)}`}>
              Mais publicações de {content.owner_username}
            </Link>
            <Link href="/#publicacoes">Voltar para o feed</Link>
          </nav>
        )}
      </Stack>
    </DefaultLayout>
  );
}

function CommentItem({ comment: initialComment, user, router, isLoadingUser }) {
  const [comment, setComment] = useState(initialComment);
  const [replies, setReplies] = useState([]);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const parts = splitComment(comment.body);

  useEffect(() => {
    let ignore = false;

    async function loadReplies() {
      const response = await fetch(
        `/api/v1/contents/${comment.owner_username}/${comment.slug}/children`,
      );
      if (!response.ok || ignore) {
        return;
      }
      const body = await response.json();
      if (!ignore) {
        setReplies(body);
      }
    }

    loadReplies();
    return () => {
      ignore = true;
    };
  }, [comment.owner_username, comment.slug]);

  return (
    <article id={`comentario-${comment.id}`} className={ui.commentWithVotes}>
      <TabCoinButtons
        content={comment}
        onBalanceChange={(nextComment) =>
          setComment({ ...comment, ...nextComment })
        }
      />
      <Stack gap="condensed" className={ui.contentWithVotesBody}>
        <div className={ui.contentMetadataRow}>
          <div className={ui.contentMetadata}>
            <Link
              className={ui.authorLabel}
              href={`/${encodeURIComponent(comment.owner_username)}`}
            >
              {comment.owner_username}
            </Link>
            <AuthorCredential
              occupation={comment.owner_occupation}
              state={comment.owner_state}
              founder={comment.owner_founder}
            />
            <span>·</span>
            <PastTime date={comment.published_at} />
          </div>
          {canEditContent(user, comment) && !isEditing && (
            <ContentOptionsMenu onEdit={() => setIsEditing(true)} />
          )}
        </div>
        {isEditing ? (
          <ContentEditForm
            content={comment}
            onCancel={() => setIsEditing(false)}
            onSaved={(updated) => {
              setComment(updated);
              setIsEditing(false);
            }}
          />
        ) : (
          <div className={ui.contentBody}>
            <MarkdownViewer value={comment.body} rich />
          </div>
        )}
        <ReplyBox
          isOpen={isReplying}
          onOpen={() => setIsReplying(true)}
          username={comment.owner_username}
          slug={comment.slug}
          title={parts.title}
          user={user}
          router={router}
          isLoadingUser={isLoadingUser}
        >
          {isReplying && (
            <CommentForm
              parentId={comment.id}
              onCancel={() => setIsReplying(false)}
              onCreated={(reply) => {
                setReplies([...replies, reply]);
                setIsReplying(false);
              }}
            />
          )}
        </ReplyBox>
        {replies.map((reply) => (
          <ReplyItem key={reply.id} reply={reply} user={user} />
        ))}
      </Stack>
    </article>
  );
}

function ReplyItem({ reply: initialReply, user }) {
  const [reply, setReply] = useState(initialReply);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <article id={`comentario-${reply.id}`} className={ui.reply}>
      <Stack gap="condensed">
        <div className={ui.contentMetadataRow}>
          <div className={ui.contentMetadata}>
            <span className={ui.authorLabel}>{reply.owner_username}</span>
            <AuthorCredential
              occupation={reply.owner_occupation}
              state={reply.owner_state}
              founder={reply.owner_founder}
            />
            <span>·</span>
            <PastTime date={reply.published_at} />
          </div>
          {canEditContent(user, reply) && !isEditing && (
            <ContentOptionsMenu onEdit={() => setIsEditing(true)} />
          )}
        </div>
        {isEditing ? (
          <ContentEditForm
            content={reply}
            onCancel={() => setIsEditing(false)}
            onSaved={(updated) => {
              setReply(updated);
              setIsEditing(false);
            }}
          />
        ) : (
          <div className={ui.contentBody}>
            <MarkdownViewer value={reply.body} rich />
          </div>
        )}
      </Stack>
    </article>
  );
}

// Dados estruturados de fórum (schema.org) para o Google entender a
// conversa: pergunta, autor, data e respostas.
function buildJsonLd(content, comments) {
  const origin = webserver.canonicalOrigin;
  const person = (username) => ({
    "@type": "Person",
    name: username,
    url: `${origin}/${encodeURIComponent(username)}`,
  });
  const url = `${origin}/${content.owner_username}/${content.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": url,
    url,
    headline: content.title,
    text: createExcerpt(content.body, 5000),
    datePublished: content.published_at,
    dateModified: content.updated_at,
    author: person(content.owner_username),
    keywords:
      (content.tags || []).map((tag) => tag.label).join(", ") || undefined,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: comments.length,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: Math.max(0, Number(content.tabcoins_credit) || 0),
      },
    ],
    comment: comments.map((comment) => ({
      "@type": "Comment",
      url: `${url}#comentario-${comment.id}`,
      text: createExcerpt(comment.body, 2000),
      datePublished: comment.published_at,
      author: person(comment.owner_username),
    })),
  };
}

function ogImagePath(content) {
  const params = new URLSearchParams({
    username: content.owner_username,
    slug: content.slug,
    // Muda quando a publicação é editada: o WhatsApp e o CDN pegam a nova.
    v: String(new Date(content.updated_at).getTime() || 0),
  });
  return `/api/og?${params}`;
}

function canEditContent(user, content) {
  if (!user || !content) {
    return false;
  }

  if (user.id === content.owner_id) {
    return Boolean(user.features?.includes("update:content"));
  }

  return Boolean(user.features?.includes("update:content:others"));
}

function ContentOptionsMenu({ onEdit, onDelete }) {
  return (
    <div className={ui.contentOptions}>
      <ActionMenu>
        <ActionMenu.Anchor>
          <IconButton
            size="small"
            icon={KebabHorizontalIcon}
            aria-label="Opções da publicação"
            variant="invisible"
          />
        </ActionMenu.Anchor>
        <ActionMenu.Overlay>
          <ActionList>
            {onEdit && (
              <ActionList.Item onSelect={onEdit}>
                <ActionList.LeadingVisual>
                  <PencilIcon />
                </ActionList.LeadingVisual>
                Editar
              </ActionList.Item>
            )}
            {onDelete && (
              <ActionList.Item variant="danger" onSelect={onDelete}>
                <ActionList.LeadingVisual>
                  <TrashIcon />
                </ActionList.LeadingVisual>
                Apagar
              </ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </div>
  );
}

function ReplyBox({
  isOpen,
  onOpen,
  username,
  slug,
  title,
  user,
  router,
  isLoadingUser,
  children,
  framed = false,
}) {
  function handleReply() {
    if (isLoadingUser || isOpen) {
      return;
    }

    if (!user) {
      router.push(loginHref(router.asPath));
      return;
    }

    if (!user.features?.includes("create:content")) {
      return;
    }

    onOpen();
  }

  // Compartilhar fica sempre visível; responder só para quem pode publicar.
  const canReply = !user || user.features?.includes("create:content");

  return (
    <div className={framed ? ui.replyBoxFramed : ui.replyBox}>
      <div className={ui.replyActions}>
        {canReply && (
          <Tooltip text={`Responder para ${username}`} direction="n">
            <Button
              onClick={handleReply}
              disabled={isOpen}
              aria-expanded={isOpen}
            >
              Responder
            </Button>
          </Tooltip>
        )}
        <ShareButtons
          username={username}
          slug={slug}
          title={title}
          compact={!framed}
        />
      </div>
      {children}
    </div>
  );
}

// Renderiza o post (título, corpo e metatags) no servidor para buscadores e
// prévias de links (WhatsApp, redes sociais). Votos, comentários e patrocínio
// seguem no cliente. Atenção: models/infra só podem ser usados aqui dentro —
// usá-los no componente leva `pg` para o bundle do navegador.
export async function getServerSideProps({ params, res }) {
  try {
    const contentFound = await contentModel.findOneByUsernameAndSlug(
      params.username,
      params.slug,
    );
    const secureOutputValues = authorization.filterOutput(
      controller.createAnonymousUser(),
      "read:content",
      contentFound,
    );

    // Comentários no HTML: buscadores e conexões lentas já recebem a
    // conversa inteira, sem esperar o JavaScript.
    const children = await contentModel.findChildren(contentFound.id);
    const secureChildren = authorization.filterOutput(
      controller.createAnonymousUser(),
      "read:content",
      children,
    );

    return {
      props: {
        // Datas do banco viram string ISO, como na resposta da API.
        initialContent: JSON.parse(JSON.stringify(secureOutputValues)),
        initialComments: JSON.parse(JSON.stringify(secureChildren)),
      },
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.statusCode = 404;
      return { props: { notFound: true } };
    }

    // Falha no servidor não derruba a página: o cliente tenta pela API.
    console.error(error);
    return { props: {} };
  }
}
