import React from 'react'
import Center from './Center'
import { fontFamilies } from '../../../../theme/fonts'
import colors from '../../../../theme/colors'

export const TitleBlock = ({ children, center }) => {
  return (
    <Center>
      <section
        className='title-block'
        style={{
          textAlign: center ? 'center' : null
        }}
      >
        {children}
      </section>
    </Center>
  )
}

export const Headline = ({ children, attributes, ...props }) => (
  <h1
    style={{
      fontFamily: fontFamilies.serifTitle,
      fontWeight: 900,
      fontSize: '30px',
      lineHeight: '34px'
    }}
    {...attributes}
    {...props}
  >
    {children}
  </h1>
)

export const Subject = ({ children, attributes, ...props }) => (
  <h2
    style={{
      color: '#8c8c8c',
      display: 'inline',
      fontFamily: fontFamilies.sansSerifRegular,
      fontWeight: 'normal',
      fontSize: '19px',
      lineHeight: '24px',
      paddingRight: '4px'
    }}
    {...attributes}
    {...props}
  >
    {children}
  </h2>
)

export const Lead = ({ children, attributes, ...props }) => (
  <p
    style={{
      color: colors.text,
      fontFamily: fontFamilies.serifRegular,
      fontSize: '19px',
      lineHeight: '30px',
      display: 'inline'
    }}
    {...attributes}
    {...props}
  >
    {children}
  </p>
)

export const Credits = ({ children, attributes, ...props }) => (
  <p
    style={{
      color: colors.text,
      fontFamily: fontFamilies.sansSerifRegular,
      fontSize: '14px',
      lineHeight: '17px'
    }}
    {...attributes}
    {...props}
  >
    {children}
  </p>
)
