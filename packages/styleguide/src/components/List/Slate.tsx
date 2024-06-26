import React from 'react'
import { List as InnerList } from './List'

export const List: React.FC<{
  ordered: boolean
  [x: string]: unknown
}> = ({ children, ordered, attributes = {}, ...props }) => {
  return (
    <InnerList attributes={attributes} {...props} data={{ ordered }}>
      {children}
    </InnerList>
  )
}
