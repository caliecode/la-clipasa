import dayjs from 'dayjs'

export function showRelativeTimestamp(timestamp: string) {
  const now = dayjs()
  const date = dayjs(timestamp)
  const diff = now.diff(date, 'minute')
  if (diff < 1) {
    return 'Just now'
  } else if (diff < 60) {
    return `${diff} minute${diff > 1 ? 's' : ''} ago`
  } else if (diff < 1440) {
    const hours = Math.floor(diff / 60)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diff / 1440)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}
