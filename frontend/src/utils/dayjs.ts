import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import i18n from 'src/i18n'

// dynamic import of dayjs/esm/locale/{language}.js
// doesn't work
import 'dayjs/locale/es'
import 'dayjs/locale/en'

const rfc3339NanoPlugin = (option, dayjsClass, dayjsFactory) => {
  dayjsClass.prototype.toRFC3339NANO = function () {
    return this.format('YYYY-MM-DDTHH:mm:ss.SSSSSSSSS[Z]')
  }

  const oldFormat = dayjsClass.prototype.format
  dayjsClass.prototype.format = function (formatString) {
    if (formatString === 'RFC3339NANO') {
      return this.toRFC3339NANO()
    } else {
      return oldFormat.call(this, formatString)
    }
  }
}

dayjs.extend(rfc3339NanoPlugin)
dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

export const updateDayjsLocale = (language) => {
  const languageBase = language.split('-')[0].toLowerCase()

  try {
    dayjs.locale(languageBase)
    console.log(`Set dayjs locale to: ${languageBase}`)
  } catch (error) {
    console.warn(`Error setting dayjs locale: ${error}`)
    dayjs.locale('en')
  }
}

updateDayjsLocale(i18n.language)

i18n.on('languageChanged', (lng) => {
  updateDayjsLocale(lng)
})

declare module 'dayjs' {
  interface Dayjs {
    /** app backend timestamps will default to RFC 3339 with nanoseconds */
    toRFC3339NANO(): string
  }
}

export default dayjs
