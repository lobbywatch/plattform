import React, { Component } from 'react'
import { compose } from 'redux'
import { Router } from '../../lib/routes'
import { gql, graphql } from 'react-apollo'
import { Value, resetKeyGenerator } from 'slate'
import debounce from 'lodash.debounce'

import withData from '../../lib/apollo/withData'
import withAuthorization from '../../components/Auth/withAuthorization'

import Frame from '../../components/Frame'
import FrameBody from '../../components/Frame/Body'
import FrameHeader from '../../components/Frame/Header'
import FrameNav from '../../components/Frame/Nav'
import FrameMe from '../../components/Frame/Me'
import RepoNav from '../../components/Repo/Nav'
import Editor from '../../components/editor'
import EditorSidebar from '../../components/editor/Sidebar'

import VersionControl from '../../components/VersionControl'
import Sidebar from '../../components/Sidebar'

import Loader from '../../components/Loader'
import withT from '../../lib/withT'
import withMe from '../../lib/withMe'

import { errorToString } from '../../lib/utils/errors'
import initLocalStore from '../../lib/utils/localStorage'

import { getSchema } from '../../components/Templates'

import { Button } from '@project-r/styleguide'
import SettingsIcon from 'react-icons/lib/md/settings'

import createDebug from 'debug'

const debug = createDebug('publikator:pages:edit')

const fragments = {
  commit: gql`
    fragment EditPageCommit on Commit {
      id
      message
      parentIds
      date
      author {
        email
        name
      }
      document {
        content
        meta {
          title
          template
        }
      }
    }
  `,
  repo: gql`
    fragment EditPageRepo on Repo {
      id
    }
  `
}

const getCommitById = gql`
  query getCommitById($repoId: ID!, $commitId: ID!) {
    repo(id: $repoId) {
      ...EditPageRepo
      commit(id: $commitId) {
        ...EditPageCommit
      }
    }
  }
  ${fragments.repo}
  ${fragments.commit}
`

const getLatestCommit = gql`
  query getLatestCommit($repoId: ID!) {
    repo(id: $repoId) {
      id
      latestCommit {
        id
      }
    }
  }
`

const commitMutation = gql`
  mutation commit(
    $repoId: ID!
    $parentId: ID
    $message: String!
    $document: DocumentInput!
  ) {
    commit(
      repoId: $repoId
      parentId: $parentId
      message: $message
      document: $document
    ) {
      ...EditPageCommit
      repo {
        ...EditPageRepo
      }
    }
  }
  ${fragments.commit}
  ${fragments.repo}
`

const uncommittedChangesMutation = gql`
  mutation uncommittedChanges($repoId: ID!, $action: Action!) {
    uncommittedChanges(repoId: $repoId, action: $action)
  }
`

class EditorPage extends Component {
  constructor (...args) {
    super(...args)

    this.toggleSidebarHandler = this.toggleSidebarHandler.bind(this)
    this.changeHandler = this.changeHandler.bind(this)
    this.commitHandler = this.commitHandler.bind(this)
    this.documentChangeHandler = debounce(
      this.documentChangeHandler.bind(this),
      500
    )
    this.revertHandler = this.revertHandler.bind(this)

    this.editorRef = ref => {
      this.editor = ref
    }

    this.state = {
      committing: false,
      editorState: null,
      repo: null,
      uncommittedChanges: null,
      warnings: [],
      showSidebar: false
    }
  }

  warn (message) {
    this.setState(state => ({
      warnings: [
        message,
        ...state.warnings
      ].filter( // de-dup
        (message, i, all) => all.indexOf(message) === i
      )
    }))
  }

  beginChanges (repoId) {
    const { t } = this.props
    this.setState({
      uncommittedChanges: true
    })
    this.props.uncommittedChangesMutation({
      repoId: repoId,
      action: 'create'
    }).catch(error => {
      console.error(error)
      this.warn(t('commit/warn/uncommittedChangesError'))
    })
  }

  concludeChanges (repoId) {
    const { t } = this.props
    this.setState({
      uncommittedChanges: false
    })
    this.props.uncommittedChangesMutation({
      repoId: repoId,
      action: 'delete'
    }).catch(error => {
      console.error(error)
      this.warn(t('commit/warn/uncommittedChangesError'))
    })
  }

  componentWillReceiveProps (nextProps) {
    const { repo = {} } = this.props.data || {}
    const { repo: nextRepo = {} } = nextProps.data || {}

    if (
      repo !== nextRepo ||
      repo.commit !== nextRepo.commit
    ) {
      this.loadState(nextProps)
    }
  }

  checkLocalStorageSupport () {
    const { t } = this.props
    if (
      process.browser &&
      this.store &&
      !this.store.supported
    ) {
      this.warn(t('commit/warn/noStorage'))
    }
  }
  componentDidMount () {
    resetKeyGenerator()
    this.loadState(this.props)
  }

