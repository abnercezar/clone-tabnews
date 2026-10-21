// Percentuais pelo maior resto: a soma exibida fecha sempre em 100%.
export function computeResults(options, totalVotes) {
  const total = Number(totalVotes) || 0;

  if (total === 0) {
    return options.map((option) => ({ ...option, percent: 0 }));
  }

  const withRaw = options.map((option, index) => {
    const raw = ((Number(option.votes) || 0) * 100) / total;
    return { index, floor: Math.floor(raw), remainder: raw - Math.floor(raw) };
  });

  let missing = 100 - withRaw.reduce((sum, item) => sum + item.floor, 0);
  const byRemainder = [...withRaw].sort((a, b) => b.remainder - a.remainder);
  const bonus = new Set();

  for (const item of byRemainder) {
    if (missing <= 0 || item.remainder === 0) break;
    bonus.add(item.index);
    missing--;
  }

  return options.map((option, index) => ({
    ...option,
    percent: withRaw[index].floor + (bonus.has(index) ? 1 : 0),
  }));
}

// Frase curta que conecta o voto da pessoa ao resto da comunidade,
// sempre a partir dos números reais.
export function describeViewerResult(results, viewerOptionId, totalVotes) {
  const viewerOption = results.find((option) => option.id === viewerOptionId);

  if (!viewerOption) {
    return null;
  }

  const total = Number(totalVotes) || 0;
  if (total <= 1) {
    return "Você deu o primeiro voto. Volte depois para ver o que a comunidade pensa.";
  }

  const others = Number(viewerOption.votes) - 1;
  const topVotes = Math.max(...results.map((option) => Number(option.votes)));
  const leaders = results.filter((option) => Number(option.votes) === topVotes);

  if (others === 0) {
    return "Ninguém mais escolheu esta alternativa até agora. Sua experiência pode mostrar um outro lado.";
  }

  const peopleChose =
    others === 1 ? "1 pessoa escolheu" : `${others} pessoas escolheram`;

  if (leaders.length === 1 && leaders[0].id === viewerOptionId) {
    return `Você está com a maioria: ${peopleChose} o mesmo que você.`;
  }

  if (leaders.some((option) => option.id === viewerOptionId)) {
    return `Empate na liderança: ${peopleChose} o mesmo que você.`;
  }

  return `${peopleChose} o mesmo que você. A mais votada até agora é “${leaders[0].label}”.`;
}

const DRAFT_PREFIX = "agrotab:pergunta:rascunho:";

// localStorage pode faltar (aba anônima, bloqueio de dados): falha em silêncio.
export function readDraft(questionId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(DRAFT_PREFIX + questionId);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (typeof draft?.title !== "string" || typeof draft?.body !== "string") {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function writeDraft(
  questionId,
  draft,
  storage = globalThis.localStorage,
) {
  try {
    if (!draft.title.trim() && !draft.body.trim()) {
      storage?.removeItem(DRAFT_PREFIX + questionId);
      return;
    }
    storage?.setItem(DRAFT_PREFIX + questionId, JSON.stringify(draft));
  } catch {
    // Sem armazenamento, o rascunho vive só enquanto a página estiver aberta.
  }
}

export function clearDraft(questionId, storage = globalThis.localStorage) {
  try {
    storage?.removeItem(DRAFT_PREFIX + questionId);
  } catch {
    // Idem.
  }
}
