import { formatPastDuration, formatPastTime } from "interface/PastTime";

const now = new Date("2026-10-18T15:00:00.000Z").getTime();

function ago(seconds) {
  return new Date(now - seconds * 1000).toISOString();
}

describe("`interface/PastTime`", () => {
  test("Formats the elapsed time in Portuguese", () => {
    expect(formatPastTime(new Date(now).toISOString(), now)).toBe("agora");
    expect(formatPastTime(ago(1), now)).toBe("1 segundo atrás");
    expect(formatPastTime(ago(2), now)).toBe("2 segundos atrás");
    expect(formatPastTime(ago(60), now)).toBe("1 minuto atrás");
    expect(formatPastTime(ago(60 * 60), now)).toBe("1 hora atrás");
    expect(formatPastTime(ago(60 * 60 * 5), now)).toBe("5 horas atrás");
    expect(formatPastTime(ago(60 * 60 * 24), now)).toBe("1 dia atrás");
    expect(formatPastTime(ago(60 * 60 * 24 * 40), now)).toBe("1 mês atrás");
    expect(formatPastTime(ago(60 * 60 * 24 * 365), now)).toBe("1 ano atrás");
    expect(formatPastTime(ago(60 * 60 * 24 * 365 * 4), now)).toBe(
      "4 anos atrás",
    );
  });

  test("Formats duration without the 'atrás' suffix", () => {
    expect(formatPastDuration(ago(60 * 60 * 24 * 10), now)).toBe("10 dias");
  });

  test("Does not describe a future date as negative", () => {
    expect(formatPastTime(ago(-60), now)).toBe("agora");
  });
});
