import { Link, Tooltip } from "@primer/react";
import { ThumbsupIcon } from "@primer/octicons-react";
import classes from "./index.module.css";

// Na tela, o saldo de AgroCoins aparece como "reputação": a soma dos votos
// "útil" recebidos. A regra de pontuação no backend não muda.
export default function AgroCoinCount({
  amount = 0,
  href,
  direction = "s",
  mode = "tooltip",
  className,
}) {
  const numericAmount = Number(amount);
  const modes = {
    tooltip: {
      iconLabel: "Reputação",
      iconSize: 16,
      text: numericAmount.toLocaleString("pt-BR"),
    },
    full: {
      iconSize: 20,
      text: `${numericAmount.toLocaleString("pt-BR")} de reputação`,
    },
  };

  const { iconLabel, iconSize, text } = modes[mode] ?? modes.tooltip;

  const content = (
    <span className={`${classes.wrapper} ${className || ""}`.trim()}>
      <ThumbsupIcon
        aria-label={iconLabel}
        aria-hidden={!iconLabel}
        fill="#1a7f37"
        size={iconSize}
      />
      <span>{text}</span>
    </span>
  );

  if (mode === "full") {
    return content;
  }

  return (
    <Tooltip text="Reputação: votos de útil recebidos" direction={direction}>
      {href ? (
        <Link
          href={href}
          className={classes.link}
          aria-label={`${amount} de reputação`}
        >
          {content}
        </Link>
      ) : (
        <span tabIndex={0} aria-label={`${amount} de reputação`}>
          {content}
        </span>
      )}
    </Tooltip>
  );
}
