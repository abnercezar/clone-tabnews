import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  ActionList,
  ActionMenu,
  Header,
  IconButton,
  Link,
  SegmentedControl,
  Text,
  Tooltip,
  Truncate,
  useTheme,
} from "@primer/react";
import {
  GearIcon,
  ListUnorderedIcon,
  MoonIcon,
  PersonIcon,
  PlusIcon,
  ShieldLockIcon,
  SignOutIcon,
  SunIcon,
  ThreeBarsIcon,
} from "@primer/octicons-react";
import AgroCashCount from "interface/AgroCashCount";
import AgroCoinCount from "interface/AgroCoinCount";
import AgroTabLogo from "interface/AgroTabLogo";
import { writeColorMode } from "interface/colorMode";
import useSearchBox from "interface/SearchBox";
import useUser from "interface/useUser";
import styles from "./index.module.css";

const containerMaxWidth = {
  small: "544px",
  medium: "768px",
  large: "1012px",
};

export default function DefaultLayout({
  children,
  metadata = {},
  contentWidth = "large",
}) {
  const maxWidth = containerMaxWidth[contentWidth] ?? containerMaxWidth.large;

  return (
    <div className={styles.wrapper}>
      <Head>
        <title>
          {metadata.title ? `${metadata.title} · AgroTab` : "AgroTab"}
        </title>

        {metadata.description && (
          <meta name="description" content={metadata.description} />
        )}
      </Head>

      <SiteHeader />

      <main className={styles.main} style={{ maxWidth }}>
        {children}
      </main>

      <SiteFooter maxWidth={maxWidth} />
    </div>
  );
}

function SiteHeader() {
  const { asPath, pathname } = useRouter();
  const { user, isLoading } = useUser();
  const { SearchBarButton, SearchIconButton, SearchBoxOverlay } =
    useSearchBox();
  const isRelevantes =
    pathname === "/" || asPath === "/" || asPath.startsWith("/?");
  const isRecentes = pathname === "/recentes" || asPath.startsWith("/recentes");

  return (
    <Header as="header" className={styles.header}>
      <SearchBoxOverlay />

      <nav className={styles.nav}>
        <Header.Item className={styles.itemFlush}>
          <Header.Link
            href="/"
            aria-label="Página inicial Relevantes"
            aria-current={isRelevantes ? "page" : undefined}
          >
            <AgroTabLogo size={32} />
            <span className={styles.brand}>AgroTab</span>
            <span className={isRelevantes ? styles.activeLink : styles.navLink}>
              Relevantes
            </span>
          </Header.Link>
        </Header.Item>

        <Header.Item full className={styles.itemFlush}>
          <Header.Link
            href="/recentes"
            aria-current={isRecentes ? "page" : undefined}
            className={isRecentes ? styles.activeLink : styles.navLink}
          >
            Recentes
          </Header.Link>
        </Header.Item>
      </nav>

      {!isLoading && (
        <Header.Item className={styles.searchItem}>
          <SearchBarButton />
          <SearchIconButton />
        </Header.Item>
      )}

      {!isLoading && !user && (
        <>
          <Header.Item className={styles.itemMl2}>
            <Header.Link href="/login">Login</Header.Link>
          </Header.Item>
          <Header.Item className={styles.itemMr1}>
            <Header.Link href="/cadastro">Cadastrar</Header.Link>
          </Header.Item>
        </>
      )}

      {user && <UserMenu user={user} />}
    </Header>
  );
}

