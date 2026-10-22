import { useId, useState } from "react";
import { useReward } from "react-rewards";
import { Button, Flash, FormControl, Text } from "@primer/react";
import ContentEditor from "interface/ContentEditor";
import styles from "./index.module.css";

const MAX_LENGTH = 20000;

export default function CommentForm({ parentId, onCreated, onCancel }) {
  const rewardAnchorId = useId().replace(/:/g, "");
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTooLong = body.length > MAX_LENGTH;
  const { reward: rewardPublish } = useReward(
    `comment-reward-${rewardAnchorId}`,
    "confetti",
    {
      position: "absolute",
      lifetime: 100,
      decay: 0.9,
      spread: 70,
      elementCount: 80,
    },
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (isTooLong) {
      setErrorMessage(
        `O comentário ultrapassa o limite de ${MAX_LENGTH} caracteres.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: parentId, body }),
      });
      const responseBody = await response.json();

      if (response.status === 201) {
        setBody("");
        rewardPublish();
        onCreated(responseBody);
        return;
      }

      setErrorMessage(
        responseBody.message || "Não foi possível comentar. Tente novamente.",
      );
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
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
      className={styles.form}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      {errorMessage && (
        <Flash variant="danger" role="alert">
          {errorMessage}
        </Flash>
      )}
      <FormControl required>
        <FormControl.Label>Seu comentário</FormControl.Label>
        <ContentEditor
          value={body}
          onChange={setBody}
          isInvalid={isTooLong}
          label="Seu comentário"
        />
      </FormControl>
      <div className={styles.actions}>
        <Text
          className={isTooLong ? styles.countOver : styles.count}
          aria-live="polite"
        >
          {body.length}/{MAX_LENGTH}
        </Text>
        <Button type="button" variant="invisible" onClick={onCancel}>
          Cancelar
        </Button>
        <span className={styles.publishWrap}>
          <span
            id={`comment-reward-${rewardAnchorId}`}
            className={styles.rewardAnchor}
            aria-hidden="true"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || body.trim().length === 0 || isTooLong}
          >
            {isSubmitting ? "Publicando..." : "Publicar"}
          </Button>
        </span>
      </div>
    </form>
  );
}
