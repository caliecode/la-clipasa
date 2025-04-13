import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconChevronDown } from '@tabler/icons-react'
import { Group, Image, Menu, UnstyledButton } from '@mantine/core'
import classes from './LanguageToggle.module.css'

const languages = [
  { label: 'English', value: 'en', image: `${import.meta.env.BASE_URL}/flags/en.webp` },
  { label: 'Español', value: 'es', image: `${import.meta.env.BASE_URL}/flags/es.webp` },
] as const

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const [opened, setOpened] = useState(false)

  const selected = languages.find((lang) => lang.value === i18n.language) || languages[0]

  const handleLanguageChange = (langValue) => {
    i18n.changeLanguage(langValue)
  }

  const items = languages.map((item) => (
    <Menu.Item onClick={() => handleLanguageChange(item.value)} key={item.value} lang={item.value}>
      <Group>
        <Image src={item.image} style={{ width: '16px', height: '16px' }} alt={item.label} />
        {item.label}
      </Group>
    </Menu.Item>
  ))

  return (
    <Menu onOpen={() => setOpened(true)} onClose={() => setOpened(false)} radius="md" withinPortal>
      <Menu.Target>
        <UnstyledButton
          className={classes.control}
          data-expanded={opened || undefined}
          pl={12}
          pr={12}
          aria-label={selected.label}
        >
          <Group gap={8}>
            <Image src={selected.image} style={{ width: '22px', height: '22px' }} />
            {selected.label}
          </Group>
          <IconChevronDown size={16} stroke={2} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>{items}</Menu.Dropdown>
    </Menu>
  )
}
