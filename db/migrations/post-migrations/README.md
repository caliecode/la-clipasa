# ent cannot handle extra sql

we run these after migrations.

# idempotent sql

```sql
CREATE OR REPLACE FUNCTION update_movie_fts() ...

CREATE INDEX IF NOT EXISTS idx_movie_fts ...

DROP TRIGGER IF EXISTS movie_fts_trigger ON movies;
CREATE TRIGGER movie_fts_trigger ...
```
