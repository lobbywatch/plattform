const { Roles } = require('@orbiting/backend-modules-auth')
const moment = require('moment')
const { nest } = require('d3-collection')
const { sum } = require('d3-array')

module.exports = async (_, { params = {} }, { pgdb, user }) => {
  Roles.ensureUserHasRole(user, 'accountant')

  const createdAt = new Date()
  const timeFilter = params.begin &&
    params.end && {
      begin: moment(params.begin).format('YYYY-MM-DD'),
      end: moment(params.end).format('YYYY-MM-DD'),
    }

  const createSQLTimeCondition = (fieldName, timeFilter) =>
    `(${fieldName} AT TIME ZONE 'Europe/Zurich' >= '${timeFilter.begin}' AND ${fieldName} AT TIME ZONE 'Europe/Zurich' < '${timeFilter.end}')`

  const transactionItems = await pgdb.query(`
    SELECT
      pay.id,
      pay."createdAt" AT TIME ZONE 'Europe/Zurich' "createdAt",
      ${
        timeFilter
          ? `${createSQLTimeCondition(
              'pay."createdAt"',
              timeFilter,
            )} AS "createdAtInFilter",`
          : ''
      }
      pay."updatedAt" AT TIME ZONE 'Europe/Zurich' "updatedAt",
      ${
        timeFilter
          ? `${createSQLTimeCondition(
              'pay."updatedAt"',
              timeFilter,
            )} AS "updatedAtInFilter",`
          : ''
      }
      pay.status,
      pay.method,
      pay.total,
      pay."pspPayload"->>'balance_transaction' AS "stripeBalanceTransactionId",
      json_agg(pfpay.buchungsdatum) AS "accountDates",
      ${
        timeFilter
          ? `json_agg(${createSQLTimeCondition(
              'pfpay.buchungsdatum',
              timeFilter,
            )}) AS "accountDatesInFilter",`
          : ''
      }
      p.payload->>'source' AS "pledgeSource",
      p.payload->>'backdatedTo' AS "backdatedTo",
      ${
        timeFilter
          ? `${createSQLTimeCondition(
              `(p.payload->>'backdatedTo')::timestamp`,
              timeFilter,
            )} AS "backdatedToInFilter",`
          : ''
      }
      c.name AS "companyName",
      pkgs.name AS "packageName",
      CONCAT(u."firstName", ' ', u."lastName") AS name,
      u.email,
      u.id AS "userId"

    FROM "payments" pay

    LEFT JOIN "postfinancePayments" pfpay ON pfpay.mitteilung = pay.hrid
    INNER JOIN "pledgePayments" ppay ON ppay."paymentId" = pay.id
    INNER JOIN "pledges" p ON p.id = ppay."pledgeId"
    INNER JOIN users u ON u.id = p."userId"
    INNER JOIN "packages" pkgs ON pkgs.id = p."packageId"

    INNER JOIN "companies" c ON c.id = pkgs."companyId"

    ${
      timeFilter
        ? `WHERE (
      ${createSQLTimeCondition('pay."createdAt"', timeFilter)}
      OR
      ${createSQLTimeCondition('pay."updatedAt"', timeFilter)}
      OR
      ${createSQLTimeCondition('pfpay.buchungsdatum', timeFilter)}
    )`
        : ''
    }

    GROUP BY pay.id, c.id, p.id, pkgs.id, u.id
    ORDER BY pay."createdAt"
  `)

  if (timeFilter) {
    transactionItems.forEach((transactionItem) => {
      if (
        transactionItem.method === 'PAYMENTSLIP' &&
        transactionItem.status === 'PAID'
      ) {
        const accountDatesInFilter =
          transactionItem.accountDatesInFilter.filter((d) => d !== null)
        const singleAccountPayment = accountDatesInFilter.length === 1
        const hasAccountPaymentInFilter =
          singleAccountPayment && accountDatesInFilter[0]
        if (
          !hasAccountPaymentInFilter &&
          !transactionItem.backdatedToInFilter &&
          transactionItem.pledgeSource !== 'Bexio Import'
        ) {
          if (transactionItem.createdAtInFilter && singleAccountPayment) {
            transactionItem.status = 'WAITING'
          } else {
            transactionItem.status = 'PAID_UNKOWN_ACCOUNT_DATE'
          }
        }
      }
    })
  }

  const packages = nest()
    .key((d) => d.packageName)
    .key((d) => d.status)
    .rollup((values) => {
      return {
        count: values.length,
        total: sum(values.map((d) => d.total)),
      }
    })
    .entries(transactionItems)

  const methods = nest()
    .key((d) => d.method)
    .key((d) => d.status)
    .rollup((values) => {
      return {
        count: values.length,
        total: sum(values.map((d) => d.total)),
      }
    })
    .entries(transactionItems)

  // nest()
  //   .key((d) => d.method)
  //   .entries(transactionItems)
  //   .forEach(({ key, values }) => {
  //     if (key !== 'PAYPAL') {
  //       // only paypal support for now
  //       return
  //     }
  //     const filteredValues = (
  //       timeFilter ? values.filter((d) => d.createdAtInFilter) : values
  //     ).filter((d) => d.paypalFee !== null)

  //     const method = methods.find((m) => m.key === key)
  //     method.values.push({
  //       key: 'FEES',
  //       value: {
  //         count: filteredValues.length,
  //         total: sum(filteredValues.map((d) => d.paypalFee)),
  //       },
  //     })
  //   })

  const unmatchedPostFinancePayments = await pgdb.queryOneField(
    'SELECT count(*) FROM "postfinancePayments" WHERE matched = false AND hidden IS NOT true',
  )
  const maxPostfinanceDate = await pgdb.queryOneField(
    'SELECT MAX(buchungsdatum) FROM "postfinancePayments"',
  )
  const maxPaymentDate = await pgdb.queryOneField(
    'SELECT MAX(GREATEST("createdAt", "updatedAt")) FROM "payments"',
  )

  const membershipTypes = await pgdb.query(`SELECT * FROM "membershipTypes"`)
  const membershipPeriodDays = await pgdb.query(`
    SELECT 
      type, 
      EXTRACT(
        year FROM day
      ) AS year, 
      COUNT(*) AS days
    FROM 
      (
        SELECT 
          mt.name AS type, 
          generate_series(
            mp."beginDate" :: date, mp."endDate" :: date, 
            interval '1d'
          ) AS day 
        FROM 
          "membershipPeriods" mp 
          JOIN memberships m ON m.id = mp."membershipId" 
          JOIN "membershipTypes" mt ON mt.id = m."membershipTypeId"
          JOIN pledges p ON p.id = mp."pledgeId"
          JOIN "pledgePayments" pp ON pp."pledgeId" = p.id
          JOIN payments pay ON pay.id = pp."paymentId" AND pay.status = 'PAID'
        GROUP BY mp.id, mt.name
      ) p 
    ${
      timeFilter
        ? `WHERE day >= '${moment(params.begin).format('YYYY')}-01-01'`
        : ''
    }
    GROUP BY 1, 2
    ORDER BY 1 DESC, 2 ASC
  `)

  const membershipDays = nest()
    .key((d) => d.type)
    .key((d) => d.year)
    .rollup(([value]) => {
      const membershipType = membershipTypes.find(
        (mt) => mt.name === value.type,
      )
      const daysInYear = value.year % 4 === 0 ? 366 : 365
      const pricePerDay =
        membershipType.interval === 'year'
          ? membershipType.price / daysInYear
          : membershipType.interval === 'month'
          ? (membershipType.price * 12) / daysInYear
          : membershipType.interval === 'week'
          ? membershipType.price / 7
          : membershipType.interval === 'day'
          ? membershipType.price
          : NaN
      return {
        count: value.days,
        total: Math.round(value.days * pricePerDay),
      }
    })
    .entries(membershipPeriodDays)

  return {
    createdAt,
    data: {
      timeFilter,
      unmatchedPostFinancePayments,
      maxPostfinanceDate,
      maxPaymentDate,
      packages,
      methods,
      membershipDays,
      transactionItems,
    },
  }
}
