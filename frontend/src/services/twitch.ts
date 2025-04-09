import { EMOTES } from 'src/assets/img/emotes'
import { sanitizeContentEditableInput } from 'src/utils/strings'

// Inline styles are generally harder to manage with themes/dark mode. Consider CSS classes.
export const imgAttributes = 'style="pointer-events: none;"'

export const anyKnownEmoteRe = `${Object.keys(EMOTES).join('|')}`
/**
 * Returns an html string with known emotes replaced.
 * @example
  function Title() {
    return <h1 dangerouslySetInnerHTML={{ __html: emotesTextToHtml(title) }} />;
  }
 */
export function emotesTextToHtml(text: string, size: number) {
  if (!text) return

  let newHtml = text
  const emotes = new Set(newHtml.match(new RegExp(anyKnownEmoteRe, 'gi')))

  emotes?.forEach((emote) => {
    emote = `calie${emote.toLowerCase().split('calie').pop()?.toUpperCase()}`
    newHtml = newHtml.replace(
      new RegExp(`${emote}`, 'gi'),
      `<img ${imgAttributes} title="${emote}" className="${emote}" src="${EMOTES[emote]}" width="${size}" height="${size}">`,
    )
  })

  return newHtml // This replaces case-insensitively but uses the canonical case from EMOTES for the title/className.
}

export function htmlToEmotesText(html: string) {
  if (!html) return

  let plainText = html.replace(/<img[^>]+className\s*=\s*"([^"]*)"[^>]*>/gi, (match, className) => {
    return className
  })

  plainText = sanitizeContentEditableInput(plainText)

  return plainText
}
