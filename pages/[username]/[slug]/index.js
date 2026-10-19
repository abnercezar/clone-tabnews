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
  ShareIcon,
  TrashIcon,
} from "@primer/octicons-react";
import DefaultLayout from "interface/DefaultLayout";
import Confetti from "interface/Confetti";
import PastTime from "interface/PastTime";
import Sponsorship from "interface/Sponsorship";
import CommentForm from "interface/CommentForm";
import TabCoinButtons from "interface/TabCoinButtons";
import useUser from "interface/useUser";
import { formatReadingTime } from "interface/readingTime";
import { splitComment } from "interface/commentText";
import ui from "interface/styles.module.css";

export default function ContentPage() {
  const router = useRouter();
  const { username, slug, publicado, primeira } = router.query;
  const { user, isLoading: isLoadingUser } = useUser();
  const [content, setContent] = useState(null);
  const [comments, setComments] = useState([]);
  const [sponsorship, setSponsorship] = useState(null);
  const [isReplyingToPost, setIsReplyingToPost] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

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
  }, [username, slug]);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Excluir esta publicação? Essa ação não pode ser desfeita.",
    );
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
        title: content ? content.title : "Conteúdo",
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
                    <span className={ui.authorLabel}>
                      {content.owner_username}
                    </span>
                    <span>{formatReadingTime(content.body)}</span>
                    <span>·</span>
                    <PastTime date={content.published_at} />
                  </div>
                  {user?.id === content.owner_id && (
                    <ContentOptionsMenu onDelete={handleDelete} />
                  )}
                </div>
                <Heading as="h1" className={ui.articleTitle}>
                  {content.title}
                </Heading>
                <Text as="p" className={ui.contentBody}>
                  {content.body}
                </Text>
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
      </Stack>
    </DefaultLayout>
  );
}

function CommentItem({ comment: initialComment, user, router, isLoadingUser }) {
  const [comment, setComment] = useState(initialComment);
  const [replies, setReplies] = useState([]);
  const [isReplying, setIsReplying] = useState(false);
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
        <div className={ui.contentMetadata}>
          <span className={ui.authorLabel}>{comment.owner_username}</span>
          <span>·</span>
          <PastTime date={comment.published_at} />
        </div>
        <Text className={ui.commentTitle}>{parts.title}</Text>
        {parts.body && (
          <Text as="p" className={ui.contentBody}>
            {parts.body}
          </Text>
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
        {replies.map((reply) => {
          const replyParts = splitComment(reply.body);
          return (
            <article
              key={reply.id}
              id={`comentario-${reply.id}`}
              className={ui.reply}
            >
              <Stack gap="condensed">
                <div className={ui.contentMetadata}>
                  <span className={ui.authorLabel}>{reply.owner_username}</span>
                  <span>·</span>
                  <PastTime date={reply.published_at} />
                </div>
                <Text className={ui.commentTitle}>{replyParts.title}</Text>
                {replyParts.body && (
                  <Text as="p" className={ui.contentBody}>
                    {replyParts.body}
                  </Text>
                )}
              </Stack>
            </article>
          );
        })}
      </Stack>
    </article>
  );
}

function ContentOptionsMenu({ onDelete }) {
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
            <ActionList.Item variant="danger" onSelect={onDelete}>
              <ActionList.LeadingVisual>
                <TrashIcon />
              </ActionList.LeadingVisual>
              Apagar
            </ActionList.Item>
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
      router.push("/login");
      return;
    }

    if (!user.features?.includes("create:content")) {
      return;
    }

    onOpen();
  }

  const canReply = !user || user.features?.includes("create:content");

  if (!canReply && !children) {
    return null;
  }

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
        <ShareButton username={username} slug={slug} title={title} />
      </div>
      {children}
    </div>
  );
}

function ShareButton({ username, slug, title }) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/${username}/${slug}`;
    const shareTitle = title || "AgroTab";

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url });
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <Tooltip text="Compartilhar" direction="n">
      <Button
        onClick={handleShare}
        aria-label={isCopied ? "Link copiado!" : "Compartilhar"}
      >
        {isCopied ? (
          <span className={ui.linkCopied} role="status">
            Link copiado!
          </span>
        ) : (
          <ShareIcon size={16} aria-hidden="true" />
        )}
      </Button>
    </Tooltip>
  );
}
