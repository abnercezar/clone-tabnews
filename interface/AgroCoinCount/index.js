import { Link, Tooltip } from "@primer/react";
import { DotFillIcon } from "@primer/octicons-react";
import classes from "./index.module.css";

export default function AgroCoinCount({
  amount = 0,
  href,
  direction = "s",
  mode = "tooltip",
  className,
}) {
  const numericAmount = Number(amount);
  const label =
    numericAmount === 1 || numericAmount === -1
      ? `${numericAmount.toLocaleString("pt-BR")} AgroCoin`
      : `${numericAmount.toLocaleString("pt-BR")} AgroCoins`;
  const modes = {
    tooltip: {
      iconLabel: "AgroCoin",
      iconSize: 16,
      text: numericAmount.toLocaleString("pt-BR"),
    },
    full: {
      iconSize: 20,
      text: label,
    },
  };

  const { iconLabel, iconSize, text } = modes[mode] ?? modes.tooltip;

  const content = (
    <span className={`${classes.wrapper} ${className || ""}`.trim()}>
      <DotFillIcon
        className={classes.icon}
        aria-label={iconLabel}
        size={iconSize}
        fill="currentColor"
      />
      <span>{text}</span>
    </span>
  );

  if (mode === "full") {
    return content;
  }

  return (
    <Tooltip text="AgroCoin" direction={direction}>
      {href ? (
        <Link href={href} className={classes.link} aria-label={label}>
          {content}
        </Link>
      ) : (
        <span tabIndex={0} aria-label={label}>
          {content}
        </span>
      )}
    </Tooltip>
  );
}
