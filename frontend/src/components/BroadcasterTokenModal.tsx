import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal, Text, Stack, useMantineTheme } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { faTwitch } from '@fortawesome/free-brands-svg-icons'
import { useTranslation } from 'react-i18next'
import { redirectToBroadcasterAuthLogin } from 'src/services/authorization'

type BroadcasterTokenModalProps = { isOpen: boolean; onClose: () => void; onConfirm: () => void }

export default function BroadcasterTokenModal({ isOpen, onClose, onConfirm }: BroadcasterTokenModalProps) {
  const { t } = useTranslation()
  const { colors } = useMantineTheme()

  const handleConfirm = () => {
    onClose()
    onConfirm()
  }

  return (
    <>
      <Modal opened={isOpen} onClose={close} title="Generate Authentication Token" centered>
        <Stack gap="md">
          <Text>
            You will be redirected to authenticate and generate secure tokens. These tokens grant access to sensitive
            features and should be kept private.
          </Text>

          <Text fw={500}>Do you want to proceed?</Text>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              style={{
                backgroundColor: '#a970ff',
              }}
            >
              Proceed
            </Button>
          </div>
        </Stack>
      </Modal>
    </>
  )
}
