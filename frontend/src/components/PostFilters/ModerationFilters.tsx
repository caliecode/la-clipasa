import { Card, Flex, Select, Text } from '@mantine/core'
import { usePostsSlice } from 'src/slices/posts'
import styles from './PostFilters.module.css'
import DeletionStatusFilter from 'src/components/PostFilters/DeletionStatusFilter'
import { useTranslation } from 'react-i18next'

type SelectData = { value: string; label: string }[]

export default function ModerationFilters(): JSX.Element {
  const { queryParams, postActions } = usePostsSlice()
  const { t } = useTranslation()
  const statusSelectData: SelectData = [
    { value: '', label: t('post.filters.moderation.statusPlaceholder') },
    { value: 'true', label: t('post.filters.moderation.moderated') },
    { value: 'false', label: t('post.filters.moderation.notModerated') },
  ]

  return (
    <Card.Section className={styles.section}>
      <Text mt="md" className={styles.label} c="dimmed">
        {t('post.filters.moderation.title')}
      </Text>
      <Flex mt={10} gap="md" justify="space-between" align="center" direction="row" wrap="wrap" w="100%">
        <Select
          style={{ flexGrow: 10, minWidth: '100%' }}
          label={t('post.filters.moderation.statusLabel')}
          data={statusSelectData}
          onChange={(value: string) => {
            const moderated = value ? value === 'true' : undefined
            postActions.updateWhere((where) => {
              where.isModerated = moderated
            })
          }}
          placeholder={t('post.filters.moderation.statusPlaceholder')}
          defaultValue={
            queryParams?.where?.isModerated === undefined ? undefined : String(queryParams.where?.isModerated)
          }
        />
        <DeletionStatusFilter />
      </Flex>
    </Card.Section>
  )
}
