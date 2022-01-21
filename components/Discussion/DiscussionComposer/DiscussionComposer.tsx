import React, { useMemo, useState } from 'react'
import {
  CommentComposer,
  CommentComposerPlaceholder
} from '@project-r/styleguide'
import PropTypes from 'prop-types'
import { useDiscussion } from '../context/DiscussionContext'
import { useTranslation } from '../../../lib/withT'
import { composerHints } from '../shared/constants'
import useSubmitCommentHandler from '../hooks/actions/useSubmitCommentHandler'
import useEditCommentHandler from '../hooks/actions/useEditCommentHandler'
import useDiscussionPreferences from '../hooks/useDiscussionPreferences'
import SecondaryActions from '../shared/SecondaryActions'
import DiscussionComposerBarrier from './DiscussionComposerBarrier'
import usePreviewCommentHandler from '../helpers/usePreviewCommentHandler'

const propTypes = {
  isRootLevel: PropTypes.bool,
  onClose: PropTypes.func,
  commentId: PropTypes.string,
  parentId: PropTypes.string,
  initialText: PropTypes.string,
  initialTagValue: PropTypes.string,
  initialActiveState: PropTypes.bool,
  placeholder: PropTypes.string
}

const DiscussionComposer = ({
  isRootLevel = false,
  onClose,
  // Props below are used for editing a comment
  commentId,
  parentId,
  initialText,
  initialTagValue,
  initialActiveState,
  placeholder
}: PropTypes.InferProps<typeof propTypes>) => {
  const { t } = useTranslation()

  const { id: discussionId, discussion, overlays, activeTag } = useDiscussion()
  const { tags, rules, displayAuthor } = discussion
  const { preferencesOverlay } = overlays

  const {
    preferences,
    updateDiscussionPreferencesHandler
  } = useDiscussionPreferences(discussionId)

  const automaticCredential = useMemo(() => {
    if (!preferences || preferences?.discussion?.userPreference?.anonymity) {
      return null
    }
    return preferences.me.credentials.find(credential => credential.isListed)
  }, [preferences])

  const submitCommentHandler = useSubmitCommentHandler()
  const editCommentHandler = useEditCommentHandler()
  const previewCommentHandler = usePreviewCommentHandler()

  const [active, setActive] = useState(!!initialText || initialActiveState)

  // Create the submit-handler. In case a commentId was given, handle as edit
  const handleSubmit = async (value, tags) => {
    try {
      if (automaticCredential) {
        await updateDiscussionPreferencesHandler(
          false,
          automaticCredential.description
        )
      }

      let response

      if (!commentId) {
        // New root comment or a reply to a comment
        response = await submitCommentHandler(value, tags, {
          discussionId,
          parentId
        })
      } else {
        // Edit a comment
        response = await editCommentHandler(commentId, value, tags)
      }

      return response
    } catch (err) {
      return {
        error: err
      }
    }
  }

  return (
    <DiscussionComposerBarrier isTopLevel={isRootLevel} showPayNotes>
      {active ? (
        <CommentComposer
          t={t}
          isRoot={isRootLevel}
          discussionId={discussion.id}
          parentId={parentId}
          commentId={commentId}
          onSubmit={({ text, tags = [] }) => handleSubmit(text, tags)}
          onSubmitLabel={
            initialText
              ? t('styleguide/comment/edit/submit')
              : parentId
              ? t('styleguide/CommentComposer/answer')
              : t('submitComment/rootSubmitLabel')
          }
          onClose={() => {
            setActive(false)
            if (onClose) {
              onClose()
            }
          }}
          onOpenPreferences={() =>
            preferencesOverlay.handleOpen(automaticCredential)
          }
          onPreviewComment={previewCommentHandler}
          hintValidators={composerHints(t)}
          secondaryActions={<SecondaryActions isReply={!!parentId} />}
          displayAuthor={displayAuthor}
          placeholder={placeholder}
          maxLength={rules?.maxLength}
          tags={tags}
          initialText={initialText}
          initialTagValue={
            tags && tags.length > 0
              ? initialTagValue ?? activeTag ?? tags[0]
              : undefined
          }
        />
      ) : (
        <CommentComposerPlaceholder
          t={t}
          displayAuthor={displayAuthor ?? {}}
          onClick={() => setActive(true)}
          placeholder={placeholder}
        />
      )}
    </DiscussionComposerBarrier>
  )
}

export default DiscussionComposer

DiscussionComposer.propTypes = propTypes
