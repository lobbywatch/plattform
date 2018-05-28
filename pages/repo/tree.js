import React, { Component } from 'react'
import { css } from 'glamor'
import { compose } from 'redux'
import { gql, graphql } from 'react-apollo'

import withData from '../../lib/apollo/withData'
import withAuthorization from '../../components/Auth/withAuthorization'

import Loader from '../../components/Loader'
import Tree from '../../components/Tree'
import Frame from '../../components/Frame'
import RepoNav from '../../components/Repo/Nav'
import { NarrowContainer, A, InlineSpinner } from '@project-r/styleguide'
import { getKeys as getLocalStorageKeys } from '../../lib/utils/localStorage'

import CurrentPublications from '../../components/Publication/Current'
import UncommittedChanges from '../../components/VersionControl/UncommittedChanges'

const styles = {
  loadMoreButton: css({
    cursor: 'pointer'
  }),
  loadMoreContainer: css({
    positon: 'relative',
    height: '80px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  }),
  loadMore: css({
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center'
  })
}

const fragments = {
  commit: gql`
    fragment TreeCommit on Commit {
      id
      message
      parentIds
      date
      author {
        email
        name
      }
    }
  `,
  milestone: gql`
    fragment TreeMilestone on Milestone {
      name
      message
      immutable
      commit {
        id
      }
      author {
        email
        name
      }
    }
  `
}

export const query = gql`
  query repoWithHistory(
    $repoId: ID!
    $first: Int!
    $after: String
  ) {
    repo(id: $repoId) {
      id
      commits(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ...TreeCommit
        }
      }
      milestones {
        ...TreeMilestone
      }
    }
  }
  ${fragments.commit}
  ${fragments.milestone}
`

const repoSubscription = gql`
  subscription repoUpdate($repoId: ID!) {
    repoUpdate(repoId: $repoId) {
      id
      latestCommit {
        ...TreeCommit
      }
      milestones {
        ...TreeMilestone
      }
    }
  }
  ${fragments.commit}
  ${fragments.milestone}
`

class EditorPage extends Component {
  componentDidMount () {
    // this.subscribe()
  }

  componentDidUpdate () {
    // this.subscribe()
  }

  subscribe () {
    if (!this.unsubscribe && this.props.data.repo) {
      this.unsubscribe = this.props.data.subscribeToMore({
        document: repoSubscription,
        variables: {
          repoId: this.props.url.query.repoId
        },
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) {
            return prev
          }
          const { latestCommit, milestones } = subscriptionData.data.repoUpdate
          if (
            !prev.repo.commits.find(commit => commit.id === latestCommit.id)
          ) {
            const commits = prev.repo.commits.concat(latestCommit)
            return {
              ...prev,
              repo: {
                ...prev.repo,
                commits,
                milestones
              }
            }
          } else {
            return prev
          }
        }
      })
    }
  }

  componentWillUnmount () {
    this.unsubscribe && this.unsubscribe()
  }

  render () {
    const { url, commits, hasMore, fetchMore } = this.props
    const { loading, error, repo } = this.props.data
    const { repoId } = url.query

    const localStorageCommitIds = getLocalStorageKeys()
      .filter(key => key.startsWith(repoId))
      .map(key => key.split('/').pop())

    return (
      <Frame>
        <Frame.Header>
          <Frame.Header.Section align='left'>
            <Frame.Nav url={url}>
              <RepoNav route='repo/tree' url={url} />
            </Frame.Nav>
          </Frame.Header.Section>
          <Frame.Header.Section align='right'>
            {!!repo &&
              <div style={{marginRight: 10}}>
                <UncommittedChanges repoId={repo.id} />
              </div>
            }
          </Frame.Header.Section>
          <Frame.Header.Section align='right'>
            <Frame.Me />
          </Frame.Header.Section>
        </Frame.Header>
        <Frame.Body raw>
          <Loader loading={loading && !repo} error={error} render={() => (
            <div>
              <br />
              <NarrowContainer>
                <CurrentPublications repoId={repoId} />
              </NarrowContainer>
              <Tree
                commits={commits}
                localStorageCommitIds={localStorageCommitIds}
                milestones={repo.milestones}
                repoId={repoId}
                />
            </div>
          )} />
          {
            /* Load more commits */
            hasMore &&
            <div {...styles.loadMoreContainer}>
              <div {...styles.loadMore}>
                {loading && <InlineSpinner size={60} />}
                {!loading && <A
                  {...styles.loadMoreButton}
                  onClick={() => fetchMore()}
              >Ältere laden</A>
            }
              </div>
            </div>
          }
        </Frame.Body>
      </Frame>
    )
  }
}

export default compose(
  withData,
  withAuthorization(['editor']),
  graphql(query, {
    options: ({ url }) => ({
      variables: {
        repoId: url.query.repoId,
        first: 10
      },
      fetchPolicy: 'cache-and-network'
    }),
    props: ({data, ownProps}) => ({
      data,
      commits: data.repo.commits.nodes,
      hasMore: data.repo.commits.pageInfo.hasNextPage,
      fetchMore: () => {
        return data.fetchMore({
          variables: {
            repoId: data.repo.id,
            first: 20,
            after: data.repo.commits.pageInfo.endCursor
          },
          updateQuery: (previousResult, { fetchMoreResult }) => {
            return {
              repo: {
                ...previousResult.repo,
                ...fetchMoreResult.repo,
                commits: {
                  ...previousResult.repo.commits,
                  ...fetchMoreResult.repo.commits,
                  nodes: [
                    ...previousResult.repo.commits.nodes,
                    ...fetchMoreResult.repo.commits.nodes
                  ].filter(({id}, i, all) =>
                    // deduplicate by id
                    i === all.findIndex(repo => repo.id === id)
                  )
                }
              }
            }
          }
        })
      }
    })
  })
)(EditorPage)
