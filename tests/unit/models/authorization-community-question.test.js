import authorization from "models/authorization.js";

const anonymous = { features: ["read:community_question"] };

function buildQuestion(overrides = {}) {
  return {
    id: "q1",
    owner_id: "admin-id",
    title: "Pergunta",
    description: null,
    category: "lavoura",
    kind: "poll",
    results_visibility: "after_vote",
    starts_at: new Date(),
    ends_at: null,
    is_ended: false,
    options: [
      { id: "o1", label: "A", position: 1, votes: 3 },
      { id: "o2", label: "B", position: 2, votes: 1 },
    ],
    total_votes: 4,
    viewer_option_id: null,
    contributions_by_category: { lavoura: 2 },
    created_at: new Date(),
    ...overrides,
  };
}

describe("`authorization.filterOutput()` with `read:community_question`", () => {
  test("Hides votes per option before the viewer votes", () => {
    const output = authorization.filterOutput(
      anonymous,
      "read:community_question",
      buildQuestion(),
    );

    expect(output.results_visible).toBe(false);
    expect(output.options).toEqual([
      { id: "o1", label: "A", position: 1 },
      { id: "o2", label: "B", position: 2 },
    ]);
    expect(output.total_votes).toBe(4);
    expect(output.owner_id).toBeUndefined();
  });

  test("Shows votes after the viewer votes", () => {
    const output = authorization.filterOutput(
      anonymous,
      "read:community_question",
      buildQuestion({ viewer_option_id: "o2" }),
    );

    expect(output.results_visible).toBe(true);
    expect(output.viewer_option_id).toBe("o2");
    expect(output.options.map((option) => option.votes)).toEqual([3, 1]);
  });

  test("Shows votes when the question has ended", () => {
    const output = authorization.filterOutput(
      anonymous,
      "read:community_question",
      buildQuestion({ is_ended: true }),
    );

    expect(output.results_visible).toBe(true);
  });

  test("Shows votes with `always` visibility", () => {
    const output = authorization.filterOutput(
      anonymous,
      "read:community_question",
      buildQuestion({ results_visibility: "always" }),
    );

    expect(output.results_visible).toBe(true);
  });

  test("Open questions never have results", () => {
    const output = authorization.filterOutput(
      anonymous,
      "read:community_question",
      buildQuestion({
        kind: "open",
        options: [],
        results_visibility: "always",
      }),
    );

    expect(output.results_visible).toBe(false);
    expect(output.options).toEqual([]);
  });
});
