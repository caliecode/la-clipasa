import { createAvatarImageDataUrl } from 'src/utils/files'
import { ToastId } from 'src/utils/toasts'
import { useUISlice } from 'src/slices/ui'
import { notifications } from '@mantine/notifications'
import { IconForbid } from '@tabler/icons'
import { useTranslation } from 'react-i18next'

export const useNotificationAPI = () => {
  const { t } = useTranslation()
  const createTestNotification = (email: string) => {
    new Notification(t('notifications.testNotificationTitle'), {
      body: t('notifications.testNotificationBody'),
      // image: './notification_icon.png',
      icon: createAvatarImageDataUrl(email),
      data: {
        // Developer-only data, no translation needed
        test: 'test',
      },
    })
  }

  const showTestNotification = (email: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      createTestNotification(email)
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          createTestNotification(email)
        }
      })
    } else {
      addNotificationAccessDeniedToast()
    }
  }

  const verifyNotificationPermission = () => {
    console.log('Verifying notification API access')
    if ('Notification' in window && Notification.permission === 'granted') {
      return
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission !== 'granted') {
          addNotificationAccessDeniedToast()
        }
      })
    } else {
      addNotificationAccessDeniedToast()
    }
  }

  function addNotificationAccessDeniedToast() {
    notifications.show({
      id: ToastId.NoticationAPIAccessDenied,
      title: t('notifications.accessDeniedTitle'),
      color: 'danger',
      icon: <IconForbid size="1.2rem" />,
      autoClose: 15000,
      message: t('notifications.accessDeniedMessage'),
    })
  }
  return {
    showTestNotification,
    verifyNotificationPermission,
  }
}
