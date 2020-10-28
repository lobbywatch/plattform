const getStripeClients = require('./clients')
const getPaymentMethodForCompany = require('./getPaymentMethodForCompany')

// paymentMethod(Id) is expected to be in company(Id)
module.exports = async ({
  userId,
  companyId,
  platformPaymentMethodId,
  total,
  pledgeId,
  metadata = {},
  confirm = false,
  pgdb,
  clients, // optional
  t,
}) => {
  const { accountForCompanyId } = clients || (await getStripeClients(pgdb))

  const paymentMethodId = await getPaymentMethodForCompany({
    userId,
    companyId,
    platformPaymentMethodId,
    pgdb,
    clients,
    t,
  }).then((pm) => pm.id)

  // the paymentIntent needs to be created on the account of the company
  const { stripe } = accountForCompanyId(companyId)
  if (!stripe) {
    throw new Error(`could not find account for companyId: ${companyId}`)
  }

  const customer = await pgdb.public.stripeCustomers.findOne({
    userId,
    companyId,
  })
  if (!customer) {
    throw new Error(
      `could not find stripeCustomers for userId: ${userId} and companyId: ${companyId}`,
    )
  }

  // customer needs to be attached to PaymentIntent
  // otherwise she can't use her saved paymentMethods
  return stripe.paymentIntents.create({
    amount: total,
    customer: customer.id,
    payment_method: paymentMethodId,
    metadata: {
      pledgeId,
      ...metadata,
    },
    confirm,
    setup_future_usage: 'off_session',
    currency: 'chf',
  })
}
