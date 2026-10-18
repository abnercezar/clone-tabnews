import { Link, Tooltip } from "@primer/react";
import { SquareFillIcon } from "@primer/octicons-react";
import classes from "./index.module.css";

export default function AgroCoinCount({
  amount = 0,
  href,
  direction = "s",
  className,
}) {
  const content = (
    <span className={`${classes.wrapper} ${className || ""}`.trim()}>
      <SquareFillIcon aria-hidden fill="#0969da" size={16} />
      <span>{Number(amount).toLocaleString("pt-BR")}</span>
    </span>
  );

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
