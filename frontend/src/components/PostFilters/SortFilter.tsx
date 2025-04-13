import { ActionIcon, Flex, Select, Tooltip } from '@mantine/core'
import { IconSortAscending, IconSortDescending } from '@tabler/icons'
import { useTranslation } from 'react-i18next'
import { SortSelectOption, usePostsSlice } from 'src/slices/posts'

type SelectData<T> = { value: T; label: string }[]

export default function SortSelect(): JSX.Element {
  const { sort, queryParams, postActions } = usePostsSlice()
  const { t } = useTranslation()
  const sortDirection = queryParams.orderBy?.direction

  const sortSelectData: SelectData<SortSelectOption> = [
    {
      value: 'creationDate',
      label:
        sortDirection === 'ASC' ? t('post.filters.sort.creationDate_asc') : t('post.filters.sort.creationDate_desc'),
    },
    {
      value: 'lastSeen',
      label: sortDirection === 'ASC' ? t('post.filters.sort.lastSeen_asc') : t('post.filters.sort.lastSeen_desc'),
    },
    {
      value: 'mostLiked',
      label: t('post.filters.sort.mostLiked'),
    },
    {
      value: 'approvedAt',
      label: sortDirection === 'ASC' ? t('post.filters.sort.approvedAt_asc') : t('post.filters.sort.approvedAt_desc'),
    },
  ]

  return (
    <Flex mt={10} gap="md" justify="space-between" align="center" direction="row" wrap="wrap">
      <Select
        label={t('post.filters.sort.label')}
        style={{ flexGrow: 10, minWidth: '100%' }}
        data={sortSelectData}
        onChange={(value: SortSelectOption) => {
          postActions.setSort(value)
        }}
        rightSectionPointerEvents="all"
        rightSection={
          <Tooltip label="Toggle sort direction">
            <ActionIcon
              onClick={(e) => {
                e.stopPropagation()
                postActions.updateOrder((order) => {
                  order.direction = order.direction === 'ASC' ? 'DESC' : 'ASC'
                })
              }}
              variant="subtle"
              radius={0}
              size={36}
            >
              {sortDirection === 'ASC' ? (
                <IconSortAscending size={20} stroke={1.5} />
              ) : (
                <IconSortDescending size={20} stroke={1.5} />
              )}
            </ActionIcon>
          </Tooltip>
        }
        placeholder="Select post ordering"
        value={sort}
      />
    </Flex>
  )
}
