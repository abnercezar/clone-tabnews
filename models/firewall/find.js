import database from "infra/database.js";
import { NotFoundError } from "infra/errors.js";
import content from "models/content.js";
import user from "models/user.js";
import eventTypes from "models/firewall/event-types.js";

async function findByEventId(eventId) {
  const relatedEvents = await findAllRelatedEvents(eventId);
  const foundRequestedEvent = relatedEvents.find(
    (event) => event.id === eventId,
  );

  if (
    !foundRequestedEvent ||
    !eventTypes.firewall.includes(foundRequestedEvent.type)
  ) {
    throw new NotFoundError({
      message: `O id "${eventId}" não foi encontrado no sistema.`,
      action: 'Verifique se o "id" está digitado corretamente.',
    });
  }

  const affectedData = await getAffectedData(relatedEvents);

  return {
    affected: affectedData,
    events: relatedEvents,
  };
}

async function getAffectedData(events) {
  const usersIds = new Set();
  const contentsIds = new Set();
  const affectedData = {};

  for (const event of events) {
    event.metadata?.users?.forEach((userId) => usersIds.add(userId));
    event.metadata?.contents?.forEach((contentId) =>
      contentsIds.add(contentId),
    );
  }

  if (contentsIds.size) {
    affectedData.contents = await content.findAllByIds(Array.from(contentsIds));

    for (const contentRow of affectedData.contents) {
      usersIds.add(contentRow.owner_id);
    }
  }

  affectedData.users = await user.findAllByIds(Array.from(usersIds), {
    withBalances: true,
  });

  return affectedData;
}

async function findAllRelatedEvents(id) {
  // Inclui o evento semente mesmo quando só há `users` ou só `contents`
  // (jsonb_array_elements_text em NULL/[] não gera linha).
  const results = await database.query({
    text: `
    WITH RECURSIVE related_events AS (
      SELECT
        id,
        metadata
      FROM
        events
      WHERE
        id = $1

      UNION

      SELECT
        e.id,
        e.metadata
      FROM
        events e
      INNER JOIN related_events r ON
        EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(r.metadata->'users', '[]'::jsonb)) AS ru(user_id)
          JOIN jsonb_array_elements_text(COALESCE(e.metadata->'users', '[]'::jsonb)) AS eu(user_id)
            ON ru.user_id = eu.user_id
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(r.metadata->'contents', '[]'::jsonb)) AS rc(content_id)
          JOIN jsonb_array_elements_text(COALESCE(e.metadata->'contents', '[]'::jsonb)) AS ec(content_id)
            ON rc.content_id = ec.content_id
        )
    )

    SELECT DISTINCT
      events.*
    FROM
      events
    INNER JOIN related_events ON
      events.id = related_events.id
    ORDER BY
      events.created_at ASC
    ;`,
    values: [id],
  });

  return results.rows;
}

const find = {
  findAllRelatedEvents,
  findByEventId,
};

export default find;
