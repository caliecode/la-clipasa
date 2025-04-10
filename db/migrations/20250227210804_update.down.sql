-- reverse: modify "users" table
ALTER TABLE "users" DROP COLUMN "last_post_seen";
-- reverse: create index "post_owner_id" to table: "posts"
DROP INDEX "post_owner_id";
-- reverse: drop index "post_owner_id" from table: "posts"
CREATE INDEX "post_owner_id" ON "posts" ("owner_id") WHERE (deleted_at IS NULL);
-- reverse: create index "comment_owner_id" to table: "comments"
DROP INDEX "comment_owner_id";
-- reverse: drop index "comment_owner_id" from table: "comments"
CREATE INDEX "comment_owner_id" ON "comments" ("owner_id") WHERE (deleted_at IS NULL);
