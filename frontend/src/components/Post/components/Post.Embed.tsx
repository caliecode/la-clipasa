import { InstagramEmbed, TikTokEmbed, XEmbed, YouTubeEmbed } from 'react-social-media-embed'
import { usePostContext } from '../Post.context'
import { getServiceAndId } from 'src/services/linkServices'
import styles from '../Post.module.css'
import { useMantineColorScheme } from '@mantine/core'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDiscordLinkRefresh } from 'src/hooks/post/useRefreshDiscordLink'

interface PostEmbedProps {
  inline?: boolean
}

export const PostEmbed = ({ inline = false }: PostEmbedProps) => {
  const { setPost, post, setCalloutErrors } = usePostContext()
  const { t } = useTranslation()
  const { refreshLink } = useDiscordLinkRefresh({
    onRefresh: (newLink) => {
      setPost((currentPost) => ({ ...currentPost, link: newLink }))
    },
    onError: (errors) => {
      setCalloutErrors(errors)
    },
  })

  useEffect(() => {
    if (post.metadata?.service === 'DISCORD') {
      refreshLink(post)
    }
  }, [post])

  const embedStyle: React.CSSProperties = inline
    ? { minWidth: '100%', height: '100%' }
    : { height: '100%', width: '100%' }

  const Embed = useMemo(() => {
    switch (getServiceAndId(post.link).service) {
      case 'instagram':
        return <InstagramEmbed url={post.link} width="100%" />
      case 'twitter':
        return <XEmbed url={post.link} width="100%" />
      case 'youtube':
        return <YouTubeEmbed url={post.link} width="100%" style={{ borderRadius: 10, border: 'none' }} />
      case 'tiktok':
        return <TikTokEmbed url={post.link} width="100%" />
      case 'discord':
        return (
          <video
            id="discord-embed"
            src={post.link}
            controls
            width="100%"
            style={{ borderRadius: 10, border: 'none', maxHeight: '60vh' }}
          ></video>
        )
      case 'reddit':
        return (
          <iframe
            id="reddit-embed"
            src={`${post.link.replace('www.reddit.com', 'www.redditmedia.com').split('/').slice(0, -1).join('/')}/?ref_source=embed&ref=share&embed=true`}
            sandbox="allow-scripts allow-same-origin allow-popups"
            width="100%"
            style={{ borderRadius: 10, border: 'none', height: '60vh' }}
          ></iframe>
        )
      default:
        return null
    }
  }, [post.link])

  return <div style={embedStyle}>{Embed}</div>
}
