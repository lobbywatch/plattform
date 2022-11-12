import { useState, Fragment } from 'react'
import { css } from 'glamor'
import compose from 'lodash/flowRight'
import {
  PdfIcon,
  ReadingTimeIcon,
  PlayCircleIcon,
  PlaylistAddIcon,
  PlaylistRemoveIcon,
  DownloadIcon,
  PodcastIcon,
  FontSizeIcon,
  ShareIcon,
  EditIcon,
  EtiquetteIcon,
  IconButton,
  Interaction,
  shouldIgnoreClick,
} from '@project-r/styleguide'
import withT from '../../lib/withT'
import withInNativeApp, { postMessage } from '../../lib/withInNativeApp'

import { splitByTitle } from '../../lib/utils/mdast'
import { trackEvent } from '../../lib/matomo'
import { getDiscussionLinkProps } from './utils'
import { PUBLIC_BASE_URL, PUBLIKATOR_BASE_URL } from '../../lib/constants'
import PdfOverlay, { getPdfUrl } from '../Article/PdfOverlay'
import FontSizeOverlay from '../FontSize/Overlay'
import ShareOverlay from './ShareOverlay'
import PodcastOverlay from './PodcastOverlay'
import { useAudioContext } from '../Audio/AudioProvider'

import SubscribeMenu from '../Notifications/SubscribeMenu'
import BookmarkButton from './BookmarkButton'
import DiscussionLinkButton from './DiscussionLinkButton'
import UserProgress from './UserProgress'
import ShareButtons from './ShareButtons'
import { useMe } from '../../lib/context/MeContext'
import useAudioQueue from '../Audio/hooks/useAudioQueue'
import AudioInfo from './AudioInfo'
import {
  AudioPlayerLocations,
  AudioPlayerActions,
} from '../Audio/types/AudioActionTracking'

const RenderItems = ({ items }) => (
  <>
    {items.map((props) => (
      <Fragment key={props.title}>
        {props.element || <IconButton key={props.title} {...props} />}
      </Fragment>
    ))}
  </>
)

