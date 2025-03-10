import { useState } from 'react'
import {
  ActionIcon,
  Box,
  Combobox,
  Pill,
  PillsInput,
  Popover,
  Text,
  useCombobox,
  useMantineColorScheme,
} from '@mantine/core'
import { IconCheck, IconPlus } from '@tabler/icons'
import { PostCategoryCategory } from 'src/graphql/gen'
import { categoryEmojis, emojiInversion } from 'src/services/categories'

interface CategoriesSelectProps {
  selectedCategories: PostCategoryCategory[]
  onCategoriesChange: (categories: PostCategoryCategory[]) => void
  allowedCategories: PostCategoryCategory[]
}

export function CategoriesSelect({ selectedCategories, onCategoriesChange, allowedCategories }: CategoriesSelectProps) {
  const { colorScheme } = useMantineColorScheme()
  const [popoverOpened, setPopoverOpened] = useState(false)
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
  })

  const handleCategoryToggle = (val: PostCategoryCategory) => {
    const newCategories = selectedCategories.includes(val)
      ? selectedCategories.filter((c) => c !== val)
      : [...selectedCategories, val]
    onCategoriesChange(newCategories)
  }

  const values = selectedCategories.map((category) => (
    <Pill key={category} withRemoveButton onRemove={() => handleCategoryToggle(category)}>
      {category}
    </Pill>
  ))

  const options = allowedCategories.map((category) => (
    <Combobox.Option value={category} key={category} active={selectedCategories.includes(category)}>
      <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {selectedCategories.includes(category) && <IconCheck size={16} stroke={2.5} />}
        {categoryEmojis[category] && (
          <img
            style={{
              filter: emojiInversion[category] && colorScheme === 'dark' ? 'invert(100%)' : undefined,
            }}
            src={categoryEmojis[category]}
            height={24}
            width={24}
            alt=""
          />
        )}
        <Text>{category}</Text>
      </Box>
    </Combobox.Option>
  ))

  return (
    <Popover opened={popoverOpened} onChange={setPopoverOpened} position="bottom" closeOnClickOutside withArrow>
      <Popover.Target>
        <PillsInput
          label="Categories"
          pointer
          onClick={() => {
            setPopoverOpened(true)
            combobox.openDropdown()
          }}
        >
          <Pill.Group>{values.length > 0 ? values : <PillsInput.Field placeholder="Select categories" />}</Pill.Group>
        </PillsInput>
      </Popover.Target>

      <Popover.Dropdown>
        <Combobox store={combobox} onOptionSubmit={(val) => handleCategoryToggle(val as PostCategoryCategory)}>
          <Combobox.Options>{options}</Combobox.Options>
        </Combobox>
      </Popover.Dropdown>
    </Popover>
  )
}
