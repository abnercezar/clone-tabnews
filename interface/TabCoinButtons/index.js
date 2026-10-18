import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useReward } from "react-rewards";
import { IconButton, Text, Tooltip } from "@primer/react";
import { ChevronDownIcon, ChevronUpIcon } from "@primer/octicons-react";
import useUser from "interface/useUser";
import classes from "./index.module.css";

export default function TabCoinButtons({ content, onBalanceChange }) {
  const router = useRouter();
  const { user, isLoading, mutate } = useUser();
  const [contentObject, setContentObject] = useState(content);
  const [isPosting, setIsPosting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const rewardId = `reward-${contentObject?.id || "pending"}`;

  const { reward: rewardCredit, isAnimating: isAnimatingCredit } = useReward(
    rewardId,
    "confetti",
    {
      position: "absolute",
      lifetime: 100,
      decay: 0.9,
      spread: 60,
      elementCount: 100,
    },
  );

  const { reward: rewardDebit, isAnimating: isAnimatingDebit } = useReward(
    rewardId,
    "emoji",
    {
      position: "absolute",
      lifetime: 100,
      angle: 90,
      startVelocity: 10,
      decay: 0.94,
      spread: 60,
      elementCount: 4,
      emoji: ["😡"],
    },
  );

  useEffect(() => {
    setContentObject(content);
  }, [content]);

  async function transactTabCoin(transactionType) {
    setErrorMessage(null);

    if (!user && !isLoading) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    setIsPosting(true);

    try {
      const response = await fetch(
        `/api/v1/contents/${contentObject.owner_username}/${contentObject.slug}/tabcoins`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_type: transactionType,
          }),
        },
      );

      const responseBody = await response.json();

      if (response.status === 201) {
        const nextContent = { ...contentObject, ...responseBody };
        setContentObject(nextContent);
        onBalanceChange?.(nextContent);
        mutate();
        setIsPosting(false);

        if (transactionType === "credit") {
          rewardCredit();
        }

        if (transactionType === "debit") {
          rewardDebit();
        }

        return;
      }

      setErrorMessage(
        responseBody.message || "Não foi possível registrar o voto.",
      );
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
    } finally {
      setIsPosting(false);
    }
  }

  if (contentObject?.status !== "published") {
    return null;
  }

  const isInAction = isPosting || isAnimatingCredit || isAnimatingDebit;

  return (
    <div className={classes.wrapper}>
      <Tooltip text="Achei relevante" direction="n">
        <IconButton
          variant="invisible"
          aria-label="Creditar AgroCoin"
          icon={ChevronUpIcon}
          size="small"
          className={classes.creditButton}
          onClick={() => transactTabCoin("credit")}
          disabled={isInAction}
        />
      </Tooltip>

      <Text
        as="span"
        className={classes.balance}
        title={`créditos: ${contentObject.tabcoins_credit ?? 0} · débitos: ${Math.abs(contentObject.tabcoins_debit ?? 0)}`}
      >
        <span
          id={rewardId}
          className={classes.rewardAnchor}
          aria-hidden="true"
        />
        {contentObject.tabcoins ?? 0}
      </Text>

      <Tooltip text="Sem relevância" direction="n">
        <IconButton
          variant="invisible"
          aria-label="Debitar AgroCoin"
          icon={ChevronDownIcon}
          size="small"
          className={classes.debitButton}
          onClick={() => transactTabCoin("debit")}
          disabled={isInAction}
        />
      </Tooltip>

      {errorMessage && (
        <Text as="span" className={classes.error} role="alert">
          {errorMessage}
        </Text>
      )}
    </div>
  );
}
