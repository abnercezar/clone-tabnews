import { useRouter } from "next/router";
import { useEffect } from "react";

export default function ModeracaoUsuariosIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/moderacao/usuarios/1");
  }, [router]);

  return null;
}
