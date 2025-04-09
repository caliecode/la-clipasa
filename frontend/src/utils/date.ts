import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

export function useRelativeTimestamp() {
  const { t } = useTranslation()

  return {
    showRelativeTimestamp: (timestamp: string) => {
      const now = dayjs()
      const date = dayjs(timestamp)
      const diff = now.diff(date, 'minute')

      if (diff < 1) {
        return t('time.justNow')
      } else if (diff < 60) {
        return t('time.minutesAgo', { count: diff })
      } else if (diff < 1440) {
        const hours = Math.floor(diff / 60)
        return t('time.hoursAgo', { count: hours })
      } else {
        const days = Math.floor(diff / 1440)
        return t('time.daysAgo', { count: days })
      }
    },
  }
}
