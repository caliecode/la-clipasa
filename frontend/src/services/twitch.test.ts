import { EMOTES } from 'src/assets/img/emotes'
import { emotesTextToHtml, htmlToEmotesText, imgAttributes } from 'src/services/twitch'
import { describe, expect, test } from 'vitest'

describe('roles and scopes', async () => {
  const size = 20
  test('parse emote text to html', () => {
    let text = 'some: :external-emote:, and CALIEAMOR2'
    let html = emotesTextToHtml(text, size)
    expect(html).toBe(
      `some: :external-emote:, and <img ${imgAttributes} title="calieAMOR2" className="calieAMOR2" src="${EMOTES['calieAMOR2']}" width="${size}" height="${size}">`,
    )

    text = 'some: :external-emote:, and CALIEAMOR2 and CALIEAMOR2'
    html = emotesTextToHtml(text, size)
    expect(html).toBe(
      `some: :external-emote:, and <img ${imgAttributes} title="calieAMOR2" className="calieAMOR2" src="${EMOTES['calieAMOR2']}" width="${size}" height="${size}"> and <img ${imgAttributes} title="calieAMOR2" className="calieAMOR2" src="${EMOTES['calieAMOR2']}" width="${size}" height="${size}">`,
    )
  })

  test('parse html to emote text', () => {
    let html = `some: :external-emote:, and <img ${imgAttributes} title="calieAMOR2" className="calieAMOR2" src="${EMOTES['calieAMOR2']}" width="${size}" height="${size}"> with another <img ${imgAttributes} title="calieAMOR2" className="calieAMOR2" src="${EMOTES['calieAMOR2']}" width="${size}" height="${size}">`
    let text = htmlToEmotesText(html)
    expect(text).toBe('some: :external-emote:, and calieAMOR2 with another calieAMOR2')

    html = `some text before <img ${imgAttributes} title="calieAMOR2" classname="calieAMOR2" src="https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_b2a90f8e209e40d697364649cf5a2d2c/static/light/3.0" width="28" height="28"> and after`
    text = htmlToEmotesText(html)
    expect(text).toBe('some text before calieAMOR2 and after')
  })
})
