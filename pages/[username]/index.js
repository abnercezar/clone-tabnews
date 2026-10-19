import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  ActionList,
  ActionMenu,
  Button,
  Flash,
  Heading,
  IconButton,
  Label,
  LabelGroup,
  LinkButton,
  Spinner,
  Stack,
  Text,
} from "@primer/react";
import {
  CircleSlashIcon,
  GearIcon,
  KebabHorizontalIcon,
} from "@primer/octicons-react";
import AgroCashCount from "interface/AgroCashCount";
import AgroCoinCount from "interface/AgroCoinCount";
import ContentList from "interface/ContentList";
import DefaultLayout from "interface/DefaultLayout";
import PastTime from "interface/PastTime";
import useUser from "interface/useUser";
import classes from "./index.module.css";

const PER_PAGE = 30;
const USERNAME_REGEX = /^[a-zA-Z0-9]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;

function isValidUsername(username) {
  return (
    typeof username === "string" &&
    username.length >= USERNAME_MIN &&
    username.length <= USERNAME_MAX &&
    USERNAME_REGEX.test(username)
  );
}

export default function UserProfilePage() {
  const router = useRouter();
  const usernameParam =
    typeof router.query.username === "string" ? router.query.username : "";
  const { user, isLoading: isLoadingSession } = useUser();

  const [userFound, setUserFound] = useState(null);
  const [contents, setContents] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [globalMessage, setGlobalMessage] = useState(null);

  useEffect(() => {
    setPage(1);
    setUserFound(null);
    setContents(null);
    setNotFound(false);
    setErrorMessage(null);
    setGlobalMessage(null);
  }, [usernameParam]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (!isValidUsername(usernameParam)) {
      setNotFound(true);
      return;
    }

    async function loadUser() {
      try {
        const response = await fetch(
          `/api/v1/users/${encodeURIComponent(usernameParam)}`,
        );

        if (response.status === 404) {
          setNotFound(true);
          return;
        }

        if (!response.ok) {
          setErrorMessage("Não foi possível carregar o perfil.");
          return;
        }

        setNotFound(false);
        setUserFound(await response.json());
      } catch {
        setErrorMessage("Não foi possível conectar ao AgroTab.");
      }
    }

    loadUser();
  }, [router.isReady, usernameParam]);

  useEffect(() => {
    if (!router.isReady || !isValidUsername(usernameParam) || notFound) {
      return;
    }

    async function loadContents() {
      try {
        const params = new URLSearchParams({
          username: usernameParam,
          page: String(page),
          per_page: String(PER_PAGE),
          strategy: "new",
        });

        const response = await fetch(`/api/v1/contents?${params}`);
        if (!response.ok) {
          setContents([]);
          return;
        }

        setTotal(Number(response.headers.get("X-Total-Count") || 0));
        setContents(await response.json());
      } catch {
        setContents([]);
      }
    }

    loadContents();
  }, [router.isReady, usernameParam, page, notFound]);

  if (
    !router.isReady ||
    (isValidUsername(usernameParam) && !userFound && !notFound && !errorMessage)
  ) {
    return (
      <DefaultLayout metadata={{ title: "Perfil" }}>
        <Spinner />
      </DefaultLayout>
    );
  }

  if (notFound) {
    return (
      <DefaultLayout
        metadata={{
          title: "Perfil não encontrado",
          description: "Este perfil não existe no AgroTab.",
        }}
      >
        <Stack gap="normal" align="center" className={classes.emptyState}>
          <Heading as="h1" variant="medium">
            Perfil não encontrado
          </Heading>
          <Text as="p">
            Não encontramos ninguém com esse nome de usuário na lavoura.
          </Text>
          <LinkButton href="/" variant="primary">
            Voltar para o feed
          </LinkButton>
        </Stack>
      </DefaultLayout>
    );
  }

  if (errorMessage) {
    return (
      <DefaultLayout metadata={{ title: "Perfil" }}>
        <Flash variant="danger">{errorMessage}</Flash>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout
      metadata={{
        title: userFound.username,
        description: `Acompanhe as publicações de ${userFound.username} sobre o agronegócio no AgroTab.`,
      }}
    >
      {globalMessage && (
        <Flash variant={globalMessage.type} className={classes.mainFlash}>
          {globalMessage.text}
        </Flash>
      )}

      <UserProfile
        userFound={userFound}
        viewer={user}
        isLoadingSession={isLoadingSession}
        onNuke={setUserFound}
        setGlobalMessage={setGlobalMessage}
      />

      <Heading as="h2" variant="small" className={classes.contentsHeading}>
        Publicações
      </Heading>

      {!contents && <Spinner />}

      {contents && contents.length === 0 && (
        <Stack gap="normal" align="center" className={classes.emptyState}>
          <Text as="p">
            {userFound.username} ainda não publicou no AgroTab.
          </Text>
        </Stack>
      )}

      {contents && contents.length > 0 && (
        <ContentList contentList={contents} />
      )}

      {total > PER_PAGE && (
        <Stack direction="horizontal" gap="condensed" justify="center">
          <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anteriores
          </Button>
          <Button
            disabled={page * PER_PAGE >= total}
            onClick={() => setPage(page + 1)}
          >
            Próximos
          </Button>
        </Stack>
      )}
    </DefaultLayout>
  );
}

