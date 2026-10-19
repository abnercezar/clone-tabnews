import { Button, Label, Link, Stack } from "@primer/react";
import PastTime from "interface/PastTime";
import useUser from "interface/useUser";
import { useState } from "react";
import classes from "./index.module.css";

export default function UserListPaginated({
  userList,
  pagination,
  onUserNuked,
}) {
  const listNumberStart = pagination.perPage * (pagination.currentPage - 1) + 1;

  return (
    <>
      {userList?.length > 0 && (
        <UserList
          userList={userList}
          listNumberStart={listNumberStart}
          onUserNuked={onUserNuked}
        />
      )}

      {pagination.lastPage > 1 && (
        <Stack
          direction="horizontal"
          gap="condensed"
          justify="center"
          sx={{ mt: 3 }}
        >
          <Button
            as="a"
            href={
              pagination.previousPage
                ? `${pagination.basePath}/${pagination.previousPage}`
                : undefined
            }
            disabled={!pagination.previousPage}
          >
            Anteriores
          </Button>
          <Button
            as="a"
            href={
              pagination.nextPage
                ? `${pagination.basePath}/${pagination.nextPage}`
                : undefined
            }
            disabled={!pagination.nextPage}
          >
            Próximos
          </Button>
        </Stack>
      )}
    </>
  );
}

function UserList({ userList, listNumberStart, onUserNuked }) {
  return (
    <ol
      className={classes.list}
      key={`user-list-${listNumberStart}`}
      start={listNumberStart}
    >
      {userList.map((userObject) => (
        <UserListItem
          key={userObject.id}
          user={userObject}
          onUserNuked={onUserNuked}
        />
      ))}
    </ol>
  );
}

function UserListItem({ user, onUserNuked }) {
  const { user: loggedUser } = useUser();
  const [isNuking, setIsNuking] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const canNuke =
    loggedUser?.features?.includes("ban:user") &&
    loggedUser.id !== user.id &&
    !user.features?.includes("nuked");

  function getTabCoinsText(count) {
    return count > 1 || count < -1 ? `${count} AgroCoins` : `${count} AgroCoin`;
  }

  async function handleNuke() {
    const confirmDelete1 = window.confirm(
      `Atenção: Você está realizando um Nuke!\n\nDeseja banir permanentemente o usuário "${user.username}", expirar as sessões e despublicar os conteúdos?`,
    );

    if (!confirmDelete1) return;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const confirmDelete2 = window.confirm(
      `Nuke em "${user.username}"\n\nConfirme novamente esta operação.`,
    );

    if (!confirmDelete2) return;

    setIsNuking(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/users/${user.username}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ban_type: "nuke" }),
      });

      const responseBody = await response.json();

      if (response.status === 200) {
        onUserNuked?.(responseBody);
        return;
      }

      setErrorMessage(
        responseBody.message || "Não foi possível banir este usuário.",
      );
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
    } finally {
      setIsNuking(false);
    }
  }

  return (
    <li className={classes.item}>
      <div>
        <div className={classes.username}>
          <Link
            className={classes.link}
            href={`/?usuario=${encodeURIComponent(user.username)}`}
          >
            {user.username}
            {user.features?.includes("nuked") && (
              <Label variant="danger" className={classes.nukedLabel}>
                nuked
              </Label>
            )}
          </Link>
        </div>
        <div className={classes.metadata}>
          <span>
            Atualizado <PastTime date={user.updated_at} />
          </span>
          <span>·</span>
          <span>{getTabCoinsText(user.tabcoins)}</span>
          <span>·</span>
          <span>{user.tabcash} AgroCash</span>
        </div>
        {canNuke && (
          <div className={classes.actions}>
            <Button
              size="small"
              variant="danger"
              disabled={isNuking}
              onClick={handleNuke}
            >
              {isNuking ? "Banindo..." : "Banir"}
            </Button>
            {errorMessage && (
              <Label variant="danger" sx={{ ml: 2 }}>
                {errorMessage}
              </Label>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
