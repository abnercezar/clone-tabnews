import notification from "models/notification.js";
import webserver from "infra/webserver.js";

describe("`models/notification.js`", () => {
  test("truncateSnippet keeps short text and clips long text", () => {
    expect(notification.truncateSnippet("curto")).toBe("curto");
    const long = "a".repeat(200);
    const snippet = notification.truncateSnippet(long);
    expect(snippet.length).toBe(140);
    expect(snippet.endsWith("…")).toBe(true);
  });

  test("escapeHtml neutralizes markup", () => {
    expect(notification.escapeHtml(`<script>alert("xss")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  test("buildConversationUrl points to root post with comment hash", () => {
    const url = notification.buildConversationUrl({
      rootUsername: "produtor",
      rootSlug: "manejo-de-solo",
      commentId: "11111111-1111-4111-8111-111111111111",
    });

    expect(url).toBe(
      `${webserver.origin}/produtor/manejo-de-solo#comentario-11111111-1111-4111-8111-111111111111`,
    );
  });
});
