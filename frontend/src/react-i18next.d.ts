import 'react-i18next'
import enTranslation from '../public/locales/en/translation.json' // Adjust path as necessary

// react-i18next versions higher than 11.11.0
declare module 'react-i18next' {
  // and extend them!
  interface CustomTypeOptions {
    // custom resources type
    resources: {
      translation: typeof enTranslation
    }
  }
}
