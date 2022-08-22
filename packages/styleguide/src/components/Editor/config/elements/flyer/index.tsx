import React from 'react'
import {
  ElementConfigI,
  ElementFormProps,
  FlyerTileElement,
} from '../../../custom-types'
import { FlyerTileIcon } from '../../../../Icons'

// TODO
const Form: React.FC<ElementFormProps<FlyerTileElement>> = ({
  element,
  onChange,
}) => <div>FLYER TILE FORM</div>

export const config: ElementConfigI = {
  structure: [
    { type: 'flyerMetaP', main: true },
    { type: 'flyerTopic' },
    { type: 'flyerTitle' },
    { type: 'flyerAuthor' },
    { type: ['paragraph', 'ul', 'ol'], repeat: true },
    {
      type: ['flyerPunchline', 'pullQuote', 'articlePreview', 'figure', 'quiz'],
    },
  ],
  // Form,
  attrs: {
    blockUi: {
      position: {
        top: 0,
        left: 0,
      },
    },
  },
  button: { icon: FlyerTileIcon },
}
