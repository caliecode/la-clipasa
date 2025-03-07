ALTER TABLE "users"
  DROP CONSTRAINT "users_posts_last_seen_post",
  ADD COLUMN "last_post_seen_cursor" character varying NULL;

