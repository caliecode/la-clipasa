/* TODO: once schema is stable, add tscvector, indexes, etc.
CREATE OR REPLACE FUNCTION posts_vector_update()
 RETURNS TRIGGER
 AS $$
BEGIN
 NEW.entity_vector := to_tsvector('english', coalesce(NEW.title, ''));
 RETURN NEW;
END;
$$
LANGUAGE plpgsql;

--DROP TRIGGER IF EXISTS posts_vector_update ON posts;
CREATE TRIGGER posts_vector_update
 BEFORE INSERT OR UPDATE OF title ON posts
 FOR EACH ROW
 EXECUTE FUNCTION posts_vector_update();

CREATE INDEX posts_entity_vector_idx ON posts USING GIN(entity_vector);

--
--
--
--


 CREATE INDEX ON user_liked_posts(user_id, post_id);

CREATE INDEX ON user_liked_posts(user_id);

CREATE INDEX ON user_saved_posts(user_id, post_id);

CREATE INDEX ON user_saved_posts(user_id);
 */
