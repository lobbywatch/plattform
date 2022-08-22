import { SchemaConfig } from '../custom-types'
import {
  CommentBodyBlockQuote,
  CommentBodyBlockQuoteParagraph,
  CommentBodyHeading,
  CommentBodyParagraph,
  CommentBodyContainer,
  CommentBodyCode,
  CommentBodyBlockCode,
} from '../../CommentBody/web'
import { ListItem } from '../../CommentBody/web/List'
import { List } from '../../List/Slate'
import { Editorial, Sub, Sup, Bold, Italic } from '../../Typography'
import { FigureByline, FigureCaption } from '../../Figure'
import { Break } from '../../Typography/Break'

import { NoRefEditoralA } from '../config/elements/link'

const schema: SchemaConfig = {
  container: CommentBodyContainer,
  blockQuote: CommentBodyBlockQuote,
  blockQuoteText: CommentBodyBlockQuoteParagraph,
  figureByline: FigureByline,
  figureCaption: FigureCaption,
  list: List,
  listItem: ListItem,
  break: Break,
  headline: CommentBodyHeading,
  link: NoRefEditoralA,
  paragraph: CommentBodyParagraph,
  bold: Bold,
  italic: Italic,
  strikethrough: Editorial.StrikeThrough,
  sub: Sub,
  sup: Sup,
  inlineCode: CommentBodyCode,
  blockCode: CommentBodyBlockCode,
}

export default schema
