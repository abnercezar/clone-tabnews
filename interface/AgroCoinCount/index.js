import { Link, Tooltip } from "@primer/react";
import { SquareFillIcon } from "@primer/octicons-react";
import classes from "./index.module.css";

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
      iconLabel: "AgroCoins",
      iconSize: 16,
      text: numericAmount.toLocaleString("pt-BR"),
    },
    full: {
      iconSize: 20,
      text: `${numericAmount.toLocaleString("pt-BR")} AgroCoin${
        numericAmount > 1 || numericAmount < -1 ? "s" : ""
      }`,
    },
  };

  const { iconLabel, iconSize, text } = modes[mode] ?? modes.tooltip;

  const content = (
    <span className={`${classes.wrapper} ${className || ""}`.trim()}>
      <SquareFillIcon
        aria-label={iconLabel}
        aria-hidden={!iconLabel}
        fill="#0969da"
        size={iconSize}
      />
      <span>{text}</span>
    </span>
  );

  if (mode === "full") {
    return content;
  }

  return (
    <Tooltip text="AgroCoins" direction={direction}>
      {href ? (
        <Link
          href={href}
          className={classes.link}
          aria-label={`${amount} AgroCoins`}
        >
          {content}
        </Link>
      ) : (
        <span tabIndex={0} aria-label={`${amount} AgroCoins`}>
          {content}
        </span>
      )}
    </Tooltip>
  );
}