  revertHandler (e) {
    e.preventDefault()
    this.store.clear()
    this.loadState(this.props)
  }

  loadState (props) {
    const {
      t,
      data: { loading, error, repo } = {},
      url
    } = props

    if (!process.browser) {
      // running without local storage doesn't make sense
      // - we always want to render the correct version
      // - flash of an outdated version could confuse an user
      // - if js loading fails or is disabled no editing should happen
      //   - server rendered native content editable edits are not recoverable
      console.warn(`loadState should only run in the browser`)
      return
    }
    if (loading || error) {
      debug('loadState', 'isLoading', loading, 'hasError', error)
      return
    }
    const repoId = url.query.repoId
    const commitId = url.query.commitId
    if (!commitId && repo && repo.latestCommit) {
      debug('loadState', 'redirect', repo.latestCommit)
      Router.replaceRoute('repo/edit', {
        repoId: repoId.split('/'),
        commitId: repo.latestCommit.id
      })
      return
    }

    const { schema } = this.state
    if (!schema) {
      const commit = repo && repo.commit

      const template = (
        (commit && commit.document.meta.template) ||
        url.query.template
      )
      debug('loadState', 'loadSchema', template)
      this.setState({
        schema: getSchema(template)
      }, () => {
        this.loadState(this.props)
      })
      return
    }
    if (!this.editor || !this.editor.slate) {
      debug('loadState', 'waiting for slate')
      return
    }

    const isNew = commitId === 'new'
    let committedEditorState
    if (isNew) {
      committedEditorState = this.editor.newDocument(url.query, this.props.me)
      debug('loadState', 'new document', committedEditorState)
    } else {
      const commit = repo.commit
      if (!commit) {
        this.setState({
          error: t('commit/warn/missing', {commitId})
        })
        return
      }

      const json = commit.document.content
      committedEditorState = this.editor.serializer.deserialize(json)

      // normalize
      const normalizedState = committedEditorState
        .change()
        .setValue({ schema: this.editor.slate.schema })
        .normalize()
        .value

      if (normalizedState.document !== committedEditorState.document) {
        debug('loadState', 'normalize committed document', committedEditorState)
        committedEditorState = normalizedState
      }

      debug('loadState', 'edit document', committedEditorState)
    }
    const committedRawDocString = JSON.stringify(
      committedEditorState.document.toJSON()
    )

    const storeKey = [repoId, commitId].join('/')
    if (!this.store || this.store.key !== storeKey) {
      this.store = initLocalStore(storeKey)
      this.checkLocalStorageSupport()
    }

    let localState = this.store.get('editorState')
    let localEditorState
    if (localState) {
      try {
        localEditorState = Value.fromJSON(localState)
        debug('loadState', 'using local document', localEditorState)
      } catch (e) {
        console.error(e)
        this.warn(t('commit/warn/localParseError'))
      }
    }

    const nextState = {
      committedRawDocString
    }
    if (localEditorState) {
      this.beginChanges(repoId)
      nextState.editorState = localEditorState
    } else {
      this.concludeChanges(repoId)
      nextState.editorState = committedEditorState
    }
    this.setState(nextState)
  }

  changeHandler ({value}) {
    this.setState({ editorState: value })
  }

  documentChangeHandler (_, {value: newEditorState}) {
    const { url: { query: { repoId } } } = this.props
    const { committedRawDocString, uncommittedChanges } = this.state

    if (
      JSON.stringify(newEditorState.document.toJSON()) !== committedRawDocString
    ) {
      this.store.set('editorState', newEditorState.toJSON())
      debug('loadState', 'documentChangeHandler', 'edited document', newEditorState)
      if (process.env.NODE_ENV !== 'production') {
        debug(
          'loadState', 'documentChangeHandler', 'diff',
          require('diff').createPatch(
            'string',
            JSON.stringify(JSON.parse(committedRawDocString), null, 2),
            JSON.stringify(newEditorState.document.toJSON(), null, 2)
          )
        )
      }

      if (!uncommittedChanges) {
        this.beginChanges(repoId)
      }
    } else {
      debug('loadState', 'documentChangeHandler', 'committed document')
      if (uncommittedChanges) {
        this.store.clear()
        this.concludeChanges(repoId)
      }
    }
  }

  commitHandler () {
    const {
      url: { query: { repoId, commitId } },
      commitMutation,
      t
    } = this.props
    const { editorState } = this.state

    const message = window.prompt(t('commit/promtMessage'))
    if (!message) {
      return
    }
    this.setState({
      committing: true
    })

    commitMutation({
      repoId,
      parentId: commitId === 'new'
        ? null
        : commitId,
      message: message,
      document: {
        content: this.editor.serializer.serialize(editorState)
      }
    })
      .then(({data}) => {
        this.store.clear()
        this.concludeChanges(repoId)

        this.setState({
          committing: false
        })
        Router.replaceRoute('repo/edit', {
          repoId: repoId.split('/'),
          commitId: data.commit.id
        })
      })
      .catch(e => {
        console.error(e)
        this.setState({
          committing: false
        })
        this.warn(t('commit/warn/failed', {
          error: errorToString(e)
        }))
      })
  }

