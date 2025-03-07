package client

type DiscordHandlers struct{}

func NewDiscordHandlers() *DiscordHandlers {
	return &DiscordHandlers{}
}

/**
 *
 * TODO: https://discord.com/developers/docs/reference#uploading-files (max 10mb)
 *
 * curl -H 'Authorization: Bot <...>' https://discord.com/api/channels/1058424616726565007/messages
 *
 * returns cdn links with expire headers (hex to dec) -> 24hs expiration
 *
 * bot api 50rps
 *
 * we could let users upload file via frontend to our dedicated discord channel
 * and regenerate links when they expire. then the post table is updated with the new links
 *
 * we would have a small cache layer to
 */
