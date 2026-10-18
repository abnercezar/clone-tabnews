import useSWR from "swr";

async function fetchUser(url) {
  const response = await fetch(url);

  if (response.status !== 200) {
    return null;
  }

  return response.json();
}

export default function useUser() {
  const { data, isLoading, mutate } = useSWR("/api/v1/user", fetchUser, {
    revalidateOnFocus: false,
  });

  return {
    user: data ?? null,
    isLoading,
    mutate,
  };
}
