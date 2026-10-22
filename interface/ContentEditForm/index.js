import { useState } from "react";
import {
  Button,
  Flash,
  FormControl,
  Stack,
  Text,
  TextInput,
} from "@primer/react";
import ContentEditor from "interface/ContentEditor";
import TagPicker from "interface/TagPicker";

const MAX_BODY_LENGTH = 20000;

export default function ContentEditForm({ content, onCancel, onSaved }) {
  const isComment = Boolean(content.parent_id);
  const [title, setTitle] = useState(content.title || "");
  const [body, setBody] = useState(content.body || "");
  const [tags, setTags] = useState(
    (content.tags || []).map((contentTag) => contentTag.slug),
  );
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTooLong = body.length > MAX_BODY_LENGTH;
  const missingTitle = !isComment && !title.trim();
  const missingBody = !body.trim();

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/v1/contents/${encodeURIComponent(content.owner_username)}/${encodeURIComponent(content.slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isComment ? { body } : { title: title.trim(), body, tags },
          ),
        },
      );
      const responseBody = await response.json();

      if (response.ok) {
        onSaved(responseBody);
        return;
      }

      setErrorMessage(
        responseBody.message || "Não foi possível salvar a edição.",
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
        {errorMessage && (
          <Flash variant="danger" role="alert">
            {errorMessage}
          </Flash>
        )}

        {!isComment && (
          <FormControl required>
            <FormControl.Label>Título</FormControl.Label>
            <TextInput
              value={title}
              maxLength={256}
              onChange={(event) => setTitle(event.target.value)}
              block
            />
          </FormControl>
        )}

        {!isComment && (
          <Stack gap="condensed">
            <Text sx={{ fontWeight: "bold", fontSize: 1 }}>Tags</Text>
            <TagPicker value={tags} onChange={setTags} />
          </Stack>
        )}

        <FormControl required>
          <FormControl.Label>
            {isComment ? "Comentário" : "Conteúdo"}
          </FormControl.Label>
          <ContentEditor
            value={body}
            onChange={setBody}
            label={isComment ? "Comentário" : "Conteúdo"}
            initialHeight="40vh"
            isInvalid={isTooLong}
            autofocus={false}
          />
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

        <Stack direction="horizontal" gap="condensed">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isTooLong || missingTitle || missingBody}
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
