const { transformUser } = require('@orbiting/backend-modules-auth')

const { STATEMENTS_ONLY_MEMBERS } = process.env

const getUser = (sequenceNumber, isAsc, pgdb) =>
  pgdb
    .query(
      `
    SELECT
      u.*,
      m."sequenceNumber" as "sequenceNumber"
    FROM users u
    ${STATEMENTS_ONLY_MEMBERS ? '' : 'LEFT '}JOIN memberships m
      ON m.id = (
        SELECT id
        FROM memberships
        WHERE "userId" = u.id
        ORDER BY "sequenceNumber" ASC
        LIMIT 1
      )
    WHERE
      m."sequenceNumber" ${isAsc ? '>' : '<'} :sequenceNumber
      AND u."isListed" = true
      AND u."isAdminUnlisted" = false
      AND u."portraitUrl" is not null
      ${STATEMENTS_ONLY_MEMBERS ? `AND u.roles @> '["member"]'` : ''}
    ORDER BY m."sequenceNumber" ${isAsc ? 'ASC' : 'DESC'}
    LIMIT 1
  `,
      {
        sequenceNumber,
      },
    )
    .then((result) => result && result[0] && transformUser(result[0]))

module.exports = async (_, { sequenceNumber, orderDirection }, { pgdb, t }) => {
  const isAsc = orderDirection === 'ASC'
  let user = await getUser(sequenceNumber, isAsc, pgdb)
  if (user) {
    return user
  }
  const newSequenceNumber = isAsc ? 0 : Math.pow(10, 6)
  user = await getUser(newSequenceNumber, isAsc, pgdb)
  if (user) {
    return user
  }
  throw new Error(t('api/statements/giveUp'))
}
