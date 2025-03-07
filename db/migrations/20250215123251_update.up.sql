-- drop index "comment_owner_id" from table: "comments"
DROP INDEX "comment_owner_id";
-- create index "comment_owner_id" to table: "comments"
CREATE INDEX "comment_owner_id" ON "comments" ("owner_id") WHERE deleted_at is NULL;
-- drop index "post_owner_id" from table: "posts"
DROP INDEX "post_owner_id";
-- create index "post_owner_id" to table: "posts"
CREATE INDEX "post_owner_id" ON "posts" ("owner_id") WHERE deleted_at is NULL;
