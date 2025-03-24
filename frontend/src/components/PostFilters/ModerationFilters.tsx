import { Card, Flex, Select, Text } from '@mantine/core'
import { usePostsSlice } from 'src/slices/posts'
import styles from './PostFilters.module.css'
import DeletionStatusFilter from 'src/components/PostFilters/DeletionStatusFilter'

type SelectData = { value: string; label: string }[]

export default function ModerationFilters(): JSX.Element {
  const { queryParams, postActions } = usePostsSlice()

  const statusSelectData: SelectData = [
    { value: '', label: 'All' },
    { value: 'true', label: 'Moderated' },
    { value: 'false', label: 'Not moderated' },
  ]

  return (
    <Card.Section className={styles.section}>
      <Text mt="md" className={styles.label} c="dimmed">
        Moderation filters
      </Text>
      <Flex mt={10} gap="md" justify="space-between" align="center" direction="row" wrap="wrap" w="100%">
        <Select
          style={{ flexGrow: 10, minWidth: '100%' }}
          label="Moderation status"
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
        <DeletionStatusFilter />
      </Flex>
    </Card.Section>
  )
}
