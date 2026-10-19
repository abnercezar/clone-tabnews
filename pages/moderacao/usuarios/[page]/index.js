import { Flash, Spinner, Stack, Text } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import UserList from "interface/UserList";
import useUser from "interface/useUser";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

const BASE_PATH = "/moderacao/usuarios";
const PER_PAGE = 30;

export default function ModeracaoUsuariosPage() {
  const { user, isLoading: userIsLoading } = useUser();
  const router = useRouter();
  const { page } = router.query;

  const [userList, setUserList] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    previousPage: null,
    nextPage: null,
    perPage: PER_PAGE,
    basePath: BASE_PATH,
  });

  const isLoading = userIsLoading || !page;
  const canListUsers = user?.features?.includes("read:user:list");
  const shouldFetch = !isLoading && canListUsers;

  const loadUsers = useCallback(async () => {
    if (!shouldFetch) return;

    try {
      const response = await fetch(
        `/api/v1/users?page=${page}&per_page=${PER_PAGE}`,
      );

      if (!response.ok) {
        setErrorMessage("Não foi possível carregar a lista de usuários.");
        setUserList([]);
        return;
      }

      const body = await response.json();
      const total = Number(response.headers.get("X-Total-Count") || 0);
      const currentPage = Number(response.headers.get("X-Page") || page || 1);
      const perPage = Number(response.headers.get("X-Per-Page") || PER_PAGE);
      const lastPage = Math.max(1, Math.ceil(total / perPage));

      if (body.length === 0 && currentPage > 1) {
        router.replace(`${BASE_PATH}/${lastPage}`);
        return;
      }

      setErrorMessage(null);
      setUserList(body);
      setPagination({
        currentPage,
        lastPage,
        previousPage: currentPage > 1 ? currentPage - 1 : null,
        nextPage: currentPage < lastPage ? currentPage + 1 : null,
        perPage,
        basePath: BASE_PATH,
      });
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
      setUserList([]);
    }
  }, [page, router, shouldFetch]);

  useEffect(() => {
    if (isLoading || shouldFetch) return;
    router.replace("/");
  }, [isLoading, router, shouldFetch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function handleUserNuked(nukedUser) {
    setUserList((current) =>
      (current || []).map((listedUser) =>
        listedUser.id === nukedUser.id
          ? {
              ...listedUser,
              features: nukedUser.features,
              updated_at: nukedUser.updated_at,
            }
          : listedUser,
      ),
    );
  }

  return (
    <DefaultLayout
      metadata={{
        title: `Página ${pagination.currentPage} · Usuários`,
        description: "Lista de usuários do AgroTab.",
      }}
    >
      {errorMessage && <Flash variant="danger">{errorMessage}</Flash>}

      {shouldFetch && userList === null && !errorMessage && (
        <Stack align="center">
          <Spinner />
          <Text>Carregando usuários...</Text>
        </Stack>
      )}

      {shouldFetch && userList && (
        <UserList
          userList={userList}
          pagination={pagination}
          onUserNuked={handleUserNuked}
        />
      )}

      {shouldFetch && userList?.length === 0 && !errorMessage && (
        <Text>Nenhum usuário encontrado.</Text>
      )}
    </DefaultLayout>
  );
}
