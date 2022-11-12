import { MediaProgress } from '../types/MediaProgress'
import { gql } from '@apollo/client'
import {
  makeLazyQueryHook,
  makeQueryHook,
} from '../../../lib/helpers/AbstractApolloGQLHooks.helper'

const MEDIA_PROGRESS_QUERY = gql`
  query mediaProgress($mediaId: ID!) {
    mediaProgress(mediaId: $mediaId) {
      id
      mediaId
      secs
    }
  }
`

export type MediaProgressVariables = {
  mediaId: string
}

export type MediaProgressData = {
  mediaProgress: Pick<MediaProgress, 'id' | 'mediaId' | 'secs'>
}

const useMediaProgressQuery = makeQueryHook<
  MediaProgressData,
  MediaProgressVariables
>(MEDIA_PROGRESS_QUERY)

export default useMediaProgressQuery

export const useMediaProgressLazyQuery = makeLazyQueryHook<
  MediaProgressData,
  MediaProgressVariables
>(MEDIA_PROGRESS_QUERY)
