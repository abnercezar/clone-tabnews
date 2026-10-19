import { useRouter } from "next/router";
import { UnderlineNav } from "@primer/react";
import classes from "./index.module.css";

const TABS = [
  { href: "/recentes/todos/1", match: "/recentes/todos", label: "Todos" },
  {
    href: "/recentes/comentarios/1",
    match: "/recentes/comentarios",
    label: "Comentários",
  },
  {
    href: "/recentes/classificados/1",
    match: "/recentes/classificados",
    label: "Classificados",
  },
];

export default function RecentTabNav() {
  const { pathname } = useRouter();

  return (
    <UnderlineNav
      aria-label="Conteúdos recentes"
      className={classes.nav}
      variant="flush"
    >
      {TABS.map((tab) => (
        <UnderlineNav.Item
          key={tab.href}
          href={tab.href}
          aria-current={pathname.startsWith(tab.match) ? "page" : undefined}
        >
          {tab.label}
        </UnderlineNav.Item>
      ))}
    </UnderlineNav>
  );
}
