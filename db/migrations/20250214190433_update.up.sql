-- create "api_keys" table
CREATE TABLE "api_keys" ("id" uuid NOT NULL, "updated_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL, "api_key" character varying NOT NULL, "expires_on" timestamptz NOT NULL, "owner_id" uuid NOT NULL, PRIMARY KEY ("id"));
-- create index "api_keys_owner_id_key" to table: "api_keys"
CREATE UNIQUE INDEX "api_keys_owner_id_key" ON "api_keys" ("owner_id");
-- create "comments" table
CREATE TABLE "comments" ("id" uuid NOT NULL, "updated_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL, "deleted_at" timestamptz NULL, "deleted_by" character varying NULL, "content" character varying NOT NULL, "post_comments" uuid NULL, "owner_id" uuid NOT NULL, PRIMARY KEY ("id"));
-- create index "comment_owner_id" to table: "comments"
CREATE INDEX "comment_owner_id" ON "comments" ("owner_id") WHERE deleted_at is NULL;
-- create "posts" table
CREATE TABLE "posts" ("id" uuid NOT NULL, "updated_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL, "deleted_at" timestamptz NULL, "deleted_by" character varying NULL, "pinned" boolean NOT NULL DEFAULT false, "title" character varying NOT NULL, "content" character varying NULL, "link" character varying NOT NULL, "moderation_comment" character varying NULL, "is_moderated" boolean NOT NULL DEFAULT false, "entity_vector" tsvector NULL DEFAULT '', "owner_id" uuid NOT NULL, PRIMARY KEY ("id"));
-- create index "post_owner_id" to table: "posts"
CREATE INDEX "post_owner_id" ON "posts" ("owner_id") WHERE deleted_at is NULL;
-- create index "post_entity_vector" to table: "posts"
CREATE INDEX "post_entity_vector" ON "posts" USING GIN ("entity_vector");
-- create "post_categories" table
CREATE TABLE "post_categories" ("id" uuid NOT NULL, "updated_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL, "category" character varying NOT NULL, "post_categories" uuid NULL, PRIMARY KEY ("id"));
-- create index "postcategory_category_post_categories" to table: "post_categories"
CREATE UNIQUE INDEX "postcategory_category_post_categories" ON "post_categories" ("category", "post_categories");
-- create "users" table
CREATE TABLE "users" ("id" uuid NOT NULL, "updated_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL, "deleted_at" timestamptz NULL, "deleted_by" character varying NULL, "email" character varying NOT NULL, "display_name" character varying NOT NULL, "alias" character varying NULL, "profile_image" character varying NULL, "external_id" character varying NOT NULL, "auth_provider" character varying NOT NULL DEFAULT 'TWITCH', "role" character varying NOT NULL DEFAULT 'GUEST', "last_seen_at" timestamptz NULL, "awards" jsonb NULL, "user_last_seen_post" uuid NULL, PRIMARY KEY ("id"));
-- create index "users_email_key" to table: "users"
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
-- create index "users_external_id_key" to table: "users"
CREATE UNIQUE INDEX "users_external_id_key" ON "users" ("external_id");
-- create "user_saved_posts" table
CREATE TABLE "user_saved_posts" ("user_id" uuid NOT NULL, "post_id" uuid NOT NULL, PRIMARY KEY ("user_id", "post_id"));
-- create "user_liked_posts" table
CREATE TABLE "user_liked_posts" ("user_id" uuid NOT NULL, "post_id" uuid NOT NULL, PRIMARY KEY ("user_id", "post_id"));
-- modify "api_keys" table
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_users_api_key" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
-- modify "comments" table
ALTER TABLE "comments" ADD CONSTRAINT "comments_posts_comments" FOREIGN KEY ("post_comments") REFERENCES "posts" ("id") ON DELETE SET NULL, ADD CONSTRAINT "comments_users_comments" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
-- modify "posts" table
ALTER TABLE "posts" ADD CONSTRAINT "posts_users_published_posts" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE NO ACTION;
-- modify "post_categories" table
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_posts_categories" FOREIGN KEY ("post_categories") REFERENCES "posts" ("id") ON DELETE SET NULL;
-- modify "users" table
ALTER TABLE "users" ADD CONSTRAINT "users_posts_last_seen_post" FOREIGN KEY ("user_last_seen_post") REFERENCES "posts" ("id") ON DELETE SET NULL;
-- modify "user_saved_posts" table
ALTER TABLE "user_saved_posts" ADD CONSTRAINT "user_saved_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE, ADD CONSTRAINT "user_saved_posts_post_id" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE;
-- modify "user_liked_posts" table
ALTER TABLE "user_liked_posts" ADD CONSTRAINT "user_liked_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE, ADD CONSTRAINT "user_liked_posts_post_id" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE;
