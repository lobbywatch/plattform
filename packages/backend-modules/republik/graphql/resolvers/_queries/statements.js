const { ascending } = require('d3-array')
const { transformUser } = require('@orbiting/backend-modules-auth')

const fragmentWithMinMaxDates = `
  WITH "minMaxDates" AS (
    SELECT m."userId", MAX(mp."endDate") "maxEndDate"
    FROM "membershipPeriods" mp
    JOIN "memberships" m ON m.id = mp."membershipId"
    GROUP BY 1
  )
`

const fragmentJoinMinMaxDates = `
  JOIN "minMaxDates" mmd
    ON mmd."userId" = u.id AND "maxEndDate" >= :membershipAfter
`

const { STATEMENTS_ONLY_MEMBERS } = process.env
const deduplicate = (d, i, all) => all.indexOf(d) === i

module.exports = async (_, args, { pgdb, t }) => {
  const { first, after, search, focus, featuredIds, membershipAfter } = args
  const seed = args.seed || Math.random() * 2 - 1

  if (first > 100) {
    throw new Error(t('api/statements/maxNodes'))
  }

  const firstIds = []
    .concat(focus)
    .concat(featuredIds)
    .filter(Boolean)
    .filter(deduplicate)

  const results = async (userRows) => {
    let ids = userRows.map((user) => user.id)
    if (firstIds.length) {
      ids = firstIds.concat(ids.filter((id) => !firstIds.includes(id)))
    }

    let startIndex = 0
    let endIndex = ids.length
    if (after) {
      startIndex = ids.findIndex((id) => id === after)
    }
    endIndex = startIndex + first

    const nodeIds = ids.slice(startIndex, endIndex)

    const users = await pgdb.query(
      `
      SELECT
        u.*,
        m."sequenceNumber" as "sequenceNumber"
      FROM users u
      ${STATEMENTS_ONLY_MEMBERS ? '' : 'LEFT '}JOIN memberships m
        ON m.id = (SELECT id FROM memberships WHERE "userId" = u.id ORDER BY "sequenceNumber" ASC LIMIT 1)
      WHERE
        ARRAY[u.id] && :ids;
    `,
      { ids: nodeIds },
    )

    // obey order!
    // - this ensures firstId comes first
    // - and that the random order isn't overwritten by the db internal order
    users.sort((a, b) =>
      ascending(nodeIds.indexOf(a.id), nodeIds.indexOf(b.id)),
    )

    const endId = nodeIds[nodeIds.length - 1]
    const startId = nodeIds[0]

    return {
      totalCount: ids.length,
      nodes: users.map((user) => ({
        ...transformUser(user),
        _scopeConfig: {
          exposeFields: ['credentials'], // listed credential will be exposed even if non public profile
        },
      })),
      pageInfo: {
        endCursor: endId,
        hasNextPage: endIndex < ids.length - 1,
        hasPreviousPage: startIndex > 0,
        startCursor: startId,
      },
    }
  }

  if (search) {
    const userRows = await pgdb.query(
      `
      ${membershipAfter ? fragmentWithMinMaxDates : ''}

      SELECT DISTINCT
        u.id
      FROM
        users u
      ${membershipAfter ? fragmentJoinMinMaxDates : ''}
      LEFT JOIN
        credentials c
        ON c."userId" = u.id AND c."isListed" = true
      WHERE
        u."isListed" = true
        AND u."isAdminUnlisted" = false
        AND u."portraitUrl" is not null
        ${
          !membershipAfter && STATEMENTS_ONLY_MEMBERS
            ? 'AND u.roles @> \'["member"]\''
            : ''
        }
        AND (
          u."firstName" % :search OR
          u."lastName" % :search OR
          u."firstName" ILIKE :searchLike OR
          u."lastName" ILIKE :searchLike OR
          c.description % :search OR
          c.description ILIKE :searchLike
        )
    `,
      { search, searchLike: search + '%', seed, membershipAfter },
    )

    return results(userRows)
  } else {
    const userRows = await pgdb.query(
      `
      ${membershipAfter ? fragmentWithMinMaxDates : ''}

      SELECT id
      FROM (
        SELECT
          setseed(:seed),
          NULL AS id

        UNION ALL

        SELECT
          null,
          u.id
        FROM users u
        ${membershipAfter ? fragmentJoinMinMaxDates : ''}
        WHERE
          u."isListed" = true
          AND u."isAdminUnlisted" = false
          AND u."portraitUrl" is not null
          ${
            !membershipAfter && STATEMENTS_ONLY_MEMBERS
              ? 'AND u.roles @> \'["member"]\''
              : ''
          }
        OFFSET 1
      ) s
      ORDER BY random()
    `,
      { seed, membershipAfter },
    )

    return results(userRows)
  }
}
