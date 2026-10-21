import communityQuestion from "models/community-question.js";
import communityQuestionTemplates from "models/community-question-templates.js";

describe("Community question templates", () => {
  test.each(
    communityQuestionTemplates.map((template) => [template.id, template]),
  )(
    "%s passes the same validation used to create a question",
    (_id, template) => {
      const values = communityQuestion.validateCreateInput({
        title: template.title,
        description: template.description,
        category: template.category,
        kind: template.kind,
        options: template.options,
      });

      expect(values.title).toBe(template.title);
      expect(values.options).toEqual(template.options);
    },
  );

  test("Template ids are unique", () => {
    const ids = communityQuestionTemplates.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
