import React from 'react'
import { CustomText, MarksConfig, SchemaConfig } from '../custom-types'

const Recurse: React.FC<{
  components?: React.FC[]
}> = ({ children, components = [] }) => {
  if (!components.length) {
    return <>{children}</>
  }
  const [Component, ...rest] = components
  return (
    <Recurse components={rest}>
      <Component>{children}</Component>
    </Recurse>
  )
}

export const Marks: React.FC<{
  leaf: CustomText
  schema: SchemaConfig
  editorSchema?: SchemaConfig
}> = ({ children, leaf, schema, editorSchema = {} }) => {
  const { text, end, placeholder, template, ...marks } = leaf
  const mKeys = Object.keys(marks) as (keyof MarksConfig)[]
  const mComponents = mKeys
    .map((mKey) => editorSchema[mKey] || schema[mKey])
    .filter(Boolean)
  return <Recurse components={mComponents}>{children}</Recurse>
}
