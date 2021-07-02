import React from 'react'

import {
  Overlay,
  OverlayBody,
  OverlayToolbar,
  OverlayToolbarClose,
  Interaction
} from '@project-r/styleguide'

import { CloseIcon } from '@project-r/styleguide/icons'
import Beta from './Beta'

const CardOverlay = ({
  onClose,
  title,
  children,
  beta = false,
  maxWidth = 720
}) => {
  return (
    <Overlay onClose={onClose} mUpStyle={{ maxWidth, minHeight: 0 }}>
      <OverlayToolbar>
        <Interaction.Emphasis style={{ padding: '15px 20px', fontSize: 16 }}>
          {title}
        </Interaction.Emphasis>
        {beta && (
          <Beta
            style={{
              position: 'absolute',
              right: 60,
              top: 9
            }}
          />
        )}
        <OverlayToolbarClose onClick={onClose} />
      </OverlayToolbar>
      <OverlayBody style={{ textAlign: 'left' }}>{children}</OverlayBody>
    </Overlay>
  )
}

export default CardOverlay
