import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Editor as SlateEditor } from 'slate'
import { css } from 'glamor'

import MarkdownSerializer from '../../lib/serializer'
import { getSerializationRules } from './utils/getRules'
import addValidation, { findOrCreate } from './utils/serializationValidation'
import styles from './styles'
import Sidebar from './Sidebar'
import MetaData from './modules/meta/ui'

import marks, {
  BoldButton,
  UnderlineButton,
  StrikethroughButton
} from './modules/marks'

import headlines, {
  TitleButton
} from './modules/headlines'

import lead, {
  LeadButton
} from './modules/lead'

import paragraph, {
  ParagraphButton
} from './modules/paragraph'

import link, {
  LinkButton,
  LinkForm
} from './modules/link'

import image, {
  ImageForm,
  ImageButton
} from './modules/image'

import cover, {
  CoverForm, serializer as coverSerializer, COVER
} from './modules/cover'

const newsletterStyles = {
  fontFamily: 'serif',
  fontSize: 18,
  color: '#444',
  WebkitFontSmoothing: 'antialiased',
  maxWidth: 'calc(100vw - 190px)'

}

const documentRule = {
  match: object => object.kind === 'document',
  matchMdast: node => node.type === 'root',
  fromMdast: (node, index, parent, visitChildren) => {
    const cover = findOrCreate(node.children, {
      type: 'zone', identifier: COVER
    }, {
      children: []
    })

    return {
      document: {
        data: node.meta,
        kind: 'document',
        nodes: [
          coverSerializer.fromMdast(cover)
        ].concat(
          visitChildren({
            children: node.children
              .filter(n => n !== cover)
          })
        )
      },
      kind: 'state'
    }
  },
  toMdast: (object, index, parent, visitChildren, context) => {
    const firstNode = object.nodes[0]
    if (!firstNode || firstNode.type !== COVER || firstNode.kind === 'block') {
      context.dirty = true
    }
    const cover = findOrCreate(object.nodes, { kind: 'block', type: COVER })
    return {
      type: 'root',
      meta: object.data,
      children: [
        coverSerializer.toMdast(cover, context)
      ].concat(
        visitChildren({
          nodes: object.nodes
            .filter(n => n !== cover)
        })
      )
    }
  }
}

export const serializer = new MarkdownSerializer({
  rules: [
    documentRule
  ].concat(getSerializationRules([
    ...cover.plugins,
    ...headlines.plugins,
    ...image.plugins,
    ...paragraph.plugins
  ]))
})

addValidation(documentRule, serializer)

const documentPlugin = {
  schema: {
    rules: [
      documentRule,
      {
        match: node => node.kind === 'document',
        validate: node => {
          const data = node.data
          const autoMeta = !data || !data.size || data.get('auto')
          if (!autoMeta) {
            return null
          }
          const cover = node.nodes
            .find(n => n.type === COVER && n.kind === 'block')
          if (!cover) {
            return null
          }

          const newData = data
            .set('auto', true)
            .set('title', cover.nodes.first().text)
            .set('description', cover.nodes.get(1).text)
            .set('image', cover.data.get('src'))

          return data.equals(newData)
            ? null
            : newData
        },
        normalize: (transform, object, newData) => {
          return transform.setNodeByKey(object.key, {
            data: newData
          })
        }
      }
    ]
  }
}

const plugins = [
  documentPlugin,
  ...marks.plugins,
  ...headlines.plugins,
  ...lead.plugins,
  ...paragraph.plugins,
  ...link.plugins,
  ...image.plugins,
  ...cover.plugins
]

const textFormatButtons = [
  BoldButton,
  UnderlineButton,
  StrikethroughButton,
  LinkButton
]

const blockFormatButtons = [
  TitleButton,
  LeadButton,
  ParagraphButton
]

const insertButtons = [
  ImageButton
]

const propertyForms = [
  LinkForm,
  ImageForm,
  CoverForm
]

const Container = ({ children }) => (
  <div {...css(styles.container)}>{ children }</div>
)

const Document = ({ children }) => (
  <div {...css(styles.document)}>{ children }</div>
)

class Editor extends Component {
  constructor (props) {
    super(props)
    this.onChange = (nextState) => {
      const { state, onChange, onDocumentChange } = this.props

      if (state !== nextState) {
        onChange(nextState)
        if (!nextState.document.equals(state.document)) {
          onDocumentChange(nextState.document, nextState)
        }
      }
    }
  }
  render () {
    const { state } = this.props

    return (
      <Container>
        <Sidebar
          textFormatButtons={textFormatButtons}
          blockFormatButtons={blockFormatButtons}
          insertButtons={insertButtons}
          propertyForms={propertyForms}
          state={state}
          onChange={this.onChange} />
        <Document>
          <div {...css(newsletterStyles)}>
            <SlateEditor
              state={state}
              onChange={this.onChange}
              plugins={plugins} />
            <MetaData
              state={state}
              onChange={this.onChange} />
          </div>
        </Document>
      </Container>
    )
  }
}

Editor.propTypes = {
  state: PropTypes.object.isRequired,
  onChange: PropTypes.func,
  onDocumentChange: PropTypes.func
}

Editor.defaultProps = {
  onChange: () => true,
  onDocumentChange: () => true
}

export default Editor
