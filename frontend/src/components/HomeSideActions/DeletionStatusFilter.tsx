import { Flex, Select, Text } from '@mantine/core'
import { useEffect, useState } from 'react'
import { usePostsSlice } from 'src/slices/posts'

type DeletionFilter = 'all' | 'deleted' | 'default'
type SelectData = { value: DeletionFilter; label: string }[]

export default function DeletionStatusFilter() {
  const { postActions } = usePostsSlice()

  const deletionSelectData: SelectData = [
    { value: 'all', label: 'Show all posts' },
    { value: 'default', label: 'Exclude deleted posts' },
    { value: 'deleted', label: 'Show only deleted posts' },
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
        label="Deletion status"
        data={deletionSelectData}
        onChange={(value) => setDeletionStatus((value as DeletionFilter) || 'all')}
        placeholder="Select deletion filter"
        value={deletionStatus}
      />
    </Flex>
  )
}
