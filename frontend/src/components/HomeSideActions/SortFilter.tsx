import { ActionIcon, Flex, Select, Tooltip } from '@mantine/core'
import { IconSortAscending, IconSortDescending } from '@tabler/icons'
import { SortSelectOption, usePostsSlice } from 'src/slices/posts'

type SelectData<T> = { value: T; label: string }[]

export default function SortSelect(): JSX.Element {
  const { sort, queryParams, postActions } = usePostsSlice()

  const sortDirection = queryParams.orderBy?.direction

  const sortSelectData: SelectData<SortSelectOption> = [
    {
      value: 'creationDate',
      label: `Creation date ${sortDirection === 'ASC' ? '(newest last)' : '(newest first)'}`,
    },
    {
      value: 'lastSeen',
      label: `From last seen ${sortDirection === 'ASC' ? '(ascending creation date)' : '(descending creation date)'}`,
    },
  ]

  return (
    <Flex mt={10} gap="md" justify="space-between" align="center" direction="row" wrap="wrap">
      <Select
        label="Sort by"
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