function UserMenu({ user }) {
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const profileHref = `/${encodeURIComponent(user.username)}`;

  async function handleLogout() {
    try {
      await fetch("/api/v1/sessions", { method: "DELETE" });
    } finally {
      location.href = "/";
    }
  }

  return (
    <>
      <Header.Item className={styles.itemM2}>
        <Tooltip text="Publicar novo conteúdo" direction="s">
          <Header.Link href="/publicar" aria-label="Publicar novo conteúdo">
            <PlusIcon />
          </Header.Link>
        </Tooltip>
      </Header.Item>

      <Header.Item className={styles.agroCoin}>
        <AgroCoinCount
          amount={user.tabcoins}
          href={profileHref}
          className={styles.agroCoinCount}
        />
      </Header.Item>

      <Header.Item className={styles.agroCash}>
        <AgroCashCount
          amount={user.tabcash}
          href={profileHref}
          className={styles.agroCashCount}
        />
      </Header.Item>

      <Header.Item className={styles.itemFlush}>
        <ActionMenu open={isOpenMenu} onOpenChange={setIsOpenMenu}>
          <ActionMenu.Anchor>
            <IconButton
              icon={ThreeBarsIcon}
              aria-label="Abrir o menu"
              variant="invisible"
              className={styles.menuButton}
            />
          </ActionMenu.Anchor>

          <ActionMenu.Overlay align="end">
            <ActionList>
              <ActionList.LinkItem href={profileHref}>
                <ActionList.LeadingVisual>
                  <PersonIcon />
                </ActionList.LeadingVisual>
                <Truncate title={user.username}>{user.username}</Truncate>
              </ActionList.LinkItem>
              <ActionList.Divider />
              <ActionList.LinkItem href="/publicar">
                <ActionList.LeadingVisual>
                  <PlusIcon />
                </ActionList.LeadingVisual>
                Novo conteúdo
              </ActionList.LinkItem>
              <ActionList.LinkItem href={profileHref}>
                <ActionList.LeadingVisual>
                  <ListUnorderedIcon />
                </ActionList.LeadingVisual>
                Meus conteúdos
              </ActionList.LinkItem>
              <ActionList.LinkItem href="/perfil">
                <ActionList.LeadingVisual>
                  <GearIcon />
                </ActionList.LeadingVisual>
                Editar perfil
              </ActionList.LinkItem>
              {user.features?.includes("read:user:list") && (
                <ActionList.LinkItem href="/moderacao/usuarios/1">
                  <ActionList.LeadingVisual>
                    <ShieldLockIcon />
                  </ActionList.LeadingVisual>
                  Moderação
                </ActionList.LinkItem>
              )}
              <ActionList.Divider />
              <ActionList.Item
                onSelect={(event) => {
                  event.preventDefault();
                }}
              >
                <ColorModeSwitch />
              </ActionList.Item>
              <ActionList.Divider />
              <ActionList.Item variant="danger" onSelect={handleLogout}>
                <ActionList.LeadingVisual>
                  <SignOutIcon />
                </ActionList.LeadingVisual>
                Deslogar
              </ActionList.Item>
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      </Header.Item>
    </>
  );
}

const COLOR_MODE_OPTIONS = ["night", "auto", "day"];

function ColorModeSwitch() {
  const { colorMode, setColorMode } = useTheme();
  const selected =
    colorMode === "night" || colorMode === "dark"
      ? "night"
      : colorMode === "day" || colorMode === "light"
        ? "day"
        : "auto";

  function handleChange(index) {
    const nextMode = COLOR_MODE_OPTIONS[index];
    setColorMode(nextMode);
    writeColorMode(nextMode);
  }

  return (
    <div className={styles.colorModeRow}>
      <SegmentedControl aria-label="Tema" size="small" onChange={handleChange}>
        <SegmentedControl.IconButton
          icon={MoonIcon}
          aria-label="Modo escuro"
          selected={selected === "night"}
        />
        <SegmentedControl.Button selected={selected === "auto"}>
          Auto
        </SegmentedControl.Button>
        <SegmentedControl.IconButton
          icon={SunIcon}
          aria-label="Modo claro"
          selected={selected === "day"}
        />
      </SegmentedControl>
    </div>
  );
}

function SiteFooter({ maxWidth }) {
  return (
    <footer className={styles.footer} style={{ maxWidth }}>
      <div className={styles.footerContainer}>
        <div className={styles.copyright}>
          <Link
            href="/"
            aria-label="Voltar para a página inicial"
            className={styles.footerLogo}
          >
            <AgroTabLogo size={26} />
          </Link>
          <Text>&copy; {new Date().getFullYear()} AgroTab</Text>
        </div>
        <div className={styles.footerLinks}>
          <Link href="mailto:contato@agrotab.com.br">Contato</Link>
          <Link href="/sobre">Sobre</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/termos-de-uso">Termos de Uso</Link>
          <Link href="/status">Status</Link>
        </div>
      </div>
    </footer>
  );
}
