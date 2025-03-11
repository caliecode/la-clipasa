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
import { IconCheck } from '@tabler/icons'
import { PostCategoryCategory } from 'src/graphql/gen'
import { categoryEmojis, emojiInversion, PostCategoryNames, EMOJI_SIZE } from 'src/services/categories'

interface CategoriesSelectProps {
  selectedCategories: PostCategoryCategory[]
  onCategoriesChange: (categories: PostCategoryCategory[]) => void
  allowedCategories: PostCategoryCategory[]
}

function CategoryPill({ value, onRemove }: { value: PostCategoryCategory; onRemove: () => void }) {
  const { colorScheme } = useMantineColorScheme()

  return (
    <Pill withRemoveButton onRemove={onRemove}>
      <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {categoryEmojis[value] && (
          <img
            style={{
              filter: emojiInversion[value] && colorScheme === 'dark' ? 'invert(100%)' : undefined,
            }}
            src={categoryEmojis[value]}
            height={EMOJI_SIZE}
            width={EMOJI_SIZE}
            alt=""
          />
        )}
        <Text size="sm">{PostCategoryNames[value]}</Text>
      </Box>
    </Pill>
  )
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
    <CategoryPill key={category} value={category} onRemove={() => handleCategoryToggle(category)} />
  ))

  const options = allowedCategories.map((category) => {
    const isSelected = selectedCategories.includes(category)
    return (
      <Combobox.Option value={category} key={category} active={isSelected}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isSelected && <IconCheck size={16} stroke={2.5} />}
          {categoryEmojis[category] && (
            <img
              style={{
                filter: emojiInversion[category] && colorScheme === 'dark' ? 'invert(100%)' : undefined,
              }}
              src={categoryEmojis[category]}
              height={EMOJI_SIZE}
              width={EMOJI_SIZE}
              alt=""
            />
          )}
          <Text>{PostCategoryNames[category]}</Text>
        </Box>
      </Combobox.Option>
    )
  })

  return (
    <Popover
      opened={popoverOpened}
      onChange={setPopoverOpened}
      position="bottom"
      closeOnClickOutside
      withArrow
      width="target"
      trapFocus
    >
      <Popover.Target>
        <PillsInput
          label="Categories"
          pointer
          onClick={(e) => {
            e.stopPropagation()
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
