import { Card, Chip, Flex, Text, useMantineTheme } from '@mantine/core'
import { IconBookmark, IconHeart } from '@tabler/icons'
import { usePostsSlice } from 'src/slices/posts'
import styles from './PostFilters.module.css'
import { useTranslation } from 'react-i18next'

type PersonalFiltersProps = {
  userId: string | undefined
}

export default function PersonalFilters({ userId }: PersonalFiltersProps): JSX.Element {
  const { queryParams, postActions } = usePostsSlice()
  const theme = useMantineTheme()
  const { t } = useTranslation()

  const withLikedFilter = queryParams.where?.hasLikedByWith?.some((u) => u.id === userId)
  const withSavedFilter = queryParams.where?.hasSavedByWith?.some((u) => u.id === userId)
  const withOwnedPostsFilter = queryParams.where?.hasOwnerWith?.some((u) => u.id === userId)

  return (
    <Card.Section className={styles.section}>
      <Text mt="md" className={styles.label} c="dimmed">
        {t('post.filters.personal.title')}
      </Text>
      <Flex mt={10} gap="md" justify="center" align="center" direction="row" wrap="wrap">
        <Chip
          variant="filled"
          color="green"
          checked={withLikedFilter}
          onClick={() =>
            postActions.updateWhere((where) => {
              where.hasLikedByWith = withLikedFilter ? [] : [{ id: userId }]
            })
          }
          icon={
            <IconHeart
              size={16}
              stroke={1.5}
              color={theme.colors.red[6]}
              fill={withLikedFilter ? theme.colors.red[6] : theme.colors.gray[6]}
            />
          }
        >
          {t('post.filters.personal.liked')}
        </Chip>
        <Chip
          variant="filled"
          color="green"
          checked={withSavedFilter}
          onClick={() =>
            postActions.updateWhere((where) => {
              where.hasSavedByWith = withSavedFilter ? [] : [{ id: userId }]
            })
          }
          icon={
            <IconBookmark
              size={16}
              stroke={1.5}
              color={theme.colors.yellow[6]}
              fill={withSavedFilter ? theme.colors.yellow[6] : theme.colors.gray[6]}
            />
          }
        >
          {t('post.filters.personal.saved')}
        </Chip>
        <Chip
          variant="filled"
          color="green"
          checked={withOwnedPostsFilter}
          onClick={() =>
            postActions.updateWhere((where) => {
              where.hasOwnerWith = withOwnedPostsFilter ? [] : [{ id: userId }]
            })
          }
        >
          {t('post.filters.personal.myPosts')}
        </Chip>
      </Flex>
    </Card.Section>
  )
}
