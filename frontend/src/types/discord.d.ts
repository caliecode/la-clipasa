interface DiscordUploadResponse {
  type: number
  content: string
  mentions: any[]
  mention_roles: any[]
  attachments: {
    id: string
    filename: string
    size: number
    url: string
    proxy_url: string
    width: number
    height: number
    content_type: string
    placeholder: string
    placeholder_version: number
  }[]
  embeds: any[]
  timestamp: Date
  edited_timestamp: any
  flags: number
  components: any[]
  id: string
  channel_id: string
}
