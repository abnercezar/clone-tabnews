import { Link, Tooltip } from "@primer/react";
import { SquareFillIcon } from "@primer/octicons-react";
import classes from "./index.module.css";

export default function AgroCashCount({
  amount = 0,
  href,
  direction = "s",
  className,
}) {
  const content = (
    <span className={`${classes.wrapper} ${className || ""}`.trim()}>
      <SquareFillIcon aria-hidden fill="#2da44e" size={16} />
      <span>{Number(amount).toLocaleString("pt-BR")}</span>
    </span>
  );

  return (
    <Tooltip text="AgroCash" direction={direction}>
      {href ? (
        <Link
          href={href}
          className={classes.link}
          aria-label={`${amount} AgroCash`}
        >
          {content}
        </Link>
      ) : (
        <span tabIndex={0} aria-label={`${amount} AgroCash`}>
          {content}
        </span>
      )}
    </Tooltip>
  );
}
