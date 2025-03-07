import { MantineColorScheme, MantineGradient } from '@mantine/core'
import { EMOTES } from 'src/assets/img/emotes'
import postDiamante from 'src/assets/img/post-diamante.png'
import postOro from 'src/assets/img/post-oro.png'
import postRana from 'src/assets/img/post-rana.png'
import emojiOro from 'src/assets/img/emoji-oro.png'
import emojiDiamante from 'src/assets/img/emoji-diamante.png'
import spiderWeb from 'src/assets/img/icon-spider-web.svg'
import ear from 'src/assets/img/icon-ear.svg'

import { PostCategoryCategory } from 'src/graphql/gen'

export const PostCategoryNames: Record<PostCategoryCategory, string> = {
  RANA: 'RANITA TRISTE',
  SIN_SONIDO: 'SIN SONIDO',
  MEME_ARTESANAL: 'MEME ARTESANAL',
  NO_SE_YO: 'NO SÉ YO',
  ORO: 'ORO',
  DIAMANTE: 'DIAMANTE',
  MEH: 'MEH',
  ALERTA_GLONETILLO: 'ALERTA GLONETILLO',
  GRR: 'GRR',
  ENSORDECEDOR: 'ENSORDECEDOR',
  RAGUUUL: 'RAGUUUL',
}

// must be subset of PostCategoryCategory
export type UniqueCategories = Record<Extract<PostCategoryCategory, 'DIAMANTE' | 'RANA' | 'ORO'>, string>

/**
 * Restricted to 1 per post.
 */
export const uniqueCategories: UniqueCategories = {
  DIAMANTE: '',
  ORO: '',
  RANA: '',
}

export type CardBackground = {
  image: string
  color: (theme: MantineColorScheme) => string
}

export const uniqueCategoryBackground: Record<keyof UniqueCategories, CardBackground> = {
  DIAMANTE: {
    image: postDiamante,
    color: (theme: MantineColorScheme) => (theme === 'light' ? '#b5d6e2' : '#36525a'),
  },
  RANA: {
    image: postRana,
    color: (theme: MantineColorScheme) => (theme === 'light' ? '#b4dbbd' : '#334838'),
  },
  ORO: {
    image: postOro,
    color: (theme: MantineColorScheme) => (theme === 'light' ? '#d9d3a1' : '#2f2b22'),
  },
}

export const categoryDoubleEmojis: Partial<Record<PostCategoryCategory, string>> = {
  DIAMANTE: emojiDiamante,
  RANA: EMOTES.calieRANA,
  ORO: emojiOro,
  MEH: EMOTES.calieSAD,
  NO_SE_YO: EMOTES.calieWOKI,
  MEME_ARTESANAL: EMOTES.calieBONGOS,
  SIN_SONIDO: EMOTES.calieDORMIDO,
  GRR: EMOTES.calieTRAVIESO,
  RAGUUUL: spiderWeb,
}

export const categoryEmojis: Partial<Record<PostCategoryCategory, string>> = {
  DIAMANTE: emojiDiamante,
  RANA: EMOTES.calieRANA,
  ORO: emojiOro,
  MEH: EMOTES.calieSAD,
  NO_SE_YO: EMOTES.calieWOKI,
  MEME_ARTESANAL: EMOTES.calieBONGOS,
  SIN_SONIDO: EMOTES.calieDORMIDO,
  GRR: EMOTES.calieTRAVIESO,
  ALERTA_GLONETILLO: EMOTES.calieSUSTO1,
  RAGUUUL: spiderWeb,
  ENSORDECEDOR: ear,
}

/**
 * Emotes requiring color inversion
 */
export const emojiInversion: Partial<Record<PostCategoryCategory, true>> = {
  RAGUUUL: true,
  ENSORDECEDOR: true,
}

export const EMOJI_SIZE = 16

/**
 * Emotes to be rendered before the category name
 */
export const categoryPreEmojis: Partial<Record<PostCategoryCategory, string>> = {
  ALERTA_GLONETILLO: EMOTES.calieSUSTO1,
  // NO_SE_YO: <IconAlertOctagon size={EMOJI_SIZE} />,
}

/**
 * Emotes to be rendered after the category name
 */
export const categoryPostEmojis: Partial<Record<PostCategoryCategory, string>> = {
  ALERTA_GLONETILLO: EMOTES.calieSUSTO2,
  ENSORDECEDOR: ear,
}

export const categoryColorGradient: Record<PostCategoryCategory, MantineGradient> = {
  MEME_ARTESANAL: { from: 'teal', to: 'lime' },
  DIAMANTE: { from: '#1c95b1', to: '#16758b' },
  RANA: { from: '#c38d64', to: 'lime', deg: 45 },
  ORO: { from: 'yellow', to: '#b9bd32' },
  SIN_SONIDO: { from: '#727272', to: '#878585' },
  NO_SE_YO: { from: 'red', to: 'red' },
  MEH: { from: '#c4a051', to: '#c5781a' },
  ALERTA_GLONETILLO: { from: '#a051c4', to: '#9a6fae' },
  GRR: { from: '#51c4ab', to: '#94ccc0' },
  ENSORDECEDOR: { from: '#963429', to: '#dc4439' },
  RAGUUUL: { from: '#92946d', to: '#5d5d1f' },
}
