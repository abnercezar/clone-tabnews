import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
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
  MailIcon,
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
import JsonLd from "interface/JsonLd";
import webserver from "infra/webserver";
import { writeColorMode } from "interface/colorMode";
import useSearchBox from "interface/SearchBox";
import useUser from "interface/useUser";
import { loginHref } from "interface/loginRedirect";
import styles from "./index.module.css";

const containerMaxWidth = {
  small: "544px",
  medium: "768px",
  large: "1012px",
  wide: "1280px",
};

export default function DefaultLayout({
  children,
  metadata = {},
  contentWidth = "large",
}) {
  const maxWidth = containerMaxWidth[contentWidth] ?? containerMaxWidth.large;
  const { asPath, isReady, pathname } = useRouter();
  const pageTitle = metadata.title ? `${metadata.title} · AgroTab` : "AgroTab";
  // Em rotas dinâmicas sem SSR o asPath é o padrão ("/[username]") até o
  // router ficar pronto; nesse caso não há URL canônica confiável.
  const hasRealPath = isReady || !pathname.includes("[");
  const canonicalPath =
    metadata.canonicalPath || (hasRealPath ? asPath.split(/[?#]/)[0] : null);
  const canonicalUrl = canonicalPath
    ? `${webserver.canonicalOrigin}${canonicalPath}`
    : null;
  // Sem imagem própria, a página usa a prévia padrão com a marca.
  const imagePath = metadata.image || "/api/og";
  const imageUrl = /^https?:\/\//.test(imagePath)
    ? imagePath
    : `${webserver.canonicalOrigin}${imagePath}`;

  return (
    <div className={styles.wrapper}>
      <Head>
        <title>{pageTitle}</title>

        {metadata.description && (
          <meta name="description" content={metadata.description} />
        )}

        {/* Prévia de links no WhatsApp, redes sociais e buscadores. */}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <meta property="og:site_name" content="AgroTab" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:type" content={metadata.type || "website"} />
        <meta property="og:title" content={metadata.title || "AgroTab"} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        {metadata.description && (
          <meta property="og:description" content={metadata.description} />
        )}
        {metadata.author && (
          <meta property="article:author" content={metadata.author} />
        )}
        {metadata.publishedTime && (
          <meta
            property="article:published_time"
            content={metadata.publishedTime}
          />
        )}
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content={metadata.title || "AgroTab — comunidade do agronegócio"}
        />
        {imagePath.startsWith("/api/og") && (
          <meta property="og:image:type" content="image/png" />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metadata.title || "AgroTab"} />
        {metadata.description && (
          <meta name="twitter:description" content={metadata.description} />
        )}
        <meta name="twitter:image" content={imageUrl} />
        {metadata.noIndex && <meta name="robots" content="noindex" />}
        {metadata.jsonLd && <JsonLd data={metadata.jsonLd} />}
      </Head>

      <SiteHeader />

      <div className={styles.contentClip}>
        <main className={styles.main} style={{ maxWidth }}>
          {children}
        </main>
      </div>

      <SiteFooter maxWidth={maxWidth} />
    </div>
  );
}

function SiteHeader() {
  const { asPath, isReady, pathname } = useRouter();
  const { user, isLoading } = useUser();
  // Em página estática o asPath do servidor é o padrão da rota; o retorno
  // pós-login só entra no href depois que o router conhece a URL real.
  const [loginLink, setLoginLink] = useState("/login");
  useEffect(() => {
    if (isReady) {
      setLoginLink(loginHref(asPath));
    }
  }, [asPath, isReady]);
  const { SearchBarButton, SearchIconButton, SearchBoxOverlay } =
    useSearchBox();
  const isRelevantes =
    pathname === "/" || asPath === "/" || asPath.startsWith("/?");
  const isRecentes = pathname === "/recentes" || asPath.startsWith("/recentes");

  return (
    <>
      <Header as="header" className={styles.header}>
        <nav className={styles.nav}>
          <Header.Item className={styles.itemFlush}>
            <Header.Link
              href="/"
              aria-label="Página inicial Relevantes"
              aria-current={isRelevantes ? "page" : undefined}
            >
              <span className={styles.logo}>
                <AgroTabLogo size={32} />
              </span>
              <span className={styles.brand}>AgroTab</span>
              <span
                className={isRelevantes ? styles.activeLink : styles.navLink}
              >
                Relevantes
              </span>
            </Header.Link>
          </Header.Item>

          <Header.Item className={styles.itemFlush}>
            <Header.Link
              href="/recentes"
              aria-current={isRecentes ? "page" : undefined}
              className={isRecentes ? styles.activeLink : styles.navLink}
            >
              Recentes
            </Header.Link>
          </Header.Item>
        </nav>

        <div className={styles.spacer} aria-hidden="true" />

        <div className={styles.tools}>
          {!isLoading && (
            <Header.Item className={styles.searchItem}>
              <SearchBarButton />
              <SearchIconButton />
            </Header.Item>
          )}

          {!isLoading && !user && (
            <>
              <Header.Item className={styles.itemMr1}>
                <ThemeSwitcher />
              </Header.Item>
              <Header.Item className={styles.itemMl2}>
                <Header.Link href={loginLink} className={styles.authLink}>
                  Login
                </Header.Link>
              </Header.Item>
              <Header.Item className={`${styles.itemMr1} ${styles.signupItem}`}>
                <Header.Link href="/cadastro" className={styles.authLink}>
                  Cadastrar
                </Header.Link>
              </Header.Item>
            </>
          )}

          {user && <UserMenu user={user} />}
        </div>
      </Header>
      <SearchBoxOverlay />
    </>
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
              {user.features?.includes("send:newsletter") && (
                <ActionList.LinkItem href="/newsletter">
                  <ActionList.LeadingVisual>
                    <MailIcon />
                  </ActionList.LeadingVisual>
                  Newsletter
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
                Sair
              </ActionList.Item>
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      </Header.Item>
    </>
  );
}

function ThemeSwitcher() {
  const { colorMode, resolvedColorMode, setColorMode } = useTheme();
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setSystemDark(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const mode = resolvedColorMode || colorMode;
  const isLight =
    mode === "day" || mode === "light"
      ? true
      : mode === "night" || mode === "dark"
        ? false
        : !systemDark;

  function handleSwitch() {
    const nextMode = isLight ? "night" : "day";
    setColorMode(nextMode);
    writeColorMode(nextMode);
  }

  return (
    <Tooltip text={isLight ? "Modo escuro" : "Modo claro"} direction="s">
      <IconButton
        icon={isLight ? MoonIcon : SunIcon}
        aria-label='Alternar tema entre "claro" e "escuro"'
        onClick={handleSwitch}
        variant="invisible"
        size="small"
        className={isLight ? styles.switcherLight : styles.switcherDark}
      />
    </Tooltip>
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
  const { user } = useUser();
  const showStatus = Boolean(user?.features?.includes("read:status:all"));

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
          <Link href="/contato">Contato</Link>
          <Link href="/sobre">Sobre</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/newsletter">Newsletter</Link>
          <Link href="/termos-de-uso">Termos de Uso</Link>
          {showStatus && <Link href="/status">Status</Link>}
        </div>
      </div>
    </footer>
  );
}
