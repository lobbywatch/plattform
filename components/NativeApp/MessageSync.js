import React, { useEffect, useContext, useState } from 'react'
import { graphql, compose } from 'react-apollo'
import gql from 'graphql-tag'
import { parse } from 'url'

import withInNativeApp, { postMessage } from '../../lib/withInNativeApp'
import { parseJSONObject } from '../../lib/safeJSON'
import { AudioContext } from '../Audio'
import createPersistedState from '../../lib/hooks/use-persisted-state'
import withMe from '../../lib/apollo/withMe'
import { withProgressApi } from '../Article/Progress/api'

import AppSignInOverlay from './AppSignInOverlay'

const upsertDeviceQuery = gql`
  mutation UpsertDevice($token: ID!, $information: DeviceInformationInput!) {
    upsertDevice(token: $token, information: $information) {
      id
    }
  }
`

const pendingAppSignInQuery = gql`
  query pendingAppSignIn {
    pendingAppSignIn {
      title
      body
      expiresAt
      verificationUrl
    }
  }
`

const useLocalMediaProgressState = createPersistedState(
  'republik-progress-media'
)

const MessageSync = ({
  inNativeApp,
  inNativeAppLegacy,
  upsertDevice,
  me,
  upsertMediaProgress,
  refetchPendingSignInRequests
}) => {
  const [signInOverlayVisible, setSignInOverlayVisible] = useState(false)
  const [signInData, setsignInData] = useState()
  const { setAudioPlayerVisibility } = useContext(AudioContext)
  const [
    localMediaProgress,
    setLocalMediaProgress
  ] = useLocalMediaProgressState()
  const isTrackingAllowed = me && me.progressConsent === true

  async function openSignInPageIfRequest() {
    const {
      data: { pendingAppSignIn }
    } = await refetchPendingSignInRequests()
    if (pendingAppSignIn) {
      const verificationUrlObject = parse(
        pendingAppSignIn.verificationUrl,
        true
      )
      const { query } = verificationUrlObject
      setsignInData(query)
      setSignInOverlayVisible(true)
    }
  }

  useEffect(() => {
    const checkIfPendingSignInRequest = setInterval(() => {
      console.log('checkIfPendingSignInRequest')
      openSignInPageIfRequest()
    }, 3000)
    return () => {
      clearInterval(checkIfPendingSignInRequest)
    }
  }, [])

  useEffect(() => {
    if (!inNativeApp || inNativeAppLegacy) {
      return
    }

    const onMessage = event => {
      const { content = {}, id } = parseJSONObject(event.data)
      if (content.type === 'onPushRegistered') {
        // Register Notification Token
        const {
          token,
          os,
          osVersion,
          brand,
          model,
          deviceId,
          appVersion,
          userAgent
        } = content.data
        upsertDevice({
          variables: {
            token,
            information: {
              os,
              osVersion,
              model,
              brand,
              deviceId,
              appVersion,
              userAgent
            }
          }
        })
        console.log('onPushRegistered', content)
      } else if (content.type === 'onAudioPlayerVisibilityChange') {
        // Audio Player is Visible
        setAudioPlayerVisibility(content.isVisible)
        console.log('onAudioPlayerVisibilityChange', content)
      } else if (content.type === 'onAppMediaProgressUpdate') {
        // Audio Player sent media progress update
        const { currentTime, mediaId } = content
        if (isTrackingAllowed) {
          upsertMediaProgress(mediaId, currentTime)
        } else {
          setLocalMediaProgress({ mediaId, currentTime })
        }
      } else if (content.type === 'appState') {
        // Check Whenever App becomes active (foreground)
        // opens signin page if theres a pending request
        if (content.current === 'active') {
          openSignInPageIfRequest()
        }
      }
      postMessage({
        type: 'ackMessage',
        id: id
      })
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [inNativeApp, inNativeAppLegacy, refetchPendingSignInRequests])

  if (signInOverlayVisible && signInData) {
    return (
      <AppSignInOverlay
        signInData={signInData}
        closeSignInOverlay={() => setSignInOverlayVisible(false)}
      />
    )
  } else {
    return null
  }
}

export default compose(
  withMe,
  graphql(upsertDeviceQuery, { name: 'upsertDevice' }),
  graphql(pendingAppSignInQuery, {
    // skip: props => !props.me, What's this for?
    options: {
      fetchPolicy: 'network-only'
    },
    props: ({ data }) => {
      return {
        pendingAppSignIn: data.pendingAppSignIn,
        refetchPendingSignInRequests: data.refetch
      }
    }
  }),
  withInNativeApp,
  withProgressApi
)(MessageSync)
