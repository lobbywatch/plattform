import React, { Fragment } from 'react'
import { Mutation } from 'react-apollo'
import gql from 'graphql-tag'
import { css } from 'glamor'

import { Interaction, mediaQueries, Button, linkRule } from '@project-r/styleguide'

import Section from '../Section'
import PathLink from '../../Link/Path'
import ProgressSettings from '../../Account/ProgressSettings'
import {
  submitConsentMutation,
  revokeConsentMutation
} from '../../Article/Progress/api'
import { PROGRESS_EXPLAINER_PATH } from '../../../lib/constants'
import withT from '../../../lib/withT'

const { P } = Interaction

const styles = {
  p: css({
    marginBottom: 20
  }),
  actions: css({
    marginBottom: 20,
    display: 'flex',
    flexWrap: 'wrap',
    position: 'relative',
    '& > button': {
      flexGrow: 1,
      margin: '5px 15px 0 0',
      minWidth: '120px',
      [mediaQueries.mUp]: {
        flexGrow: 0,
        margin: '5px 15px 0 0',
        minWidth: '160px'
      }
    }
  })
}

export const fragments = {
  user: gql`
    fragment UsabilityUser on User {
      id
      PROGRESS: hasConsentedTo(name:"PROGRESS")
    }
  `
}

const Usability = (props) => {
  const { user, onContinue, t } = props

  // Is ticked when either REVOKE or GRANT consent was submitted.
  const hasConsented = user && user.PROGRESS !== null

  return (
    <Section
      heading={t('Onboarding/Sections/Usability/heading')}
      isTicked={hasConsented}
      showContinue={hasConsented}
      {...props}>
      {hasConsented ? (
        <Fragment>
          <ProgressSettings />
          <br />
        </Fragment>
      ) : (
        <Fragment>
          <P {...styles.p}>
            {t('Onboarding/Sections/Usability/paragraph1', null, '')}
          </P>
          <P {...styles.p}>
            {t('Onboarding/Sections/Usability/paragraph2', null, '')}
          </P>
          <P {...styles.p}>
            {t.elements('Onboarding/Sections/Usability/paragraph3', {
              linkMore: (
                <PathLink key='linkMore' path={PROGRESS_EXPLAINER_PATH} passHref>
                  <a {...linkRule}>{t('Onboarding/Sections/Usability/linkMore')}</a>
                </PathLink>
              )
            }, '')}
          </P>
          <div {...styles.actions}>
            <Mutation mutation={submitConsentMutation} onCompleted={() => onContinue(props)}>
              {(submit, { loading }) => {
                return (
                  <Button onClick={submit} disabled={loading}>
                    {t('Onboarding/Sections/Usability/button/submitConsent')}
                  </Button>
                )
              }}
            </Mutation>
            <Mutation mutation={revokeConsentMutation} onCompleted={() => onContinue(props)}>
              {(revoke, { loading }) => {
                return (
                  <Button onClick={revoke} disabled={loading}>
                    {t('Onboarding/Sections/Usability/button/revokeConsent')}
                  </Button>
                )
              }}
            </Mutation>
          </div>
        </Fragment>
      )}
    </Section>
  )
}

export default withT(Usability)
