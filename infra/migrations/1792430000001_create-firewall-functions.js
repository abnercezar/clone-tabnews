// Firewall de abuso (estilo TabNews): funções Postgres que contam eventos por IP
// e aplicam side effects (desativar usuários / marcar conteúdos como 'firewall').
// IP como text — alinhado a events.originator_ip (varchar), sem tipo inet.

exports.up = (pgm) => {
  pgm.sql(`
CREATE OR REPLACE FUNCTION firewall_create_user(client_ip_input text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  users_count integer;
BEGIN
  users_count := (
    SELECT COUNT(*)
    FROM events
    WHERE originator_ip = client_ip_input
      AND type = 'create:user'
      AND created_at > NOW() - INTERVAL '5 seconds'
  );

  IF users_count >= 2 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
`);

  pgm.sql(`
CREATE OR REPLACE FUNCTION firewall_create_content_text_root(client_ip_input text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  contents_count integer;
BEGIN
  contents_count := (
    SELECT COUNT(*)
    FROM events
    WHERE originator_ip = client_ip_input
      AND type = 'create:content:text_root'
      AND created_at > NOW() - INTERVAL '5 seconds'
  );

  IF contents_count >= 2 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
`);

  pgm.sql(`
CREATE OR REPLACE FUNCTION firewall_create_content_text_child(client_ip_input text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  contents_count integer;
BEGIN
  contents_count := (
    SELECT COUNT(*)
    FROM events
    WHERE originator_ip = client_ip_input
      AND type = 'create:content:text_child'
      AND created_at > NOW() - INTERVAL '5 seconds'
  );

  IF contents_count >= 2 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
`);

  pgm.sql(`
CREATE OR REPLACE FUNCTION firewall_create_user_side_effect(client_ip_input text)
RETURNS TABLE (id uuid, username varchar, email varchar)
LANGUAGE plpgsql
AS $$
DECLARE
  users_to_block record;
  features_to_remove text[] := ARRAY[
    'read:activation_token',
    'read:recovery_token',
    'read:email_confirmation_token',
    'create:session',
    'read:session'
  ];
BEGIN
  FOR users_to_block IN (
    SELECT metadata->>'id' AS user_id
    FROM events
    WHERE type = 'create:user'
      AND originator_ip = client_ip_input
      AND created_at > NOW() - INTERVAL '30 minutes'
      AND metadata->>'id' IS NOT NULL
  )
  LOOP
    RETURN QUERY
    UPDATE users
    SET
      features = COALESCE((
        SELECT array_agg(f ORDER BY ordinality)::varchar[]
        FROM unnest(users.features) WITH ORDINALITY AS u(f, ordinality)
        WHERE NOT (f = ANY (features_to_remove))
      ), '{}'::varchar[])
    WHERE users.id = users_to_block.user_id::uuid
    RETURNING users.id, users.username, users.email;
  END LOOP;
END;
$$;
`);

  pgm.sql(`
CREATE OR REPLACE FUNCTION firewall_create_content_text_root_side_effect(client_ip_input text)
RETURNS TABLE (
  id uuid,
  title varchar,
  published_at timestamptz,
  status_before_update varchar,
  status varchar,
  owner_id uuid,
  tabcoins integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  contents_to_update record;
BEGIN
  FOR contents_to_update IN (
    SELECT COALESCE(metadata->>'id', metadata->>'content_id') AS content_id
    FROM events
    WHERE type = 'create:content:text_root'
      AND originator_ip = client_ip_input
      AND created_at > NOW() - INTERVAL '10 minutes'
      AND COALESCE(metadata->>'id', metadata->>'content_id') IS NOT NULL
  )
  LOOP
    RETURN QUERY
    WITH before AS (
      SELECT
        c.id,
        c.title,
        c.published_at,
        c.status AS status_before_update,
        c.owner_id,
        COALESCE(get_content_current_tabcoins(c.id), 0)::integer AS tabcoins
      FROM contents c
      WHERE c.id = contents_to_update.content_id::uuid
        AND c.status = 'published'
    ),
    updated AS (
      UPDATE contents
      SET status = 'firewall'
      FROM before
      WHERE contents.id = before.id
      RETURNING contents.id, contents.status
    )
    SELECT
      before.id,
      before.title,
      before.published_at,
      before.status_before_update::varchar,
      updated.status::varchar,
      before.owner_id,
      before.tabcoins
    FROM before
    INNER JOIN updated ON updated.id = before.id;
  END LOOP;
END;
$$;
`);

  pgm.sql(`
CREATE OR REPLACE FUNCTION firewall_create_content_text_child_side_effect(client_ip_input text)
RETURNS TABLE (
  id uuid,
  published_at timestamptz,
  status_before_update varchar,
  status varchar,
  owner_id uuid,
  tabcoins integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  contents_to_update record;
BEGIN
  FOR contents_to_update IN (
    SELECT COALESCE(metadata->>'id', metadata->>'content_id') AS content_id
    FROM events
    WHERE type = 'create:content:text_child'
      AND originator_ip = client_ip_input
      AND created_at > NOW() - INTERVAL '10 minutes'
      AND COALESCE(metadata->>'id', metadata->>'content_id') IS NOT NULL
  )
  LOOP
    RETURN QUERY
    WITH before AS (
      SELECT
        c.id,
        c.published_at,
        c.status AS status_before_update,
        c.owner_id,
        COALESCE(get_content_current_tabcoins(c.id), 0)::integer AS tabcoins
      FROM contents c
      WHERE c.id = contents_to_update.content_id::uuid
        AND c.status = 'published'
    ),
    updated AS (
      UPDATE contents
      SET status = 'firewall'
      FROM before
      WHERE contents.id = before.id
      RETURNING contents.id, contents.status
    )
    SELECT
      before.id,
      before.published_at,
      before.status_before_update::varchar,
      updated.status::varchar,
      before.owner_id,
      before.tabcoins
    FROM before
    INNER JOIN updated ON updated.id = before.id;
  END LOOP;
END;
$$;
`);

  pgm.createIndex("events", ["originator_ip", "type", "created_at"], {
    name: "events_originator_ip_type_created_at_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("events", ["originator_ip", "type", "created_at"], {
    name: "events_originator_ip_type_created_at_idx",
    ifExists: true,
  });

  pgm.sql(
    "DROP FUNCTION IF EXISTS firewall_create_content_text_child_side_effect(text);",
  );
  pgm.sql(
    "DROP FUNCTION IF EXISTS firewall_create_content_text_root_side_effect(text);",
  );
  pgm.sql("DROP FUNCTION IF EXISTS firewall_create_user_side_effect(text);");
  pgm.sql("DROP FUNCTION IF EXISTS firewall_create_content_text_child(text);");
  pgm.sql("DROP FUNCTION IF EXISTS firewall_create_content_text_root(text);");
  pgm.sql("DROP FUNCTION IF EXISTS firewall_create_user(text);");
};
