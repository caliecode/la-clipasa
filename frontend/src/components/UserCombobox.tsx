import { useState, useEffect } from 'react'
import { useCombobox, Combobox, InputBase, ScrollArea, Text, Space, Input, Group } from '@mantine/core'
import { useDebounce } from 'usehooks-ts'
import { Virtuoso } from 'react-virtuoso'
import { useUsersQuery } from 'src/graphql/gen'
import { useTranslation } from 'react-i18next'
import UserComboboxOption from 'src/components/Combobox/UserComboboxOption'
import InfiniteLoader from 'src/components/Loading/InfiniteLoader'
import { IUser } from 'src/types/ui'
interface UserComboboxProps {
  onChange: (user: IUser | null) => void
  value?: IUser | null
  label?: string
  placeholder?: string
  disabled?: boolean
}

export function UserCombobox({
  onChange,
  value = null,
  label = 'User',
  placeholder = 'Pick user',
  disabled,
}: UserComboboxProps) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [selectedUser, setSelectedUser] = useState<IUser | null>(value)

  const [{ data, fetching }] = useUsersQuery({
    variables: {
      first: 20,
      where: debouncedSearch ? { displayNameContainsFold: debouncedSearch } : undefined,
    },
    pause: !debouncedSearch,
  })
  const { t } = useTranslation()

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
      combobox.focusTarget()
      setSearch('')
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput()
    },
  })

  const options =
    data?.users.edges
      ?.map((edge) => {
        const user = edge?.node
        return user ? (
          <Combobox.Option value={user.displayName} key={user.id} style={{ padding: '1rem 0.5rem' }}>
            <UserComboboxOption user={user} />
          </Combobox.Option>
        ) : null
      })
      .filter(Boolean) || []

  const handleOptionSelect = (displayName: string) => {
    const user = data?.users.edges?.find((edge) => edge?.node?.displayName === displayName)?.node
    setSelectedUser(user || null)
    onChange(user || null)
    combobox.closeDropdown()
  }

  useEffect(() => {
    setSelectedUser(value)
  }, [value])

  return (
    <Combobox
      store={combobox}
      disabled={disabled}
      withinPortal
      position="bottom-start"
      withArrow
      onOptionSubmit={handleOptionSelect}
    >
      <Combobox.Target withAriaAttributes={false}>
        <InputBase
          label={label}
          component="button"
          type="button"
          pointer
          rightSection={selectedUser && <Input.ClearButton onClick={() => onChange(null)} />}
          onClick={() => combobox.toggleDropdown()}
          multiline
        >
          {selectedUser ? (
            <UserComboboxOption user={selectedUser} />
          ) : (
            <Input.Placeholder>{placeholder}</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={t('common.typeToSearch')}
        />
        <Combobox.Options mah={200} style={{ overflowY: 'auto' }}>
          <ScrollArea.Autosize mah={200} type="scroll">
            {fetching ? (
              <Group justify="center" pt={12} pb={12}>
                <InfiniteLoader />
              </Group>
            ) : (
              <Virtuoso
                style={{ height: '200px' }}
                totalCount={options.length}
                itemContent={(index) => options[index]}
              />
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
        <Space p={4} />
        {options.length ? (
          <Text size="sm">{t('common.showingResults', { count: options.length, total: data?.users.totalCount })}</Text>
        ) : null}
      </Combobox.Dropdown>{' '}
    </Combobox>
  )
}
