import { Flex, Select, Text } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePostsSlice } from 'src/slices/posts'

type DeletionFilter = 'all' | 'deleted' | 'default'
type SelectData = { value: DeletionFilter; label: string }[]

export default function DeletionStatusFilter() {
  const { postActions } = usePostsSlice()
  const { t } = useTranslation()
  const deletionSelectData: SelectData = [
    { value: 'all', label: t('post.filters.moderation.deletion.showAll') },
    { value: 'default', label: t('post.filters.moderation.deletion.excludeDeleted') },
    { value: 'deleted', label: t('post.filters.moderation.deletion.showDeletedOnly') },
  ]

  const [deletionStatus, setDeletionStatus] = useState<DeletionFilter>('default')

  useEffect(() => {
    postActions.updateWhere((where) => {
      switch (deletionStatus) {
        case 'all':
          where.includeDeleted = true
          where.includeDeletedOnly = false
          break
        case 'deleted':
          where.includeDeleted = true
          where.includeDeletedOnly = true
          break
        case 'default':
          where.includeDeleted = false
          where.includeDeletedOnly = false
          break
      }
    })
  }, [deletionStatus, postActions])

  return (
    <Flex direction="column" style={{ flexGrow: 10, minWidth: '100%' }}>
      <Select
        label={t('post.filters.moderation.deletion.label')}
        data={deletionSelectData}
        onChange={(value) => setDeletionStatus((value as DeletionFilter) || 'all')}
        placeholder={t('post.filters.moderation.deletion.placeholder')}
        value={deletionStatus}
      />
    </Flex>
  )
}
