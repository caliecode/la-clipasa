import { Button, Card, Group } from '@mantine/core'
import { IconSend } from '@tabler/icons'
import { HTMLProps, useState } from 'react'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { useUISlice } from 'src/slices/ui'
import styles from './PostFilters.module.css'
import { usePostsSlice } from 'src/slices/posts'
import { useMantineTheme } from '@mantine/core'
import CategoryFilters from 'src/components/PostFilters/CategoryFilters'
import CreatePostModal from 'src/components/PostFilters/CreatePostModal'
import ModerationFilters from 'src/components/PostFilters/ModerationFilters'
import PersonalFilters from 'src/components/PostFilters/PersonalFilters'
import SearchFilters from 'src/components/PostFilters/SearchFilters'
import SortSelect from 'src/components/PostFilters/SortFilter'

type PostFiltersProps = HTMLProps<HTMLDivElement>

export default function PostFilters(props: PostFiltersProps): JSX.Element {
  const { ...htmlProps } = props
  const [newPostModalOpened, setNewPostModalOpened] = useState(false)
  const { isAuthenticated, user, isAuthenticating } = useAuthenticatedUser()
  const textQuery = usePostsSlice((state) => state.queryParams.where?.titleContains)
  const [searchInputValue, setSearchInputValue] = useState<string>(textQuery || '')
  const theme = useMantineTheme()
  const { burgerOpened } = useUISlice()

  return (
    <div {...htmlProps}>
      <CreatePostModal opened={newPostModalOpened} onClose={() => setNewPostModalOpened(false)} />

      <Group className={styles.sideActions}>
        <Card radius="md" p="md" className={styles.card} w="100%">
          {isAuthenticated && (
            <Group mt="xs">
              <Button
                bg={theme.colors.blue[9]}
                leftSection={<IconSend size={20} stroke={1.5} />}
                radius="md"
                style={{ flex: 1 }}
                onClick={() => setNewPostModalOpened(true)}
              >
                Submit post
              </Button>
            </Group>
          )}

          <Card.Section className={styles.section}>
            <SearchFilters searchInputValue={searchInputValue} setSearchInputValue={setSearchInputValue} />
            <SortSelect />
          </Card.Section>

          <ProtectedComponent requiredRole="MODERATOR">
            <ModerationFilters />
          </ProtectedComponent>

          {isAuthenticated && <PersonalFilters userId={user?.id} />}

          <CategoryFilters />
        </Card>
      </Group>
    </div>
  )
}