const ActionBar = ({
  mode,
  document,
  documentLoading,
  t,
  inNativeApp,
  share,
  download,
  discussion,
  fontSize,
  isCentered,
}) => {
  const { me, meLoading, hasAccess, isEditor } = useMe()
  const [pdfOverlayVisible, setPdfOverlayVisible] = useState(false)
  const [fontSizeOverlayVisible, setFontSizeOverlayVisible] = useState(false)
  const [shareOverlayVisible, setShareOverlayVisible] = useState(false)
  const [podcastOverlayVisible, setPodcastOverlayVisible] = useState(false)
  const {
    toggleAudioPlayer,
    addAudioQueueItem,
    removeAudioQueueItem,
    isPlaying,
  } = useAudioContext()
  const { isAudioQueueAvailable, checkIfInQueue, checkIfActiveItem } =
    useAudioQueue()

  if (!document) {
    return (
      <div {...styles.topRow} {...(isCentered && { ...styles.centered })}>
        {download && (
          <IconButton href={download} Icon={DownloadIcon} target='_blank' />
        )}
        {fontSize && (
          <IconButton
            Icon={FontSizeIcon}
            onClick={(e) => {
              e.preventDefault()
              setFontSizeOverlayVisible(!fontSizeOverlayVisible)
            }}
          />
        )}
        {discussion && me && (
          <>
            <SubscribeMenu
              discussionId={discussion}
              label={t('SubscribeMenu/title')}
              padded
            />
            <IconButton
              Icon={EtiquetteIcon}
              label={t('components/Discussion/etiquette')}
              labelShort={t('components/Discussion/etiquette')}
              href='/etikette'
            />
          </>
        )}
        {share && (
          <IconButton
            label={share.label || ''}
            Icon={ShareIcon}
            href={share.url}
            onClick={(e) => {
              e.preventDefault()
              trackEvent(['ActionBar', 'share', share.url])
              if (inNativeApp) {
                postMessage({
                  type: 'share',
                  payload: {
                    title: share.title,
                    url: share.url,
                    subject: share.emailSubject || '',
                    dialogTitle: t('article/share/title'),
                  },
                })
                e.target.blur()
              } else {
                setShareOverlayVisible(!shareOverlayVisible)
              }
            }}
          />
        )}
        {shareOverlayVisible && (
          <ShareOverlay
            onClose={() => setShareOverlayVisible(false)}
            url={share.url}
            title={share.overlayTitle || t('article/actionbar/share')}
            tweet={share.tweet || ''}
            emailSubject={share.emailSubject || ''}
            emailBody={share.emailBody || ''}
            emailAttachUrl={share.emailAttachUrl}
          />
        )}
        {fontSizeOverlayVisible && (
          <FontSizeOverlay onClose={() => setFontSizeOverlayVisible(false)} />
        )}
      </div>
    )
  }

  const meta = document && {
    ...document.meta,
    url: `${PUBLIC_BASE_URL}${document.meta.path}`,
  }

  const podcast =
    (meta && meta.podcast) ||
    (meta && meta.audioSource && meta.format && meta.format.meta.podcast)

  const isSeriesOverview = meta && meta.series?.overview?.id === document?.id
  const hasPdf = meta && meta.template === 'article' && !isSeriesOverview
  const notBookmarkable =
    meta?.template === 'page' ||
    meta?.template === 'flyer' ||
    meta?.template === 'editorialNewsletter'
  const isDiscussion = meta && meta.template === 'discussion'
  const emailSubject = t('article/share/emailSubject', {
    title: document.meta.title,
  })
  const { discussionId } = getDiscussionLinkProps(
    meta.linkedDiscussion,
    meta.ownDiscussion,
    meta.template,
    meta.path,
  )

  const displayMinutes = meta.estimatedConsumptionMinutes % 60
  const displayHours = Math.floor(meta.estimatedConsumptionMinutes / 60)

  const forceShortLabel =
    mode === 'articleOverlay' ||
    mode === 'feed' ||
    mode === 'bookmark' ||
    mode === 'seriesEpisode'

  // centering
  const splitContent = document.content && splitByTitle(document.content)
  const titleNode =
    splitContent &&
    splitContent.title &&
    splitContent.title.children[splitContent.title.children.length - 1]
  const centered =
    (mode !== 'feed' && titleNode?.data?.center && mode !== 'articleBottom') ||
    (mode !== 'feed' && meta.template === 'format') ||
    (mode !== 'feed' && meta.template === 'section')

  const hours =
    displayHours > 0
      ? t.pluralize('feed/actionbar/readingTime/hours', { count: displayHours })
      : ''
  const minutes =
    displayMinutes > 0
      ? t.pluralize('feed/actionbar/readingTime/minutes', {
          count: displayMinutes,
        })
      : ''
  const minutesShort =
    displayMinutes > 0
      ? t.pluralize('feed/actionbar/readingTime/minutesShort', {
          count: displayMinutes,
        })
      : ''

  const readingTimeTitle = t('feed/actionbar/readingTime/title', {
    minutes,
    hours,
  })
  const readingTimeLabel = !forceShortLabel
    ? `${hours}${minutes}`
    : `${hours}${minutesShort}`
  const readingTimeLabelShort = `${hours}${minutesShort}`

  const showReadingTime =
    (displayMinutes > 0 || displayHours > 0) &&
    (meta.template === 'article' || meta.template === 'editorialNewsletter')

  const isArticleBottom = mode === 'articleBottom'

  const isActiveAudioItem = checkIfActiveItem(document.id)
  const itemPlaying = isPlaying && isActiveAudioItem
  const itemInAudioQueue = checkIfInQueue(document.id)
  const showAudioButtons =
    !!meta.audioSource && meta.audioSource.kind !== 'syntheticReadAloud'

  const play = () => {
    toggleAudioPlayer(
      {
        id: document.id,
        meta: {
          title: meta.title,
          path: meta.path,
          publishDate: meta.publishDate,
          image: meta.image,
          audioSource: meta.audioSource,
        },
      },
      AudioPlayerLocations.ACTION_BAR,
    )
  }

  const speakers = meta.contributors?.filter((c) => c.kind === 'voice')

  const ActionItems = [
    {
      title: readingTimeTitle,
      Icon: ReadingTimeIcon,
      label: readingTimeLabel,
      labelShort: readingTimeLabelShort,
      modes: ['feed', 'seriesEpisode'],
      show: showReadingTime,
    },
    {
      title: t('article/actionbar/userprogress'),
      element: (
        <UserProgress
          documentId={document.id}
          forceShortLabel={forceShortLabel}
          userProgress={document.userProgress}
          noCallout={
            mode === 'articleOverlay' ||
            mode === 'bookmark' ||
            mode === 'seriesEpisode'
          }
          noScroll={mode === 'feed'}
          displayMinutes={displayMinutes}
        />
      ),
      modes: ['articleOverlay', 'feed', 'bookmark', 'seriesEpisode'],
      show: !!document && document.userProgress,
    },
    {
      title: t('article/actionbar/pdf/options'),
      Icon: PdfIcon,
      href: hasPdf ? getPdfUrl(meta) : undefined,
      onClick: (e) => {
        if (shouldIgnoreClick(e)) {
          return
        }
        e.preventDefault()
        setPdfOverlayVisible(!pdfOverlayVisible)
      },
      modes: ['articleTop', 'articleBottom'],
      show: hasPdf,
    },
    {
      title: t('article/actionbar/fontSize/title'),
      Icon: FontSizeIcon,
      href: meta.url,
      onClick: (e) => {
        e.preventDefault()
        setFontSizeOverlayVisible(!fontSizeOverlayVisible)
      },
      modes: ['articleTop'],
      show: true,
    },
    // The subscription menu is available for all logged-in users
    {
      title: t('SubscribeMenu/title'),
      element: (
        <SubscribeMenu
          discussionId={isDiscussion && meta.ownDiscussion?.id}
          subscriptions={document?.subscribedBy?.nodes}
          label={t('SubscribeMenu/title')}
          labelShort={isArticleBottom ? t('SubscribeMenu/title') : undefined}
          padded
          loading={meLoading || documentLoading}
          attributes={{ ['data-show-if-me']: true }}
        />
      ),
      modes: ['articleTop', 'articleBottom'],
      show:
        // only show if there is something to subscribe to
        (isDiscussion ||
          meta.template === 'format' ||
          meta.format ||
          meta.contributors?.some((c) => c.user)) &&
        // and signed in or loading me
        (me || meLoading),
    },
    // The subscription menu is available for all users with an active-membership.
    {
      title: t('bookmark/title/default'),
      element: (
        <BookmarkButton
          bookmarked={document && !!document.userBookmark}
          documentId={document.id}
          label={!forceShortLabel ? t('bookmark/label') : ''}
          labelShort={
            !forceShortLabel && isArticleBottom ? t('bookmark/label') : ''
          }
          disabled={meLoading || documentLoading}
          attributes={{ ['data-show-if-active-membership']: true }}
        />
      ),
      modes: [
        'articleTop',
        'articleBottom',
        'articleOverlay',
        'feed',
        'bookmark',
        'seriesEpisode',
      ],
      show: !notBookmarkable && (meLoading || hasAccess),
    },
    {
      title: t('article/actionbar/share'),
      Icon: ShareIcon,
      href: meta.url,
      onClick: (e) => {
        e.preventDefault()
        trackEvent(['ActionBar', 'share', meta.url])
        if (inNativeApp) {
          postMessage({
            type: 'share',
            payload: {
              title: document.title,
              url: meta.url,
              subject: emailSubject,
              dialogTitle: t('article/share/title'),
            },
          })
          e.target.blur()
        } else {
          setShareOverlayVisible(!shareOverlayVisible)
        }
      },
      label: !forceShortLabel
        ? t(
            `article/actionbar/${mode}/share`,
            undefined,
            t('article/actionbar/share'),
          )
        : '',
      labelShort:
        !forceShortLabel && isArticleBottom
          ? t(
              `article/actionbar/${mode}/share`,
              undefined,
              t('article/actionbar/share'),
            )
          : '',
      modes: ['articleTop', 'articleOverlay', 'articleBottom', 'flyer'],
      show: true,
    },
    {
      title: readingTimeTitle,
      Icon: ReadingTimeIcon,
      label: readingTimeLabel,
      labelShort: readingTimeLabelShort,
      show: showReadingTime,
      modes: ['articleTop'],
      group: 'secondary',
    },
    {
      title: t('article/actionbar/userprogress'),
      element: (
        <UserProgress
          documentId={document.id}
          userProgress={document.userProgress}
          displayMinutes={displayMinutes}
        />
      ),
      show: !!document,
      modes: ['articleTop'],
      group: 'secondary',
    },
    {
      title: t('article/actionbar/discussion'),
      element: (
        <DiscussionLinkButton
          t={t}
          document={document}
          isOnArticlePage={[
            'articleTop',
            'articleOverlay',
            'articleBottom',
          ].includes(mode)}
          useCallToActionLabel={isArticleBottom}
          forceShortLabel={forceShortLabel}
        />
      ),
      modes: [
        'articleTop',
        'articleOverlay',
        'articleBottom',
        'feed',
        'seriesEpisode',
      ],
      show: !!discussionId,
    },
    {
      title: t('feed/actionbar/edit'),
      element: (
        <IconButton
          Icon={EditIcon}
          href={`${PUBLIKATOR_BASE_URL}/repo/${document?.repoId}/tree`}
          target='_blank'
          title={t('feed/actionbar/edit')}
          fill={'#E9A733'}
        />
      ),
      modes: ['articleTop', 'flyer'],
      show: document?.repoId && isEditor,
    },
    {
      disabled: itemPlaying,
      title: t('article/actionbar/audio/play'),
      label: !forceShortLabel ? t('article/actionbar/audio/play') : '',
      Icon: PlayCircleIcon,
      onClick: play,
      modes: ['feed', 'seriesEpisode', 'articleTop'],
      show: showAudioButtons,
      group: 'audio',
    },
    {
      title: t(`AudioPlayer/Queue/${itemInAudioQueue ? 'Remove' : 'Add'}`),
      label: !forceShortLabel
        ? t(
            `article/actionbar/audio/queue/${
              itemInAudioQueue ? 'remove' : 'add'
            }`,
          )
        : '',
      Icon: itemInAudioQueue ? PlaylistRemoveIcon : PlaylistAddIcon,
      onClick: async (e) => {
        e.preventDefault()
        if (itemInAudioQueue) {
          await removeAudioQueueItem(itemInAudioQueue.id)
          trackEvent([
            AudioPlayerLocations.ACTION_BAR,
            AudioPlayerActions.REMOVE_QUEUE_ITEM,
            meta?.path,
          ])
        } else {
          await addAudioQueueItem(document)
          trackEvent([
            AudioPlayerLocations.ACTION_BAR,
            AudioPlayerActions.ADD_QUEUE_ITEM,
            meta?.path,
          ])
        }
      },
      modes: ['feed', 'seriesEpisode', 'articleTop'],
      show: isAudioQueueAvailable && showAudioButtons,
      group: 'audio',
    },
    {
      title: t('PodcastButtons/title'),
      Icon: PodcastIcon,
      onClick: (e) => {
        e.preventDefault()
        trackEvent(['ActionBar', 'podcasts', meta.url])
        setPodcastOverlayVisible(!podcastOverlayVisible)
      },
      label: t('PodcastButtons/title'),
      show: !!podcast && meta.template !== 'format',
      modes: ['articleTop', 'articleBottom'],
      group: mode === 'articleTop' ? 'audio' : undefined,
    },
    {
      element: (
        <AudioInfo
          play={play}
          showAudioButtons={showAudioButtons}
          speakers={speakers}
          willBeReadAloud={meta.willBeReadAloud}
        />
      ),
      modes: ['articleTop'],
      show: ['readAloud', 'syntheticReadAloud'].includes(
        meta.audioSource?.kind,
      ),
      group: 'audio',
    },
  ]

  const shouldRenderActionItem = (actionItem) =>
    actionItem.show && actionItem.modes.includes(mode)

  const getGroup = (name) => (actionItem) =>
    !name ? !actionItem.group : actionItem.group === name

  const currentActionItems = ActionItems.filter(shouldRenderActionItem)

  // don't render actionbar if it has no items
  if (!currentActionItems.length) {
    return null
  }

  const primaryItems = currentActionItems.filter(getGroup())
  const secondaryItems = currentActionItems.filter(getGroup('secondary'))
  const audioItems = currentActionItems.filter(getGroup('audio'))

  return (
    <div {...(!hasAccess && mode !== 'articleOverlay' && styles.bottomMargin)}>
      <div
        {...(mode === 'feed' && styles.flexWrap)}
        {...((mode === 'seriesEpisode' || mode === 'feed') &&
          styles.feedContainer)}
      >
        <div
          {...styles.topRow}
          {...(mode === 'articleOverlay' && styles.overlay)}
          {...((mode === 'seriesEpisode' || mode === 'feed') && styles.inline)}
          {...(mode === 'articleBottom' && styles.flexWrap)}
          {...(!!centered && { ...styles.centered })}
        >
          <RenderItems items={primaryItems} />
        </div>

        {!!secondaryItems.length && (
          <div
            {...styles.secondary}
            {...(!!centered && { ...styles.centered })}
          >
            <RenderItems items={secondaryItems} />
          </div>
        )}

        {!!audioItems.length && (
          <div
            {...(mode !== 'articleTop' ? styles.inline : styles.secondary)}
            {...(!!centered && { ...styles.centered })}
            style={
              mode === 'articleTop'
                ? { alignItems: 'center' }
                : mode === 'seriesEpisode'
                ? { marginRight: 24 }
                : {}
            }
          >
            <RenderItems items={audioItems} />
          </div>
        )}

        {mode === 'seriesOverviewBottom' && (
          <>
            {!inNativeApp ? (
              <Interaction.P style={{ marginTop: 24 }}>
                <strong>{t('article/actionbar/share')}</strong>
              </Interaction.P>
            ) : null}
            <ShareButtons
              url={meta.url}
              title={document.title}
              tweet=''
              emailSubject={emailSubject}
              emailBody=''
              emailAttachUrl
            />
          </>
        )}
      </div>

      {/* OVERLAYS */}
      {pdfOverlayVisible && (
        <PdfOverlay
          article={document}
          onClose={() => setPdfOverlayVisible(false)}
        />
      )}
      {fontSizeOverlayVisible && (
        <FontSizeOverlay onClose={() => setFontSizeOverlayVisible(false)} />
      )}
      {shareOverlayVisible && (
        <ShareOverlay
          onClose={() => setShareOverlayVisible(false)}
          url={meta.url}
          title={t('article/actionbar/share')}
          tweet={''}
          emailSubject={emailSubject}
          emailBody={''}
          emailAttachUrl
        />
      )}
      {podcastOverlayVisible && (
        <PodcastOverlay
          onClose={() => setPodcastOverlayVisible(false)}
          title={t('PodcastButtons/title')}
          podcast={podcast}
        />
      )}
    </div>
  )
}

const styles = {
  bottomMargin: css({
    marginBottom: '16px',
  }),
  feedContainer: css({
    display: 'flex',
    justifyContent: 'space-between',
  }),
  topRow: css({
    display: 'flex',
  }),
  flexWrap: css({
    flexWrap: 'wrap',
    rowGap: 16,
  }),
  secondary: css({
    display: 'flex',
    marginTop: 24,
  }),
  overlay: css({
    marginTop: 0,
    width: '100%',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
  }),
  inline: css({
    marginTop: 10,
    display: 'inline-flex',
  }),
  centered: css({
    justifyContent: 'center',
  }),
  shareTitle: css({
    margin: '16px 0 0 0',
  }),
}

export default compose(withT, withInNativeApp)(ActionBar)
