import React, { Component } from 'react'
import { graphql } from '@apollo/client/react/hoc'
import { gql } from '@apollo/client'

import debounce from 'lodash/debounce'

import { Label, Interaction } from '../../Typography'
import Autocomplete from '../../Form/Autocomplete'
import { InlineSpinner } from '../../Spinner'
import { timeFormat } from '../../../lib/timeFormat'

export const filterRepos = gql`
  query searchRepo($after: String, $search: String) {
    repos: reposSearch(
      first: 10
      after: $after
      search: $search
      isTemplate: false
    ) {
      totalCount
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        id
        meta {
          publishDate
        }
        latestPublications {
          document {
            id
            meta {
              publishDate
            }
          }
        }
        latestCommit {
          id
          document {
            id
            meta {
              title
              description
              image
              path
              externalBaseUrl
              format {
                id
                repoId
                meta {
                  path
                  externalBaseUrl
                  title
                  color
                  kind
                }
              }
            }
          }
        }
      }
    }
  }
`

const RepoElement = ({ title, publishDate }) => {
  const label = publishDate
    ? timeFormat('%d.%m.%Y')(new Date(publishDate))
    : 'nicht publiziert'

  return (
    <>
      <Interaction.P>{title}</Interaction.P>
      <Label>{label}</Label>
    </>
  )
}

const createRepoItem = (repo) => {
  const text = repo.latestCommit.document.meta.title || repo.id.split('/')[1]
  const publishDate =
    repo.latestPublications[0]?.document?.meta.publishDate ||
    repo.meta.publishDate

  return {
    value: repo,
    text,
    element: <RepoElement title={text} publishDate={publishDate} />,
  }
}

const ConnectedAutoComplete = graphql(filterRepos, {
  skip: (props) => !props.filter,
  options: ({ search, template, isSeriesEpisode, isSeriesMaster }) => ({
    fetchPolicy: 'no-cache',
    variables: { search, template, isSeriesEpisode, isSeriesMaster },
  }),
  props: (props) => {
    if (props.data.loading) return { data: props.data, items: [] }
    const {
      data: { repos: { nodes = [] } = {} },
    } = props
    return {
      data: props.data,
      items: nodes.map(createRepoItem),
      autoFocus: props.autoFocus,
    }
  },
})((props) => {
  const showLoader = props.data && props.data.loading
  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <Autocomplete key='autocomplete' {...props} />
      {!!showLoader && (
        <span
          style={{
            position: 'absolute',
            top: '21px',
            right: '0px',
            zIndex: 500,
          }}
        >
          <InlineSpinner size={35} />
        </span>
      )}
    </span>
  )
})

const safeValue = (value) =>
  typeof value === 'string' ? { value, text: value } : null

export default class RepoSearch extends Component {
  constructor(props) {
    super(props)
    this.state = {
      items: [],
      filter: '',
      search: '',
      value: safeValue(props.value),
    }

    this.filterChangeHandler = this.filterChangeHandler.bind(this)
    this.changeHandler = this.changeHandler.bind(this)
    this.setSearchValue = debounce(this.setSearchValue.bind(this), 500)
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      value: safeValue(nextProps.value),
    })
  }

  componentWillUnmount() {
    this.setSearchValue.cancel()
  }

  setSearchValue() {
    this.setState({
      search: this.state.filter,
    })
  }

  filterChangeHandler(value) {
    this.setState(
      (state) => ({
        filter: value,
      }),
      this.setSearchValue,
    )
  }

  changeHandler(value) {
    this.setState(
      (state) => ({
        value: null,
        filter: null,
      }),
      () => this.props.onChange(value),
    )
  }

  render() {
    const { filter, value, search } = this.state

    return (
      <ConnectedAutoComplete
        label='Dokument suchen'
        filter={filter}
        value={value}
        search={search}
        items={[]}
        onChange={this.changeHandler}
        onFilterChange={this.filterChangeHandler}
        autoFocus={this.props.autoFocus}
      />
    )
  }
}
