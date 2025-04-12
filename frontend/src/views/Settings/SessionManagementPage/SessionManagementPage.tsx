import React, { useState, useMemo } from 'react'
import {
  Container,
  Title,
  Table,
  Button,
  Group,
  Text,
  LoadingOverlay,
  ActionIcon,
  Tooltip,
  useMantineTheme,
  Alert,
  Space,
} from '@mantine/core'
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

export default function SessionManagementPage() {
  const { t } = useTranslation()
  const theme = useMantineTheme()
  const { user } = useAuthenticatedUser()
  const [sessionsData, refetchSessions] = useMyRefreshTokensQuery({
    variables: { where: { hasOwnerWith: [{ id: user?.id }] } },
    requestPolicy: 'cache-and-network',
  })
  const [deleteMutationState, deleteRefreshToken] = useDeleteRefreshTokenMutation()
  const [error, setError] = useState<string | null>(null)

  const sessions = useMemo(() => {
    return sessionsData.data?.refreshTokens?.edges?.map((edge) => edge?.node).filter((t) => !!t) ?? []
  }, [sessionsData.data])

  const handleRevoke = (tokenId: string, isCurrentEstimate: boolean) => {
    openConfirmModal({
      title: t('sessionManagement.revokeConfirmTitle'),
      centered: true,
      children: (
        <Text size="sm">
          {isCurrentEstimate
            ? t('sessionManagement.revokeConfirmMessageCurrent')
            : t('sessionManagement.revokeConfirmMessage')}
        </Text>
      ),
      labels: { confirm: t('sessionManagement.revokeButton'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setError(null)
        const result = await deleteRefreshToken({ id: tokenId })
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

  const isPotentiallyCurrent = (session: RefreshTokenFragment): boolean => {
    const createdAt = dayjs(session.createdAt)
    return dayjs().diff(createdAt, 'minute') < 5
  }

  const rows = sessions.map((session) => {
    const uaInfo = parseUserAgent(session.userAgent)
    const isCurrentSessionEstimate = isPotentiallyCurrent(session)
    return (
      <Table.Tr key={session.id}>
        <Table.Td>
          <Text fz="sm">{uaInfo}</Text>
          {session.ipAddress && (
            <Text fz="xs" c="dimmed">
              IP: {session.ipAddress}
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Tooltip label={dayjs(session.createdAt).format('YYYY-MM-DD HH:mm:ss')} withArrow position="top">
            <Text fz="sm">{dayjs(session.createdAt).fromNow()}</Text>
          </Tooltip>
        </Table.Td>
        <Table.Td>
          <Tooltip label={dayjs(session.expiresAt).format('YYYY-MM-DD HH:mm:ss')} withArrow position="top">
            <Text fz="sm">
              {t('sessionManagement.expires')} {dayjs(session.expiresAt).fromNow()}
            </Text>
          </Tooltip>
        </Table.Td>
        <Table.Td>
          <Tooltip label={t('sessionManagement.revokeButton')} withArrow>
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => handleRevoke(session.id, isCurrentSessionEstimate)}
              loading={deleteMutationState.fetching}
              disabled={deleteMutationState.fetching}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Table.Td>
      </Table.Tr>
    )
  })

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

        <div className={styles.tableContainer}>
          <LoadingOverlay visible={sessionsData.fetching && !sessionsData.data} overlayProps={{ blur: 2 }} />
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('sessionManagement.headerDevice')}</Table.Th>
                <Table.Th>{t('sessionManagement.headerLastActive')}</Table.Th>
                <Table.Th>{t('sessionManagement.headerExpires')}</Table.Th>
                <Table.Th>{t('sessionManagement.headerActions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text ta="center" c="dimmed" py="lg">
                      {sessionsData.fetching ? t('common.loading') : t('sessionManagement.noSessions')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Container>
    </PageTemplate>
  )
}
