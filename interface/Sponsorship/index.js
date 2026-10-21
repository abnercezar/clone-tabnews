import { LinkExternalIcon } from "@primer/octicons-react";
import { useConfirmDialog } from "interface/ConfirmDialog";
import useUser from "interface/useUser";
import styles from "./index.module.css";

export default function Sponsorship({ sponsorship, onRemoved }) {
  const { user } = useUser();
  const confirm = useConfirmDialog();

  if (!sponsorship) {
    return null;
  }

  async function handleRemove() {
    const confirmed = await confirm({
      title: "Remover este patrocínio?",
      body: "O anúncio deixa de aparecer na publicação.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/v1/sponsorships/${sponsorship.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      onRemoved?.();
    }
  }

  let hostname = sponsorship.url;

  try {
    hostname = new URL(sponsorship.url).hostname.replace(/^www\./, "");
  } catch {
    hostname = "";
  }

  return (
    <div className={styles.slot}>
      <a
        className={styles.link}
        href={sponsorship.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {sponsorship.title}
        {hostname ? ` (${hostname})` : ""} <LinkExternalIcon size={14} />
      </a>
      <div className={styles.credit}>
        Contribuindo com {sponsorship.owner_username}
        {user?.id === sponsorship.owner_id && (
          <button
            type="button"
            className={styles.remove}
            onClick={handleRemove}
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
