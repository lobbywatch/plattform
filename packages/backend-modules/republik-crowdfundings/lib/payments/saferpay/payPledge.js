const fetch = require('isomorphic-unfetch')
const { v4: uuid } = require('uuid')

const {
  SAFERPAY_CUSTOMER_ID,
  SAFERPAY_TERMINAL_ID,
  SAFERPAY_API_BASE_URL,
  SAFERPAY_API_USERNAME,
  SAFERPAY_API_PASSWORD,
  FRONTEND_BASE_URL,
} = process.env

const fetchSaferpay = (path, body) =>
  fetch(`${SAFERPAY_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(
        `${SAFERPAY_API_USERNAME}:${SAFERPAY_API_PASSWORD}`,
      ).toString('base64')}`,
    },
    body: JSON.stringify({
      RequestHeader: {
        SpecVersion: '1.30',
        CustomerId: SAFERPAY_CUSTOMER_ID,
        RequestId: uuid(),
        RetryIndicator: 0,
      },
      ...body,
    }),
  }).then((res) => {
    if (!res.ok) {
      throw Error(`${res.status} ${res.statusText}`)
    }

    return res.json()
  })

module.exports = async ({
  pledgeId,
  total,
  pspPayload = {},
  transaction,
  t,
  pkg,
  pledge,
  logger = console,
}) => {
  const { paymentId } = pspPayload

  if (!paymentId) {
    const payment = await transaction.public.payments.insertAndGet({
      type: 'PLEDGE',
      method: 'SAFERPAY',
      total: total,
      status: 'WAITING',
    })
    await transaction.public.pledgePayments.insert({
      pledgeId,
      paymentId: payment.id,
      paymentType: 'PLEDGE',
    })

    const paymentPage = await fetchSaferpay(
      '/Payment/v1/PaymentPage/Initialize',
      {
        TerminalId: SAFERPAY_TERMINAL_ID,
        Payment: {
          Amount: {
            Value: total,
            CurrencyCode: 'CHF',
          },
          OrderId: pledgeId,
          Description: pkg.name,
        },
        PaymentMethods: ['TWINT'],
        // ToDo: Alias Saving
        // RegisterAlias: {
        //   IdGenerator: 'RANDOM',
        //   Lifetime: 1600,
        // },
        ReturnUrls: {
          Success: `${FRONTEND_BASE_URL}/de/patronage?pledgeId=${pledgeId}&paymentId=${payment.id}&saferpay=success`,
          Fail: `${FRONTEND_BASE_URL}/de/patronage?pledgeId=${pledgeId}&paymentId=${payment.id}&saferpay=fail`,
        },
      },
    )

    await transaction.public.payments.updateOne(
      {
        id: payment.id,
      },
      {
        pspPayload: {
          paymentPage,
        },
        updatedAt: new Date(),
      },
    )

    return {
      status: pledge.status,
      saferpayRedirectUrl: paymentPage.RedirectUrl,
    }
  }

  const payment = await transaction.queryOne(
    `SELECT p.*
    FROM payments p
    JOIN "pledgePayments" pp ON p.id = pp."paymentId"
    WHERE pp."paymentId" = :paymentId AND pp."pledgeId" = :pledgeId`,
    {
      paymentId,
      pledgeId,
    },
  )
  const Token = payment?.pspPayload?.paymentPage?.Token
  if (!Token) {
    throw new Error(
      t('api/pay/paymentVerificationFail', { pledgeId, paymentId }),
    )
  }

  const assert = await fetchSaferpay('/Payment/v1/PaymentPage/Assert', {
    Token,
  })

  const { Transaction } = assert
  if (Transaction.Status === 'AUTHORIZED') {
    const capture = await fetchSaferpay('/Payment/v1/Transaction/Capture', {
      TransactionReference: {
        TransactionId: Transaction.Id,
      },
    })

    await transaction.public.payments.updateOne(
      {
        id: payment.id,
      },
      {
        status: 'PAID',
        pspPayload: {
          ...payment.pspPayload,
          assert,
          capture,
        },
        updatedAt: new Date(),
      },
    )

    // ToDo: Alias Saving
    // console.log('assert', assert)
    // maybe assert again to get alias, because only available after capture?
    // const assertAlias = await fetchSaferpay('/Payment/v1/PaymentPage/Assert', {
    //   Token,
    // })
    // console.log('assertAlias', assertAlias)
    // if (assertAlias.RegistrationResult?.Success) {
    //   const pspId = assert.RegistrationResult.Alias.Id
    //   const paymentSourceExists =
    //     !!(await transaction.public.paymentSources.findFirst({
    //       userId,
    //       pspId,
    //       method: 'SAFERPAY',
    //     }))
    //   if (!paymentSourceExists) {
    //     // save alias to user
    //     await transaction.public.paymentSources.insert({
    //       userId,
    //       method: 'SAFERPAY',
    //       pspId,
    //       pspPayload: assert.RegistrationResult,
    //     })
    //   }
    // }

    return {
      status: 'SUCCESSFUL',
    }
  } else if (Transaction.Type === 'CAPTURED') {
    return {
      status: 'SUCCESSFUL',
    }
  }

  logger.info('[Twint] Unexpected State', { pledgeId, paymentId }, assert)
  // ToDo: update payment? e.g. CANCELED set CANCELLED on payment?

  throw new Error(
    t(
      Transaction.Type === 'CANCELED'
        ? 'api/twint/deny'
        : 'api/twint/contactUs',
    ),
  )
}
