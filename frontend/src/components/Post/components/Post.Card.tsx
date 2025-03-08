import {
  ActionIcon,
  Button,
  Card,
  Flex,
  Group,
  Modal,
  ScrollArea,
  Space,
  Text,
  useMantineColorScheme,
} from '@mantine/core'
import { PostMetadata } from './Post.Metadata'
import { PostContent } from './Post.Content'
import { PostActions } from './Post.Actions'
import { PaginatedPostResponse } from 'src/graphql/extended-types'
import styles from '../Post.module.css'
import { PostCore } from 'src/components/Post/Post.core'
import { uniqueCategoryBackground, CardBackground } from 'src/services/categories'
import { PostCategories } from 'src/components/Post/components/Post.Categories'
import { PostCallout } from 'src/components/Post/components/Post.Callout'
import { uiPath } from 'src/ui-paths'
import { getServiceAndId } from 'src/services/linkServices'
import { PostEmbed } from 'src/components/Post/components/Post.Embed'
import { truncate } from 'lodash'
import { emotesTextToHtml } from 'src/services/twitch'
import { PostProvider } from 'src/components/Post/Post.context'
import { useEffect, useState } from 'react'
import {
  IconLayoutNavbarExpand,
  IconLayoutNavbarCollapse,
  IconArrowsMinimize,
  IconArrowsMaximize,
  IconX,
} from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'

type PostCardProps = {
  post: PaginatedPostResponse & { nodeId: string }
  className?: string
  backgroundImage?: string
} & React.ComponentPropsWithoutRef<'div'>

export const PostCard = ({ post, className, backgroundImage, ...htmlProps }: PostCardProps) => {
  const { colorScheme } = useMantineColorScheme()
  const [fullScreenModal, setFullScreenModal] = useState(false)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)

  const uniqueCategory = post?.categories?.find((c) => uniqueCategoryBackground[c.category])
  const cardBackground: CardBackground = uniqueCategory ? uniqueCategoryBackground[uniqueCategory.category] : undefined
  const cardBackgroundImage = backgroundImage ? backgroundImage : cardBackground ? cardBackground.image : 'auto'
  const cardBackgroundColor = backgroundImage ? 'auto' : cardBackground ? cardBackground.color(colorScheme) : 'auto'

  return (
    <PostCore post={post}>
      <div
        onClick={(e) => {
          if (getServiceAndId(post.link).service === 'unknown') {
            window.open(post.link, '_blank')
          } else {
            openModal()
          }
        }}
      >
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
            backgroundColor: cardBackgroundColor,
          }}
        >
          <PostCallout />
          <Group>
            <PostMetadata />
            <Space />
            <PostCategories />
          </Group>
          <Space h="md" />
          <PostContent />

          <Space h="sm" />

          <Group align="center">
            <PostActions />
            <Text size="xs" c="dimmed">
              {post.comments.totalCount} comment{post.comments.totalCount === 1 ? '' : 's'}
            </Text>
          </Group>
        </Card>
      </div>
      <Modal
        className={styles.modalIframe}
        style={{
          // {/* FIXME: on mobile header overflows regardless of 100%*/}
          width: '100%',
        }}
        opened={modalOpened}
        withCloseButton={false}
        onClose={closeModal}
        fullScreen={fullScreenModal}
        scrollAreaComponent={ScrollArea.Autosize}
        title={
          <Flex justify="space-between" direction="column">
            <Flex direction="row" justify="space-between" align="center">
              <ActionIcon onClick={() => setFullScreenModal(!fullScreenModal)}>
                {fullScreenModal ? <IconArrowsMinimize size={16} /> : <IconArrowsMaximize size={16} />}
              </ActionIcon>
              <ActionIcon onClick={closeModal} variant="subtle">
                <IconX size={16} />
              </ActionIcon>
            </Flex>
            <Flex justify="center" align="center">
              <Text
                fw={700}
                mt="xs"
                size="sm"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                dangerouslySetInnerHTML={{ __html: emotesTextToHtml(truncate(post.title, { length: 60 }), 16) || '' }}
              />
            </Flex>
          </Flex>
        }
      >
        <PostProvider post={post}>
          <PostEmbed inline />
        </PostProvider>
      </Modal>
    </PostCore>
  )
}
