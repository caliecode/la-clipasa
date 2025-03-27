import { InstagramEmbed, TikTokEmbed, XEmbed, YouTubeEmbed } from 'react-social-media-embed'
import { usePostContext } from '../Post.context'
import { getServiceAndId } from 'src/services/linkServices'
import styles from '../Post.module.css'
import { useMantineColorScheme } from '@mantine/core'
interface PostEmbedProps {
  inline?: boolean
}

export const PostEmbed = ({ inline = false }: PostEmbedProps) => {
  const { post } = usePostContext()
  const { id, service } = getServiceAndId(post.link)
  const { colorScheme } = useMantineColorScheme()
  const embedStyle: React.CSSProperties = inline
    ? { maxWidth: '100%', height: '20vh' }
    : { overflow: 'scroll', maxWidth: '50vw' }

  const Embed = () => {
    switch (service) {
      case 'instagram':
        return <InstagramEmbed url={post.link} width="100%" />
      case 'twitter':
        return <XEmbed url={post.link} width="100%" />
      case 'youtube':
        return <YouTubeEmbed url={post.link} width="100%" />
      case 'tiktok':
        return <TikTokEmbed url={post.link} width="100%" />
      case 'reddit':
        return (
          <iframe
            id="reddit-embed"
            src={`${post.link.replace('www.reddit.com', 'www.redditmedia.com').split('/').slice(0, -1).join('/')}/?ref_source=embed&ref=share&embed=true`}
            sandbox="allow-scripts allow-same-origin allow-popups"
            height="600px"
            width="100%"
            style={{ borderRadius: 10, border: 'none' }}
          ></iframe>
        )
      default:
        return null
    }
  }

  return (
    <div style={embedStyle}>
      <Embed />
    </div>
  )
}