function UserProfile({
  userFound,
  viewer,
  isLoadingSession,
  onNuke,
  setGlobalMessage,
}) {
  const isAuthenticatedUser = viewer && viewer.username === userFound.username;
  const canUpdate =
    isAuthenticatedUser && viewer?.features?.includes("update:user");

  return (
    <>
      <div className={classes.header}>
        <Heading as="h1" className={classes.title}>
          {userFound.username}
        </Heading>
        <UserFeatures userFound={userFound} />
        {!isLoadingSession && (
          <OptionsMenu
            canUpdate={canUpdate}
            isAuthenticatedUser={isAuthenticatedUser}
            onNuke={onNuke}
            setGlobalMessage={setGlobalMessage}
            viewer={viewer}
            userFound={userFound}
          />
        )}
      </div>

      <div className={classes.statsRow}>
        <div className={classes.statsGroup}>
          {userFound.tabcoins !== undefined && (
            <AgroCoinCount amount={userFound.tabcoins} mode="full" />
          )}
          {userFound.tabcash !== undefined && (
            <AgroCashCount amount={userFound.tabcash} mode="full" />
          )}
          <div className={classes.pastTimeWrapper}>
            <PastTime
              date={userFound.created_at}
              formatText={(duration) => `Membro há ${duration}`}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function UserFeatures({ userFound }) {
  if (!userFound?.features?.includes("nuked")) {
    return null;
  }

  return (
    <LabelGroup className={classes.featuresGroup}>
      <Label variant="danger">nuked</Label>
    </LabelGroup>
  );
}

function OptionsMenu({
  canUpdate,
  isAuthenticatedUser,
  onNuke,
  setGlobalMessage,
  viewer,
  userFound,
}) {
  const canNuke =
    !isAuthenticatedUser &&
    viewer?.features?.includes("ban:user") &&
    !userFound?.features?.includes("nuked");

  if (!canNuke && !canUpdate) {
    return null;
  }

  async function handleNuke() {
    setGlobalMessage(null);

    const confirmDelete1 = window.confirm(
      `Atenção: Você está realizando um Nuke!\n\nDeseja banir o usuário "${userFound.username}" e desfazer todas as suas ações?`,
    );

    if (!confirmDelete1) {
      return;
    }

    // Fake delay to avoid multiple accidental clicks
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const confirmDelete2 = window.confirm(
      `Nuke em "${userFound.username}"\n\nConfirme novamente esta operação.`,
    );

    if (!confirmDelete2) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/users/${encodeURIComponent(userFound.username)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ban_type: "nuke" }),
        },
      );

      const responseBody = await response.json();

      if (response.status === 200) {
        onNuke(responseBody);
        return;
      }

      setGlobalMessage({
        type: "danger",
        text:
          responseBody.message ||
          "Não foi possível banir este usuário permanentemente.",
      });
    } catch {
      setGlobalMessage({
        type: "danger",
        text: "Não foi possível conectar ao AgroTab. Verifique sua conexão.",
      });
    }
  }

  return (
    <ActionMenu>
      <ActionMenu.Anchor>
        <IconButton
          className={classes.optionsButton}
          size="small"
          icon={KebabHorizontalIcon}
          aria-label="Opções do usuário"
        />
      </ActionMenu.Anchor>
      <ActionMenu.Overlay>
        <ActionList>
          {canUpdate && (
            <ActionList.LinkItem href="/perfil">
              <ActionList.LeadingVisual>
                <GearIcon />
              </ActionList.LeadingVisual>
              Editar perfil
            </ActionList.LinkItem>
          )}
          {canNuke && (
            <ActionList.Item variant="danger" onSelect={handleNuke}>
              <ActionList.LeadingVisual>
                <CircleSlashIcon />
              </ActionList.LeadingVisual>
              Nuke
            </ActionList.Item>
          )}
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}
