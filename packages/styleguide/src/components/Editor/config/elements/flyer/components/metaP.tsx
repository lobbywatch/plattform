import { ElementConfigI } from '../../../../custom-types'

export const config: ElementConfigI = {
  structure: [{ type: ['text', 'link', 'break'], repeat: true }],
  attrs: {
    blockUi: {
      style: {
        top: 7,
      },
    },
  },
}
