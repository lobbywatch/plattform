import React, { useMemo, useState } from 'react'
import { css } from 'glamor'
import { plainButtonRule } from '../Button'
import schema from '../Editor/schema/flyer'
import { Message } from '../Editor/Render/Message'
import { RenderedElement } from '../Editor/Render'
import { isSlateElement } from '../Editor/Render/helpers'
import { fontFamilies } from '../../theme/fonts'
import { useColorContext } from '../Colors/ColorContext'

const styles = {
  answersContainer: css({
    backgroundColor: '#ffffff',
    padding: 15,
    width: '100%',
    marginBottom: 15,
  }),
  answerOuter: css({
    display: 'block',
    width: '100%',
    '&:not(:last-child)': {
      marginBottom: 15,
    },
  }),
  answerInner: css({
    fontFamily: fontFamilies.sansSerifMedium,
    width: '100%',
    fontSize: 17,
    padding: 15,
    display: 'block',
    borderWidth: 1,
    borderStyle: 'solid',
  }),
}

export const EditorQuizItem: React.FC<{
  isCorrect?: boolean
  attributes: any
  [x: string]: unknown
}> = ({ children, isCorrect, attributes, ...props }) => {
  const [colorScheme] = useColorContext()
  const colorRule = useMemo(
    () =>
      css({
        '& .quiz-answer': {
          color: '#fff',
          backgroundColor: colorScheme.getCSSColor(
            isCorrect ? 'primary' : 'flyerFormatText',
          ),
          border: '15px solid #fff',
          marginBottom: 15,
        },
      }),
    [colorScheme, isCorrect],
  )

  return (
    <div {...props} {...colorRule} style={{ position: 'relative' }}>
      {children}
    </div>
  )
}

export const EditorQuizContainer: React.FC<{
  props: any
  attributes: any
  [x: string]: unknown
}> = ({ props, attributes, children }) => {
  return (
    <div {...props} {...attributes} style={{ position: 'relative' }}>
      <Message
        text='Quiz solution depends on answer choice. Check preview for final
        layout.'
      />
      {children}
    </div>
  )
}

export const QuizAnswer: React.FC<{
  attributes: any
  [x: string]: unknown
}> = ({ children, attributes, ...props }) => (
  <div {...attributes} {...props}>
    <div className='quiz-answer' {...styles.answerInner}>
      {children}
    </div>
  </div>
)

export const Quiz = ({ children, attributes, ...props }) => {
  const [colorScheme] = useColorContext()
  const [answerId, setAnswerId] = useState<number>(null)
  const tree = children?.props?.nodes

  if (!tree) return null

  const answer = tree[answerId]
  const answerInfo = answer?.children?.[1]

  return (
    <div
      {...props}
      {...attributes}
      style={{ position: 'relative' }}
      contentEditable={false}
    >
      <div
        {...styles.answersContainer}
        {...colorScheme.set(
          'backgroundColor',
          answer && answer.isCorrect ? 'alert' : 'default',
        )}
      >
        {tree.map((answer, i) => {
          const isSelected = answerId === i
          const color = isSelected ? '#fff' : 'inherit'

          return (
            <button
              key={i}
              onClick={() => setAnswerId(i)}
              {...plainButtonRule}
              {...colorScheme.set(
                'backgroundColor',
                isSelected && answer.isCorrect
                  ? 'primary'
                  : isSelected
                  ? 'flyerFormatText'
                  : 'default',
              )}
              {...colorScheme.set(
                'borderColor',
                isSelected && answer.isCorrect
                  ? 'primary'
                  : isSelected
                  ? 'flyerFormatText'
                  : 'text',
              )}
              {...styles.answerOuter}
              style={{
                color,
              }}
            >
              <RenderedElement element={answer.children[0]} schema={schema} />
            </button>
          )
        })}
      </div>
      {isSlateElement(answerInfo) && (
        <RenderedElement element={answerInfo} schema={schema} />
      )}
    </div>
  )
}
