import {
  ActionIcon,
  Button,
  Card,
  Chip,
  Flex,
  Group,
  Loader,
  Menu,
  Modal,
  Popover,
  ScrollArea,
  Select,
  Space,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  useMantineTheme,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { showNotification } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import {
  IconEyeCheck,
  IconSearch,
  IconSend,
  IconSortAscending,
  IconSortDescending,
  IconCalendar,
  IconHeart,
  IconBookmark,
} from '@tabler/icons'
import { InfiniteData, useQueryClient } from '@tanstack/react-query'
import { isEqual, set } from 'lodash-es'
import { HTMLProps, useEffect, useRef, useState } from 'react'
import CategoryBadge from 'src/components/CategoryBadge'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { emotesTextToHtml } from 'src/services/twitch'
import { SortSelectOption, usePostsSlice } from 'src/slices/posts'
import { useUISlice } from 'src/slices/ui'

import styles from './HomeSideActions.module.css'
import {
  CreatePostInput,
  CreatePostWithCategoriesInput,
  PostCategory,
  PostCategoryCategory,
  PostOrder,
  PostWhereInput,
  useCreatePostMutation,
  useUsersQuery,
} from 'src/graphql/gen'
import { isValidURL } from 'src/utils/urls'
import ErrorCallout from 'src/components/Callout/ErrorCallout'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import { PostCategoryNames, PostCategoryNamesOnCreate } from 'src/services/categories'
import { sanitizeContentEditableInputBeforeSubmit } from 'src/utils/strings'
import { getCaretCoordinates } from 'src/utils/input'
import { CategoriesSelect } from 'src/components/CategorySelect'
import { keys } from 'src/utils/object'
import { extractGqlErrors } from 'src/utils/errors'
import { DatePickerInput } from '@mantine/dates'
import { UserCombobox } from 'src/components/UserCombobox'
import { IUser } from 'src/types/ui'

const tooltipWithPx = 40
const EMOJI_SIZE = 24
const DEBOUNCE_DELAY_MS = 300

type HomeSideActionsProps = HTMLProps<HTMLDivElement>

export default function HomeSideActions(props: HomeSideActionsProps) {
  const { ...htmlProps } = props
  const [createPostMutation, createPost] = useCreatePostMutation()
  const [titlePreviewPopoverOpened, setTitlePreviewPopoverOpened] = useState(false)
  const { sort, queryParams, lastSeenCursor, postActions } = usePostsSlice()
  const { burgerOpened, setBurgerOpened } = useUISlice()
  const queryClient = useQueryClient()
  const [newPostModalOpened, setNewPostModalOpened] = useState(false)
  const emoteTooltipRef = useRef<HTMLSpanElement>(null)
  const titleInputRef = useRef<HTMLTextAreaElement>(null)
  const [typedEmote, setTypedEmote] = useState('')
  const [awaitEmoteCompletion, setAwaitEmoteCompletion] = useState(false)
  const [calloutErrors, setCalloutErrors] = useState<string[]>([])
  const { isAuthenticated, user, isAuthenticating } = useAuthenticatedUser()
  const textQuery = usePostsSlice((state) => state.queryParams.where?.titleContains)
  const [searchInputValue, setSearchInputValue] = useState(textQuery || '')
  const [debouncedSearchValue] = useDebouncedValue(searchInputValue, DEBOUNCE_DELAY_MS)
  const theme = useMantineTheme()

  const ownerIdFilter = queryParams.where?.hasOwnerWith?.[0]?.id
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null)

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

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    queryParams.where?.createdAtGTE ? new Date(queryParams.where.createdAtGTE) : null,
    queryParams.where?.createdAtLTE ? new Date(queryParams.where.createdAtLTE) : null,
  ])

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

  const postCreateForm = useForm<CreatePostWithCategoriesInput>({
    initialValues: {
      base: {} as CreatePostInput,
      categories: [],
    },
    validate: {
      base: {
        title: (value) =>
          !value || value.trim() === '' || value.trim() === '<br>'
            ? 'Title cannot be empty'
            : value?.length > 150
              ? 'Title can have at most 150 characters.'
              : null,
        link: (value) =>
          !isValidURL(value)
            ? 'Link is not a valid URL'
            : value?.length > 250
              ? 'Link can have at most 250 characters.'
              : null,
        content: (value) => (value && value.length > 400 ? 'Message can have at most 400 characters.' : null),
      },
    },
  })

  useEffect(() => {
    user && postCreateForm.setFieldValue('base.ownerID', user.id)
  }, [user, postCreateForm])

  useEffect(() => {
    if (awaitEmoteCompletion && emoteTooltipRef.current) {
      const { x, y } = getCaretCoordinates()
      emoteTooltipRef.current.setAttribute('aria-hidden', 'false')
      emoteTooltipRef.current.setAttribute(
        'style',
        `display: inline-block; left: ${x - tooltipWithPx / 2}px; top: ${y - 36}px`,
      )
    } else if (emoteTooltipRef.current) {
      emoteTooltipRef.current.setAttribute('aria-hidden', 'true')
      emoteTooltipRef.current.setAttribute('style', 'display: none;')
    }
  }, [awaitEmoteCompletion])

  useEffect(() => {
    setSearchInputValue(textQuery || '')
  }, [textQuery])

  const handleSubmit = postCreateForm.onSubmit(async (values) => {
    values.base.title = sanitizeContentEditableInputBeforeSubmit(values.base.title)
    const res = await createPost({ input: values })

    if (res.error) {
      const errors = extractGqlErrors(res.error.graphQLErrors)
      if (errors.length === 0) errors.push(res.error.message)

      setCalloutErrors(errors)
      return
    }

    setNewPostModalOpened(false)
    setBurgerOpened(false)
    showNotification({
      id: 'post-created',
      title: 'Post submitted',
      message: 'Post created successfully',
      color: 'green',
      icon: <IconSend size={18} />,
      autoClose: 5000,
    })
  })

  function renderActiveCategoryFilters() {
    return queryParams.where?.hasCategoriesWith?.map(
      (c, i) =>
        c.or &&
        c.or.length > 0 &&
        c.or.map((cat, j) => {
          const category = cat.category!
          return (
            <CategoryBadge
              asButton
              className={`${styles.badgeHover} disable-select`}
              key={j}
              category={category}
              onClick={() => postActions.toggleCategory(category)}
            />
          )
        }),
    )
  }

  function renderCategoryFilters() {
    return Object.keys(PostCategoryNames)
      .filter(
        (c: PostCategoryCategory) =>
          !queryParams.where?.hasCategoriesWith
            ?.find((c) => c.or && c.or.length > 0)
            ?.or?.some((cat) => cat.category === c),
      )
      .map((category: PostCategoryCategory, i) => {
        return (
          <CategoryBadge
            asButton
            className={`${styles.badgeFilter} disable-select`}
            key={i}
            category={category}
            onClick={() => {
              postActions.toggleCategory(category)
            }}
          />
        )
      })
  }

  const renderNewPostModal = () => (
    <Modal
      opened={newPostModalOpened}
      onClose={() => {
        setNewPostModalOpened(false)
        setAwaitEmoteCompletion(false)
      }}
      title="Create a new post"
      closeOnEscape={false}
    >
      <ErrorCallout title="Error uploading post" errors={calloutErrors} />
      <form onSubmit={handleSubmit}>
        <Popover
          opened={titlePreviewPopoverOpened}
          classNames={{ dropdown: styles.popoverDropdown }}
          position="right"
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <div>
              <Textarea
                {...postCreateForm.getInputProps('base.title')}
                ref={titleInputRef}
                data-autofocus
                withAsterisk
                label="Title"
                placeholder="Enter a title"
                onClick={() => setTitlePreviewPopoverOpened(true)}
                onFocus={() => setTitlePreviewPopoverOpened(true)}
                onBlur={() => setTitlePreviewPopoverOpened(false)}
                rightSection={
                  <Tooltip label="Preview">
                    <Group>
                      <IconEyeCheck
                        color="#4077aa"
                        size={20}
                        className={styles.iconClickable}
                        onClick={() => setTitlePreviewPopoverOpened(!titlePreviewPopoverOpened)}
                      />
                    </Group>
                  </Tooltip>
                }
                autosize
                minRows={2}
              />
              <Text size="xs" opacity={0.6}>
                You can use channel emotes here.
              </Text>
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <div
              dangerouslySetInnerHTML={{
                __html: emotesTextToHtml(postCreateForm.values.base.title, EMOJI_SIZE) || '',
              }}
            ></div>
          </Popover.Dropdown>
        </Popover>
        <TextInput withAsterisk label="Link" {...postCreateForm.getInputProps('base.link')} />
        <TextInput label="Content" {...postCreateForm.getInputProps('base.content')} />
        <Text size="xs" opacity={0.6}>
          Leave message empty to show link by default.
        </Text>
        <CategoriesSelect
          {...postCreateForm.getInputProps('categories')}
          selectedCategories={postCreateForm.values.categories || []}
          onCategoriesChange={(categories) => postCreateForm.setFieldValue('categories', categories)}
          allowedCategories={keys(PostCategoryNamesOnCreate)}
        />
        <Group justify="end" mt="md">
          <Button
            variant="gradient"
            gradient={{ from: '#1864ab', to: '#326798', deg: 225 }}
            type="submit"
            loading={createPostMutation.fetching}
          >
            Submit
          </Button>
        </Group>
      </form>
    </Modal>
  )

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

  type SelectData<T> = { value: T; label: string }[]
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
  const statusSelectData: SelectData<string> = [
    { value: '', label: 'All' },
    { value: 'true', label: 'Moderated' },
    { value: 'false', label: 'Not moderated' },
  ]

  const withLikedFilter = queryParams.where?.hasLikedByWith?.some((u) => u.id === user?.id)
  const withSavedFilter = queryParams.where?.hasSavedByWith?.some((u) => u.id === user?.id)
  const withOwnedPostsFilter = queryParams.where?.hasOwnerWith?.some((u) => u.id === user?.id)

  return (
    <div {...htmlProps}>
      {renderNewPostModal()}
      <span
        className={styles.tooltip}
        ref={emoteTooltipRef}
        aria-hidden="true"
        dangerouslySetInnerHTML={{
          __html: emotesTextToHtml(typedEmote, EMOJI_SIZE) || '',
        }}
      ></span>
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
            <TextInput
              label="Search"
              id="post-search-box"
              placeholder="Filter by title, link or content"
              rightSection={createPostMutation.fetching && <Loader size={18} />}
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
            {fetchingUser && (
              <Text size="xs" c="dimmed" mt={5}>
                Loading user data...
              </Text>
            )}
          </Card.Section>
          <Card.Section className={styles.section}>
            <Flex mt={10} gap="md" justify="space-between" align="center" direction="row" wrap="wrap">
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
          </Card.Section>
          <ProtectedComponent requiredRole="MODERATOR">
            <Menu>
              <Card.Section className={styles.section}>
                <Text mt="md" className={styles.label} c="dimmed">
                  Moderation filters
                </Text>
                <Flex mt={10} gap="md" justify="space-between" align="center" direction="row" wrap="wrap">
                  <Select
                    style={{ flexGrow: 10, minWidth: '100%' }}
                    data={statusSelectData}
                    onChange={(value: string) => {
                      const moderated = value ? value === 'true' : undefined
                      postActions.updateWhere((where) => {
                        where.isModerated = moderated
                      })
                    }}
                    placeholder="Select posts to show"
                    defaultValue={
                      queryParams?.where?.isModerated === undefined ? undefined : String(queryParams.where?.isModerated)
                    }
                  />
                </Flex>
              </Card.Section>
            </Menu>
          </ProtectedComponent>
          <Menu>
            {isAuthenticated && (
              <Card.Section className={styles.section}>
                <Text mt="md" className={styles.label} c="dimmed">
                  Personal filters
                </Text>
                <Flex mt={10} gap="md" justify="center" align="center" direction="row" wrap="wrap">
                  <Chip
                    variant="filled"
                    color="green"
                    checked={withLikedFilter}
                    onClick={() =>
                      postActions.updateWhere((where) => {
                        where.hasLikedByWith = withLikedFilter ? [] : [{ id: user?.id }]
                      })
                    }
                    icon={
                      <IconHeart
                        size={16}
                        stroke={1.5}
                        color={theme.colors.red[6]}
                        fill={withLikedFilter ? theme.colors.red[6] : theme.colors.gray[6]}
                      />
                    }
                  >
                    Liked
                  </Chip>
                  <Chip
                    variant="filled"
                    color="green"
                    checked={withSavedFilter}
                    onClick={() =>
                      postActions.updateWhere((where) => {
                        where.hasSavedByWith = withSavedFilter ? [] : [{ id: user?.id }]
                      })
                    }
                    icon={
                      <IconBookmark
                        size={16}
                        stroke={1.5}
                        color={theme.colors.yellow[6]}
                        fill={withSavedFilter ? theme.colors.yellow[6] : theme.colors.gray[6]}
                      />
                    }
                  >
                    Saved
                  </Chip>
                  <Chip
                    variant="filled"
                    color="green"
                    checked={withOwnedPostsFilter}
                    onClick={() =>
                      postActions.updateWhere((where) => {
                        where.hasOwnerWith = withOwnedPostsFilter ? [] : [{ id: user?.id }]
                      })
                    }
                  >
                    My posts
                  </Chip>
                </Flex>
              </Card.Section>
            )}
          </Menu>
          <Card.Section className={styles.section}>
            <Text mt="md" className={styles.label} c="dimmed">
              Active category filters
            </Text>
            <Group gap={7} mt={5}>
              {renderActiveCategoryFilters()}
            </Group>
          </Card.Section>
          <Card.Section className={styles.section}>
            <Text mt="md" className={styles.label} c="dimmed">
              Filter by category
            </Text>
            <Group gap={7} mt={5}>
              {renderCategoryFilters()}
            </Group>
          </Card.Section>
        </Card>
      </Group>
    </div>
  )
}
