import { Raw, State, Document, Block } from 'slate'

const nodeToRawNode = (node) => {
  const isDocument = node.kind === 'document'
  const rawNode = Raw.serialize(State.create({
    document: isDocument
      ? node
      : Document.create({
        nodes: Block.createList([
          node
        ])
      })
  })).document

  if (isDocument) {
    return rawNode
  }
  return rawNode.nodes[0]
}

export const rawNodeToNode = (rawNode) => {
  const isDocument = rawNode.kind === 'document'
  const node = Raw.deserialize({
    kind: 'state',
    document: isDocument
      ? rawNode
      : {
        kind: 'document',
        nodes: [rawNode]
      }
  }).document

  if (isDocument) {
    return node
  }
  return node.nodes.first()
}

const addValidation = (rule, serializer) => {
  rule.validate = node => {
    const context = {}
    const rawNode = nodeToRawNode(node)
    const mdast = serializer.toMdast(rawNode, context)

    return context.dirty || context.missing
      ? mdast
      : null
  }
  rule.normalize = (transform, object, mdast) => {
    const rawNode = serializer.fromMdast(mdast)
    const node = rawNodeToNode(
      rawNode.kind === 'state'
        ? rawNode.document
        : rawNode
    )

    if (node.kind === 'document') {
      const parent = transform.state.document

      let t = transform.setNodeByKey(object.key, {
        data: node.data
      })
      parent.nodes.forEach(n => {
        t = t.removeNodeByKey(
          n.key
        )
      })
      node.nodes.forEach((n, i) => {
        t = t.insertNodeByKey(
          parent.key,
          i,
          n
        )
      })
      return t
    }

    const parent = transform.state.document.getParent(object.key)
    const index = parent.nodes.findIndex(n => n === object)

    return transform
      .insertNodeByKey(
        parent.key,
        index,
        node
      )
      .removeNodeByKey(
        object.key
      )
  }
}

export const findOrCreate = (nodes, targetNode, newProps) => {
  const match = node => Object.keys(targetNode)
    .every(key => node[key] === targetNode[key])
  const node = nodes.find(match)
  return node || {
    ...targetNode,
    ...newProps
  }
}

export default addValidation
