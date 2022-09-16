import { css } from 'glamor'
import { MotionConfig, Reorder } from 'framer-motion'
import QueueItem from './QueueItem'
import { fontStyles } from '@project-r/styleguide'
import useAudioQueue from '../../hooks/useAudioQueue'
import { AudioQueueItem } from '../../graphql/AudioQueueHooks'
import { useEffect, useState } from 'react'
import throttle from 'lodash/throttle'

const styles = {
  heading: css({
    ...fontStyles.sansSerifMedium16,
  }),
  list: css({
    height: '100%',
    listStyle: 'none',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    overflow: 'hidden',
    overflowY: 'auto',
    // TODO: custom scrollbar to better match the design
  }),
}

type QueueProps = {
  t: any
  activeItem: AudioQueueItem
  items: AudioQueueItem[]
}

const Queue = ({ t, activeItem, items: inputItems }: QueueProps) => {
  /**
   * Work with a copy of the inputItems array to allow the mutation inside the
   * handleReorder function to be throttled while still having a smooth reordering in the ui.
   */
  const [items, setItems] = useState<AudioQueueItem[]>(inputItems)
  const { moveAudioQueueItem, removeAudioQueueItem, reorderAudioQueue } =
    useAudioQueue()

  /**
   * Synchronize the items passed via props with the internal items state.
   */
  useEffect(() => {
    setItems(inputItems)
  }, [inputItems])

  /**
   * Move the clicked queue-item to the front of the queue
   * @param item
   */
  const handleClick = async (item: AudioQueueItem) => {
    await moveAudioQueueItem({
      variables: {
        id: item.id,
        sequence: 1,
      },
    })
  }

  /**
   * Remove a given item from the queue
   * @param item
   */
  const handleRemove = async (item: AudioQueueItem) => {
    try {
      await removeAudioQueueItem({
        variables: {
          id: item.id,
        },
      })
    } catch (e) {
      console.error(e)
      alert('Could not remove item from playlist')
    }
  }

  const handleReorder = throttle(async (items: AudioQueueItem[]) => {
    try {
      const reorderedQueue = [activeItem, ...items].filter(Boolean)

      await reorderAudioQueue({
        variables: {
          ids: reorderedQueue.map(({ id }) => id),
        },
        optimisticResponse: {
          audioQueueItems: reorderedQueue.map((item, index) => ({
            ...item,
            sequence: index + 1,
            __typename: 'AudioQueueItem',
          })),
        },
      })
    } catch (e) {
      console.error(e)
      alert('Could not remove item from playlist')
    }
  }, 1000)

  return (
    <div style={{ height: '100%' }}>
      <p {...styles.heading}>{t('AudioPlayer/Queue/NextUp')}</p>
      <MotionConfig transition={{ duration: 0.3 }}>
        <Reorder.Group
          as='ol'
          {...styles.list}
          axis='y'
          values={items}
          onReorder={(reorderedItems) => {
            setItems(reorderedItems)
            handleReorder(reorderedItems)
          }}
        >
          {items.map((item) => (
            <QueueItem
              key={item.id}
              item={item}
              onClick={handleClick}
              onRemove={handleRemove}
            />
          ))}
        </Reorder.Group>
      </MotionConfig>
    </div>
  )
}

export default Queue
