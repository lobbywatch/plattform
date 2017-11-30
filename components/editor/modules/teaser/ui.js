import { colors } from '@project-r/styleguide'
import React from 'react'
import ArrowsIcon from 'react-icons/lib/fa/arrows'
import { css } from 'glamor'
import {
  createActionButton,
  buttonStyles
} from '../../utils'

import {
  createInsertDragSource,
  createDropTarget,
  createMoveDragSource
} from './dnd'

const styles = {
  line: css({
    position: 'absolute',
    margin: 0,
    padding: 0,
    top: 0,
    left: 0,
    right: 0,
    borderTop: `1px dashed ${colors.primary}`
  }),
  dragButton: css(
    buttonStyles.mark,
    {
      position: 'absolute',
      top: 0,
      left: 0
    }
  )
}

export const TeaserButton = createActionButton({
  reducer: ({ value, onChange }) => event => {
  }
})(
  ({ disabled, visible, getNewItem, ...props }) => {
    const Component = createInsertDragSource(
      ({ connectDragSource }) =>
      connectDragSource(
        <span
          {...buttonStyles.insert}
          {...props}
          data-disabled={disabled}
          data-visible={visible}
          >
          Teaser
        </span>
      )
    )
    return (
      <Component getNewItem={getNewItem} />
    )
  }
)

export const TeaserInlineUI = createDropTarget(createMoveDragSource(
  ({ connectDragSource, connectDropTarget, isDragging, isOver, children }) => {
    const dragSource = connectDragSource(
      <span contentEditable={false} {...styles.dragButton}><ArrowsIcon /></span>)
    const dropTarget = connectDropTarget(
      <span> {
        children
      } </span>
    )

    return (
      <span style={{ position: 'relative', display: 'block' }}>
        {dragSource}
        {dropTarget}
      </span>
    )
  }
))
