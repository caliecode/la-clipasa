import { Text, Button, Group, Flex, Space } from '@mantine/core'
import { IconExternalLink } from '@tabler/icons'
import { truncate } from 'lodash-es'
import { emotesTextToHtml } from 'src/services/twitch'
import { usePostContext } from '../Post.context'
interface PostContentProps {
  truncateLength?: number
}

export const PostContent = ({ truncateLength = 500 }: PostContentProps) => {
  const { post } = usePostContext()

  return (
    <>
      <Flex direction="column">
        <Text
          fw={700}
          mt="xs"
          dangerouslySetInnerHTML={{ __html: emotesTextToHtml(truncate(post.title, { length: 100 }), 28) || '' }}
        />
        <Space mb={10} />
        <Button
          component="a"
          href={post.link}
          target="_blank"
          variant="subtle"
          m={0}
          size="xs"
          leftSection={<IconExternalLink size={14} />}
        >
          {truncate(post.link, { length: 40 })}
        </Button>
        <Text
          size="sm"
          dangerouslySetInnerHTML={{
            __html: emotesTextToHtml(truncate(post.content || '', { length: truncateLength }), 20) || '',
          }}
        />
      </Flex>
    </>
  )
}
