import React, { useMemo, useState } from 'react'
import {
  AddIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  EditIcon,
  RemoveIcon,
} from '../../../../Icons'
import IconButton from '../../../../IconButton'
import { css } from 'glamor'
import { insertAfter, moveElement, removeElement } from '../helpers/structure'
import { useSlate } from 'slate-react'
import { useFormContext } from './Forms'
import {
  BlockUiAttrsI,
  CustomElement,
  TemplateType,
} from '../../../custom-types'
import { config as elConfig } from '../../../config/elements'
import { useColorContext } from '../../../../Colors/ColorContext'

const styles = {
  container: css({
    userSelect: 'none',
    position: 'absolute',
    background: 'white',
    padding: 5,
    zIndex: 10,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
  }),
  padded: css({
    marginBottom: 8,
  }),
}

const iconStyle = { marginRight: 0 }

const MoveUp: React.FC<{
  path: number[]
}> = ({ path }) => {
  const editor = useSlate()
  const isDisabled = useMemo(
    () => !moveElement(editor, path, 'up', true),
    [path],
  )
  return (
    <IconButton
      Icon={ArrowUpIcon}
      onClick={() => moveElement(editor, path, 'up')}
      disabled={isDisabled}
      title='move element up'
      style={iconStyle}
    />
  )
}

const MoveDown: React.FC<{
  path: number[]
}> = ({ path }) => {
  const editor = useSlate()
  const isDisabled = useMemo(
    () => !moveElement(editor, path, 'down', true),
    [path],
  )
  return (
    <IconButton
      Icon={ArrowDownIcon}
      onClick={() => moveElement(editor, path, 'down')}
      disabled={isDisabled}
      title='move element down'
      style={iconStyle}
    />
  )
}

const Remove: React.FC<{
  path: number[]
}> = ({ path }) => {
  const editor = useSlate()
  const isDisabled = useMemo(() => !removeElement(editor, path, true), [path])
  return (
    <IconButton
      Icon={RemoveIcon}
      onClick={() => removeElement(editor, path)}
      disabled={isDisabled}
      title='remove element'
      style={iconStyle}
    />
  )
}

const Insert: React.FC<{
  path: number[]
  templates: TemplateType | TemplateType[]
}> = ({ path, templates }) => {
  const editor = useSlate()
  const setFormPath = useFormContext()[1]
  const template = Array.isArray(templates) ? templates[0] : templates

  return (
    <IconButton
      Icon={AddIcon}
      onClick={() => {
        const insertPath = insertAfter(editor, template, path)
        setFormPath(insertPath)
      }}
      title='insert new element'
      style={iconStyle}
    />
  )
}

const Edit: React.FC<{
  path: number[]
}> = ({ path }) => {
  const setFormPath = useFormContext()[1]
  return (
    <IconButton
      Icon={EditIcon}
      onClick={() => setFormPath(path)}
      title='edit element'
      style={{ ...iconStyle, padding: 3 }}
      size={18}
    />
  )
}

const BlockUi: React.FC<{
  path: number[]
  element: CustomElement
  blockUi: BlockUiAttrsI
}> = ({ path, element, blockUi }) => {
  const [colorScheme] = useColorContext()
  const template = element.template
  // this UI is here to manage repeatable, interchangeable elements
  if (!template?.repeat) return null
  return (
    <div
      className='ui-element'
      {...styles.container}
      style={blockUi.position}
      contentEditable={false}
      {...colorScheme.set('borderColor', 'divider')}
    >
      {!!elConfig[element.type].Form && (
        <div {...styles.padded}>
          <Edit path={path} />
        </div>
      )}
      <div {...styles.padded}>
        <MoveUp path={path} />
        <MoveDown path={path} />
      </div>
      <Remove path={path} />
      <Insert path={path} templates={template.type} />
    </div>
  )
}

export default BlockUi
