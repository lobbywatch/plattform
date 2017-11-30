import React, { Component } from 'react'
import { graphql } from 'react-apollo'
import gql from 'graphql-tag'
import { compose } from 'redux'
import Loader from '../../components/Loader'
import { css } from 'glamor'
import { Link } from '../../lib/routes'
import { timeFormat } from '../../lib/utils/format'

import {
  Center,
  TeaserFeed,
  TeaserFeedHeadline,
  TeaserFeedLead,
  TeaserFeedCredit
} from '@project-r/styleguide'

const styles = {
  link: css({
    color: 'inherit',
    textDecoration: 'none'
  })
}

const getDocuments = gql`
  query getDocuments {
    documents {
      content
      meta {
        title
        description
        publishDate
        slug
      }
    }
  }
`

const publishDateFormat = timeFormat('%d. %B %Y')

const getArticleParams = path => {
  const [year, month, day, slug] = path.split('/')
  return {
    year,
    month,
    day,
    slug
  }
}

const Teaser = ({ meta }) => {
  // TODO: Pipe article format and teaser type through meta.
  return (
    <TeaserFeed format={meta.format} type={meta.type}>
      <TeaserFeedHeadline.Editorial>
        <Link route='article' params={getArticleParams(meta.slug)}>
          <a {...styles.link}>{meta.title}</a>
        </Link>
      </TeaserFeedHeadline.Editorial>
      <TeaserFeedLead>{meta.description}</TeaserFeedLead>
      <TeaserFeedCredit>
        {publishDateFormat(new Date(meta.publishDate))}
      </TeaserFeedCredit>
    </TeaserFeed>
  )
}

class Feed extends Component {
  // This will become a stateful component eventually.
  render () {
    const { data: { loading, error, documents } } = this.props
    return (
      <Loader
        loading={loading}
        error={error}
        render={() => {
          return (
            <Center>
              {documents &&
                documents.map(doc => (
                  <Teaser meta={doc.meta} key={doc.meta.slug} />
                ))}
            </Center>
          )
        }}
      />
    )
  }
}

export default compose(graphql(getDocuments))(Feed)
