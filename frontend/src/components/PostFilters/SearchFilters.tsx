import { TextInput, Flex, Loader } from '@mantine/core'
import { IconCalendar } from '@tabler/icons'
import { useState, useEffect } from 'react'
import { useDebouncedValue } from '@mantine/hooks'
import { UserCombobox } from 'src/components/UserCombobox'
import { IUser } from 'src/types/ui'
import { usePostsSlice } from 'src/slices/posts'
import { DatePickerInput } from '@mantine/dates'
import { useUsersQuery } from 'src/graphql/gen'

const DEBOUNCE_DELAY_MS = 300

type SearchFiltersProps = {
  searchInputValue: string
  setSearchInputValue: (value: string) => void
}

export default function SearchFilters({ searchInputValue, setSearchInputValue }: SearchFiltersProps): JSX.Element {
  const { queryParams, postActions } = usePostsSlice()
  const [debouncedSearchValue] = useDebouncedValue(searchInputValue, DEBOUNCE_DELAY_MS)

  const [selectedUser, setSelectedUser] = useState<IUser | null>(null)

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    queryParams.where?.createdAtGTE ? new Date(queryParams.where.createdAtGTE) : null,
    queryParams.where?.createdAtLTE ? new Date(queryParams.where.createdAtLTE) : null,
  ])

  const ownerIdFilter = queryParams.where?.hasOwnerWith?.[0]?.id
  const [{ data: userData, fetching: fetchingUser }] = useUsersQuery({
    variables: {
      first: 1,
      where: { id: ownerIdFilter },
    },
    pause: !ownerIdFilter,
    requestPolicy: 'cache-first',
  })

  useEffect(() => {
    if (ownerIdFilter && userData && !fetchingUser) {
      const user = userData.users?.edges?.[0]?.node
      if (user) {
        setSelectedUser(user)
      } else {
        postActions.updateWhere((where) => {
          delete where.hasOwnerWith
        })
      }
    }
  }, [userData, fetchingUser, ownerIdFilter, postActions])

  useEffect(() => {
    postActions.setTextFilter(debouncedSearchValue || undefined)
  }, [debouncedSearchValue, postActions])

  useEffect(() => {
    if (dateRange[0] || dateRange[1]) {
      postActions.updateWhere((where) => {
        if (dateRange[0]) {
          const startDate = new Date(dateRange[0])
          startDate.setHours(0, 0, 0, 0)
          where.createdAtGTE = startDate.toISOString()
        } else {
          delete where.createdAtGTE
        }

        if (dateRange[1]) {
          const endDate = new Date(dateRange[1])
          endDate.setHours(23, 59, 59, 999)
          where.createdAtLTE = endDate.toISOString()
        } else {
          delete where.createdAtLTE
        }
      })
    } else {
      postActions.updateWhere((where) => {
        delete where.createdAtGTE
        delete where.createdAtLTE
      })
    }
  }, [dateRange, postActions])

  const handleUserSelect = (user: IUser | null) => {
    setSelectedUser(user)
    if (user) {
      postActions.updateWhere((where) => {
        where.hasOwnerWith = [{ id: user.id }]
      })
    } else {
      postActions.updateWhere((where) => {
        delete where.hasOwnerWith
      })
    }
  }

  return (
    <>
      <TextInput
        label="Search"
        id="post-search-box"
        placeholder="Filter by title, link or content"
        // rightSection={postActions.fetching && <Loader size={18} />}
        value={searchInputValue}
        onChange={(e) => setSearchInputValue(e.target.value)}
        mb="sm"
        mt="md"
      />
      <UserCombobox
        onChange={handleUserSelect}
        value={selectedUser}
        label="Select author"
        placeholder={fetchingUser ? 'Loading author...' : 'Search authors'}
        disabled={fetchingUser}
      />

      <Flex mt={10} gap="md" h="100%" justify="space-between" align="start" direction="row" wrap="wrap">
        <DatePickerInput
          label="From date"
          highlightToday
          placeholder="Select start date"
          value={dateRange?.[0] || null}
          onChange={(value) => setDateRange([value, dateRange?.[1] || null])}
          leftSection={<IconCalendar size={16} />}
          clearable
          valueFormat="YYYY-MM-DD"
          style={{ flex: 1, minWidth: '45%' }}
        />
        <DatePickerInput
          label="To date"
          highlightToday
          placeholder="Select end date"
          value={dateRange?.[1] || null}
          onChange={(value) => setDateRange([dateRange?.[0] || null, value])}
          leftSection={<IconCalendar size={16} />}
          clearable
          valueFormat="YYYY-MM-DD"
          style={{ flex: 1, minWidth: '45%' }}
        />
      </Flex>
    </>
  )
}
