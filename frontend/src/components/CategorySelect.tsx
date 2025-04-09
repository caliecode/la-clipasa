import { Combobox, Pill, PillsInput, Text, useCombobox, Box, useMantineColorScheme } from '@mantine/core'
import { IconCheck } from '@tabler/icons'
import { PostCategoryCategory } from 'src/graphql/gen'
import { categoryEmojis, emojiInversion, PostCategoryNames, EMOJI_SIZE } from 'src/services/categories'
import { ComponentProps, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

type CategoriesSelectProps = {
  selectedCategories: PostCategoryCategory[]
  onCategoriesChange: (categories: PostCategoryCategory[]) => void
  allowedCategories: PostCategoryCategory[]
  optionsVisible?: boolean
  label?: string
  errorOccurred?: number // This will be a counter or timestamp that changes when error occurs
} & ComponentProps<typeof Combobox>

function CategoryPill({ value, onRemove }: { value: PostCategoryCategory; onRemove: () => void }) {
  const { t } = useTranslation()
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

export function CategoriesSelect({
  selectedCategories,
  onCategoriesChange,
  allowedCategories,
  optionsVisible = true,
  label,
  errorOccurred = 0,
  ...props
}: CategoriesSelectProps) {
  const { t } = useTranslation()
  const { colorScheme } = useMantineColorScheme()
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
  })

  const prevErrorRef = useRef(errorOccurred)

  useEffect(() => {
    if (errorOccurred !== prevErrorRef.current) {
      combobox.closeDropdown()
    }
    prevErrorRef.current = errorOccurred
  }, [errorOccurred, combobox])

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
    <Combobox {...props} store={combobox} onOptionSubmit={(val) => handleCategoryToggle(val as PostCategoryCategory)}>
      <Combobox.Target>
        <PillsInput
          label={label || t('common.categories')}
          pointer
          onClick={(e) => {
            e.stopPropagation()
            combobox.toggleDropdown()
          }}
        >
          <Pill.Group>
            {values.length > 0 ? values : <PillsInput.Field placeholder={t('common.selectCategories')} />}
          </Pill.Group>
        </PillsInput>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>{optionsVisible ? options : null}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}
