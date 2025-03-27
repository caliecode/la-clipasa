-- Create index "api_keys_api_key_key" to table: "api_keys"
CREATE UNIQUE INDEX "api_keys_api_key_key" ON "api_keys" ("api_key");
-- Modify "posts" table
ALTER TABLE "posts" ADD COLUMN "metadata" jsonb NULL;
