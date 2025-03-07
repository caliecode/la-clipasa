import { getServiceAndId } from 'src/services/linkServices'
import { describe, expect, test } from 'vitest'

describe('infer URL metadata', () => {
  test('youtube URL', () => {
    const url = 'https://www.youtube.com/watch?v=Cyyh9G5E6II&t=35s'
    const result = getServiceAndId(url)
    expect(result).toEqual({ service: 'youtube', id: 'Cyyh9G5E6II' })
  })

  test('instagram URL', () => {
    const url = 'https://www.instagram.com/p/Cyyh9G5E6II/'
    const result = getServiceAndId(url)
    expect(result).toEqual({ service: 'instagram', id: 'Cyyh9G5E6II' })
  })

  test('twitter URL', () => {
    const url = 'https://twitter.com/caliebre/status/1615140989080944641?cxt=HHwWgoC-xYKLkeosAAAA'
    const result = getServiceAndId(url)
    expect(result).toEqual({ service: 'twitter', id: '1615140989080944641' })
  })

  test('reddit URL', () => {
    const url = 'https://www.reddit.com/r/Cyyh9G5E6II/'
    const result = getServiceAndId(url)
    expect(result).toEqual({ service: 'reddit', id: null })
  })

  test('discord video', () => {
    const url =
      'https://cdn.discordapp.com/attachments/1058424616726565007/1058546769199366204/file_example_MP4_480_1_5MG.mp4'
    const result = getServiceAndId(url)
    expect(result).toEqual({ service: 'discord_video', id: null })
  })

  test('invalid URL', () => {
    const url = 'https://www.invalidurl.com'
    const result = getServiceAndId(url)
    expect(result).toEqual({ service: 'unknown', id: null })
  })
})
