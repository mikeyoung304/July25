-- check the core auth/RBAC tables the app expects
WITH required(name) AS (
  VALUES
    ('user_profiles'),
    ('user_restaurants'),
    ('user_pins'),
    ('station_tokens'),
    ('api_scopes'),
    ('role_scopes')
)
SELECT
  r.name AS expected_table,
  (to_regclass('public.' || r.name) IS NOT NULL) AS exists
FROM required r
ORDER BY 1;