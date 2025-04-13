import React, { useState, useMemo } from 'react'
import { Container, Title, ActionIcon, Tooltip, Text, LoadingOverlay, Alert, Space, Box } from '@mantine/core'
import { DataTable, DataTableColumn, DataTableSortStatus } from 'mantine-datatable'
import { IconTrash, IconInfoCircle } from '@tabler/icons-react'
import { useMyRefreshTokensQuery, useDeleteRefreshTokenMutation, RefreshTokenFragment } from 'src/graphql/gen'
import PageTemplate from 'src/components/PageTemplate'
import { useTranslation } from 'react-i18next'
import { UAParser } from 'ua-parser-js'
import { notifications } from '@mantine/notifications'
import { openConfirmModal } from '@mantine/modals'
import { extractGqlErrors } from 'src/utils/errors'
import styles from './SessionManagementPage.module.css'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import dayjs from 'dayjs'

const parseUserAgent = (uaString?: string | null): string => {
  if (!uaString) return 'Unknown Device'
  try {
    const parser = new UAParser(uaString)
    const result = parser.getResult()
    const browser = result.browser.name ? `${result.browser.name} ${result.browser.version || ''}`.trim() : ''
    const os = result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : ''
    const device = result.device.model ? `${result.device.vendor || ''} ${result.device.model}`.trim() : ''
    if (os && browser) return `${browser} ${device ? `on ${device}` : ''} on ${os}`
    if (browser) return browser
    if (os) return os
    return 'Unknown Device'
  } catch (e) {
    console.error('Error parsing User Agent:', e)
    return uaString
  }
}

interface SessionData {
  id: string
  deviceInfo: string
  ipAddress: string | null
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
  isCurrentSession: boolean
}

export default function SessionManagementPage() {
  const { t } = useTranslation()
  const { user } = useAuthenticatedUser()
  const [error, setError] = useState<string | null>(null)

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<SessionData>>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  })

  const [sessionsData, refetchSessions] = useMyRefreshTokensQuery({
    variables: { where: { hasOwnerWith: [{ id: user?.id }] } },
    requestPolicy: 'cache-and-network',
  })

  const [deleteMutationState, deleteRefreshToken] = useDeleteRefreshTokenMutation()

  const isPotentiallyCurrent = (createdAt: string): boolean => {
    return dayjs().diff(dayjs(createdAt), 'minute') < 5
  }
  const sortedSessions = useMemo((): SessionData[] => {
    const rawSessions =
      sessionsData.data?.refreshTokens?.edges
        ?.map((edge) => edge?.node)
        .filter((t): t is RefreshTokenFragment => !!t) || []

    const mapped = rawSessions.map((session) => ({
      id: session.id,
      deviceInfo: parseUserAgent(session.userAgent),
      ipAddress: session.ipAddress || null,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      expiresAt: new Date(session.expiresAt),
      isCurrentSession: isPotentiallyCurrent(session.createdAt),
    }))

    if (sortStatus) {
      const { columnAccessor, direction } = sortStatus
      return [...mapped].sort((a, b) => {
        const aValue = a[columnAccessor as keyof SessionData]
        const bValue = b[columnAccessor as keyof SessionData]

        if (aValue instanceof Date && bValue instanceof Date) {
          return direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime()
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
        }

        return 0
      })
    }

    return mapped
  }, [sessionsData.data, sortStatus])

  const handleRevoke = (sessionId: string, isCurrentSession: boolean) => {
    openConfirmModal({
      title: t('sessionManagement.revokeConfirmTitle'),
      centered: true,
      children: (
        <Text size="sm">
          {isCurrentSession
            ? t('sessionManagement.revokeConfirmMessageCurrent')
            : t('sessionManagement.revokeConfirmMessage')}
        </Text>
      ),
      labels: { confirm: t('sessionManagement.revokeButton'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setError(null)
        const result = await deleteRefreshToken({ id: sessionId })
        if (result.error) {
          const gqlErrors = extractGqlErrors(result.error.graphQLErrors)
          const message = gqlErrors.length > 0 ? gqlErrors.join(', ') : result.error.message
          setError(message)
          notifications.show({
            title: t('sessionManagement.revokeErrorTitle'),
            message,
            color: 'red',
            icon: <IconTrash size="1.1rem" />,
          })
        } else {
          notifications.show({
            title: t('sessionManagement.revokeSuccessTitle'),
            message: t('sessionManagement.revokeSuccessMessage'),
            color: 'green',
            icon: <IconTrash size="1.1rem" />,
          })
          refetchSessions({ requestPolicy: 'network-only' })
        }
      },
    })
  }

  const columns: DataTableColumn<SessionData>[] = [
    {
      accessor: 'deviceInfo',
      title: t('sessionManagement.headerDevice'),
      sortable: false,
      render: (session: SessionData) => (
        <div>
          <Text size="sm">{session.deviceInfo}</Text>
          {session.ipAddress && (
            <Text size="xs" c="dimmed">
              IP: {session.ipAddress}
            </Text>
          )}
        </div>
      ),
    },
    {
      accessor: 'createdAt',
      title: t('sessionManagement.headerCreated'),
      sortable: true,
      render: (session: SessionData) => (
        <Tooltip label={dayjs(session.createdAt).format('YYYY-MM-DD HH:mm:ss')} withArrow>
          <Text size="sm">{dayjs(session.createdAt).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      accessor: 'updatedAt',
      title: t('sessionManagement.headerLastActive'),
      sortable: true,
      render: (session: SessionData) => (
        <Tooltip label={dayjs(session.updatedAt).format('YYYY-MM-DD HH:mm:ss')} withArrow>
          <Text size="sm">{dayjs(session.updatedAt).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      accessor: 'expiresAt',
      title: t('sessionManagement.headerExpires'),
      sortable: false,
      render: (session: SessionData) => (
        <Tooltip label={dayjs(session.expiresAt).format('YYYY-MM-DD HH:mm:ss')} withArrow>
          <Text size="sm">
            {t('sessionManagement.expires')} {dayjs(session.expiresAt).fromNow()}
          </Text>
        </Tooltip>
      ),
    },
    {
      accessor: 'actions',
      title: t('sessionManagement.headerActions'),
      textAlign: 'right',
      render: (session: SessionData) => (
        <Tooltip label={t('sessionManagement.revokeButton')} withArrow>
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={() => handleRevoke(session.id, session.isCurrentSession)}
            loading={deleteMutationState.fetching}
            disabled={deleteMutationState.fetching}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      ),
    },
  ]

  return (
    <PageTemplate>
      <Container>
        <Title order={2} mb="lg">
          {t('sessionManagement.title')}
        </Title>
        <Text mb="md" c="dimmed">
          {t('sessionManagement.description')}
        </Text>

        {error && (
          <Alert
            icon={<IconInfoCircle size="1rem" />}
            title={t('common.error')}
            color="red"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
        <Space h="md" />

        <Box className={styles.tableContainer} pos="relative">
          <LoadingOverlay visible={sessionsData.fetching && !sessionsData.data} overlayProps={{ blur: 2 }} />

          <DataTable
            withTableBorder
            highlightOnHover
            striped
            records={sortedSessions}
            columns={columns}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            noRecordsText={sessionsData.fetching ? t('common.loading') : t('sessionManagement.noSessions')}
            minHeight={200}
          />
        </Box>
      </Container>
    </PageTemplate>
  )
}
