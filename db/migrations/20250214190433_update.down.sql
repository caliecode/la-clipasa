-- reverse: modify "user_liked_posts" table
ALTER TABLE "user_liked_posts" DROP CONSTRAINT "user_liked_posts_post_id", DROP CONSTRAINT "user_liked_posts_user_id";
-- reverse: modify "user_saved_posts" table
ALTER TABLE "user_saved_posts" DROP CONSTRAINT "user_saved_posts_post_id", DROP CONSTRAINT "user_saved_posts_user_id";
-- reverse: modify "users" table
ALTER TABLE "users" DROP CONSTRAINT "users_posts_last_seen_post";
-- reverse: modify "post_categories" table
ALTER TABLE "post_categories" DROP CONSTRAINT "post_categories_posts_categories";
-- reverse: modify "posts" table
ALTER TABLE "posts" DROP CONSTRAINT "posts_users_published_posts";
-- reverse: modify "comments" table
ALTER TABLE "comments" DROP CONSTRAINT "comments_users_comments", DROP CONSTRAINT "comments_posts_comments";
-- reverse: modify "api_keys" table
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_users_api_key";
-- reverse: create "user_liked_posts" table
DROP TABLE "user_liked_posts";
-- reverse: create "user_saved_posts" table
DROP TABLE "user_saved_posts";
-- reverse: create index "users_external_id_key" to table: "users"
DROP INDEX "users_external_id_key";
-- reverse: create index "users_email_key" to table: "users"
DROP INDEX "users_email_key";
-- reverse: create "users" table
DROP TABLE "users";
-- reverse: create index "postcategory_category_post_categories" to table: "post_categories"
DROP INDEX "postcategory_category_post_categories";
-- reverse: create "post_categories" table
DROP TABLE "post_categories";
-- reverse: create index "post_entity_vector" to table: "posts"
DROP INDEX "post_entity_vector";
-- reverse: create index "post_owner_id" to table: "posts"
DROP INDEX "post_owner_id";
-- reverse: create "posts" table
DROP TABLE "posts";
-- reverse: create index "comment_owner_id" to table: "comments"
DROP INDEX "comment_owner_id";
-- reverse: create "comments" table
DROP TABLE "comments";
-- reverse: create index "api_keys_owner_id_key" to table: "api_keys"
DROP INDEX "api_keys_owner_id_key";
-- reverse: create "api_keys" table
DROP TABLE "api_keys";
