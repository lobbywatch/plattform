import React, { useState } from 'react'
import { AudioPlayer } from '@project-r/styleguide'
import withT from '../../lib/withT'
import { compose } from 'react-apollo'
import { css } from 'glamor'
import { mediaQueries, zIndex } from '@project-r/styleguide'
import ProgressComponent from '../../components/Article/Progress'

export const AudioContext = React.createContext({
  audioState: {},
  toggleAudioPlayer: () => {}
})

export const AudioProvider = ({ children, t }) => {
  const [audioState, setAudioState] = useState(undefined)
  const [audioPlayerVisible, setAudioPlayerVisible] = useState(false)

  const toggleAudioPlayer = payload => {
    setAudioPlayerVisible(true)
    setAudioState(payload)
  }

  const onCloseAudioPlayer = () => {
    setAudioPlayerVisible(false)
    setTimeout(() => {
      setAudioState(undefined)
    }, 300)
  }

  return (
    <AudioContext.Provider value={{ toggleAudioPlayer }}>
      {children}
      <div
        {...css(styles.audioPlayerContainer, {
          opacity: audioPlayerVisible ? 1 : 0,
          transform: audioPlayerVisible ? 'translateY(0)' : 'translateY(8px)'
        })}
      >
        <div {...styles.audioPlayerBox}>
          {audioState && (
            <ProgressComponent isArticle={false}>
              <AudioPlayer
                key={audioState.mediaId || audioState.audioSource.mp3}
                mediaId={audioState.mediaId}
                durationMs={audioState.audioSource.durationMs}
                src={audioState.audioSource}
                title={audioState.title}
                sourcePath={audioState.sourcePath}
                closeHandler={onCloseAudioPlayer}
                autoPlay
                download
                scrubberPosition='bottom'
                t={t}
                fixed
                timePosition='left'
                height={68}
                controlsPadding={18}
              />
            </ProgressComponent>
          )}
        </div>
      </div>
    </AudioContext.Provider>
  )
}

const styles = {
  audioPlayerContainer: css({
    position: 'fixed',
    width: '100%',
    maxWidth: 414,
    bottom: 44,
    right: 0,
    padding: '0 16px',
    zIndex: zIndex.callout,
    transition: 'all ease-out 0.3s',
    [mediaQueries.mUp]: {
      right: 16
    }
  }),
  audioPlayerBox: css({
    backgroundColor: 'white',
    boxShadow: '0 0 15px rgba(0,0,0,0.1)'
  })
}

const ComposedAudioProvider = compose(withT)(AudioProvider)

export default ComposedAudioProvider
