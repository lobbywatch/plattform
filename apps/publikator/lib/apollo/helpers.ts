import { makeWithDefaultSSR } from '@republik/nextjs-apollo-client'
import { initializeApollo } from '.'
import { meQuery } from '../withMe'

export const withDefaultSSR = makeWithDefaultSSR(
  initializeApollo,
  async (client) => {
    await client.query({
      query: meQuery,
    })
  },
)