  toggleSidebarHandler () {
    this.setState(state => ({
      ...state,
      showSidebar: !state.showSidebar
    }))
  }

  render () {
    const { url, data = {} } = this.props
    const { repoId, commitId } = url.query
    const { loading, repo } = data
    const {
      schema,
      editorState,
      committing,
      uncommittedChanges,
      warnings,
      showSidebar
    } = this.state
    const sidebarWidth = 200

    const isNew = commitId === 'new'
    const error = data.error || this.state.error
    const showLoading = committing || loading || (!schema && !error)

    const nav = [
      <RepoNav key='repo-nav' route='repo/edit' url={url} isNew={isNew} />
    ]

    return (
      <Frame url={url} raw nav={nav}>
        <FrameHeader>
          <FrameHeader.Section align='left'>
            <FrameNav url={url}>
              <RepoNav route='repo/edit' url={url} isNew={isNew} />
            </FrameNav>
          </FrameHeader.Section>
          <FrameHeader.Section align='right'>
            <FrameMe />
          </FrameHeader.Section>
          <FrameHeader.Section align='right'>
            <Button
              style={{ margin: '9px 0 9px 0', minWidth: '60px' }}
              block
              onClick={this.toggleSidebarHandler}
          >
              <SettingsIcon size='32' />
            </Button>
          </FrameHeader.Section>
          {!showSidebar && <FrameHeader.Section align='right'>

            <Button
              style={{ margin: '9px 2px 9px 0', width: '180px' }}
              primary
              block
              disabled={!uncommittedChanges && !isNew}
              onClick={this.commitHandler}
              >
                Commit
              </Button>
            </FrameHeader.Section>
          }
        </FrameHeader>
        <FrameBody raw>
          <Loader loading={showLoading} error={error} render={() => (
            <div>
              <Editor
                ref={this.editorRef}
                schema={schema}
                value={editorState}
                onChange={this.changeHandler}
                onDocumentChange={this.documentChangeHandler}
              />
              <Sidebar selectedTabId='workflow' isOpen={showSidebar}>
                <Sidebar.Tab tabId='workflow' label='Workflow'>
                  <VersionControl
                    repoId={repoId}
                    commit={repo && (repo.commit || repo.latestCommit)}
                    isNew={isNew}
                    uncommittedChanges={uncommittedChanges}
                    warnings={warnings}
                    commitHandler={this.commitHandler}
                    revertHandler={this.revertHandler}
                    width={sidebarWidth}
                  />
                </Sidebar.Tab>
                <Sidebar.Tab tabId='edit' label='Editieren'>
                  <EditorSidebar
                    schema={schema}
                    onChange={this.changeHandler}
                    value={editorState}
                  />
                </Sidebar.Tab>
              </Sidebar>
            </div>
        )} />
        </FrameBody>
      </Frame>
    )
  }
}

export default compose(
  withData,
  withT,
  withAuthorization(['editor']),
  withMe,
  graphql(getCommitById, {
    skip: ({ url }) => url.query.commitId === 'new' || !url.query.commitId,
    options: ({ url }) => ({
      variables: {
        repoId: url.query.repoId,
        commitId: url.query.commitId
      }
    })
  }),
  graphql(getLatestCommit, {
    skip: ({ url }) => url.query.commitId === 'new' || !!url.query.commitId,
    options: ({ url }) => ({
      variables: {
        repoId: url.query.repoId
      }
    })
  }),
  graphql(commitMutation, {
    props: ({ mutate, ownProps: { url } }) => ({
      commitMutation: variables =>
        mutate({
          variables,
          update: (store, { data: { commit } }) => {
            const { repoId, parentId } = variables
            let data
            if (parentId) {
              const oldData = store.readQuery({
                query: getCommitById,
                variables: {
                  repoId,
                  commitId: parentId
                }
              })
              data = {
                ...oldData,
                repo: {
                  ...oldData.repo,
                  commit
                }
              }
            } else {
              data = {
                repo: {
                  ...commit.repo,
                  commit
                }
              }
            }
            store.writeQuery({
              query: getCommitById,
              variables: {
                repoId,
                commitId: commit.id
              },
              data
            })
          }
        })
    })
  }),
  graphql(uncommittedChangesMutation, {
    props: ({ mutate }) => ({
      uncommittedChangesMutation: variables =>
        mutate({
          variables
        })
    })
  })
)(EditorPage)
