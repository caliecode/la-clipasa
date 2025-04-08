import { Card, Group, Space, Text, useMantineColorScheme, ActionIcon, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconShieldOff, IconEye, IconEyeClosed } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PostCallout } from 'src/components/Post/components/Post.Callout'
import { usePostContext } from 'src/components/Post/Post.context'
import styles from '../Post.module.css'
import { uniqueCategoryBackground, CardBackground } from 'src/services/categories'
import { uiPath } from 'src/ui-paths'
import { PostMetadata } from './Post.Metadata'
import { PostCategories } from './Post.Categories'
import { PostContent } from './Post.Content'
import { PostActions } from './Post.Actions'
import { Post } from 'src/components/Post/components/Post'
import { PostModal } from 'src/components/Post/components/Post.Modal'
import { useCardBackground } from 'src/hooks/post/usePostCardBackground'
import { getServiceAndId } from 'src/services/linkServices'

type PostCardProps = {
  className?: string
  backgroundImage?: string
} & React.ComponentPropsWithoutRef<'div'>

export const PostCard = ({ className, backgroundImage, ...htmlProps }: PostCardProps) => {
  const { post } = usePostContext()
  const { colorScheme } = useMantineColorScheme()
  const [fullScreenModal, setFullScreenModal] = useState(false)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const navigate = useNavigate()
  const [isSeen, setIsSeen] = useState(false)

  const { image: categoryImage, color: categoryColor } = useCardBackground(post)
  const cardBackgroundImage = backgroundImage || categoryImage || 'auto'

  const handleCardClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    navigate(uiPath('/post/:postId', { postId: post.id }))
  }

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    openModal()
    setIsSeen(true)
  }

  return (
    <>
      <div onClick={handleCardClick}>
        <Card
          {...htmlProps}
          p="lg"
          radius={12}
          className={`${styles.card} ${className ?? ''}`}
          style={{
            ...htmlProps.style,
            backgroundImage: `url(${cardBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundBlendMode: 'overlay',
            backgroundColor: categoryColor,
            filter: post.deletedAt ? 'grayscale(80%)' : undefined,
            position: 'relative',
          }}
        >
          <Post />

          {getServiceAndId(post.link).service !== 'unknown' && (
            <Tooltip label="Preview post" withArrow>
              <ActionIcon
                variant="filled"
                size="md"
                radius="xl"
                color={isSeen ? 'var(--mantine-color-violet-5)' : 'var(--mantine-color-blue-9)'}
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  zIndex: 10,
                }}
                onClick={handlePreviewClick}
              >
                {isSeen ? <IconEyeClosed size={18} /> : <IconEye size={18} />}
              </ActionIcon>
            </Tooltip>
          )}
        </Card>
      </div>

      <PostModal
        isOpen={modalOpened}
        onClose={closeModal}
        isFullScreen={fullScreenModal}
        onToggleFullScreen={() => setFullScreenModal(!fullScreenModal)}
        post={post}
      />
    </>
  )
}
