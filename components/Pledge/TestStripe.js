import React, { useState, Fragment, useEffect } from 'react'
import {
  Field,
  colors,
  Interaction,
  Button,
  fontStyles,
  fontFamilies,
  Editorial,
  A,
  Label,
  mediaQueries
} from '@project-r/styleguide'
import withT from '../../lib/withT'
import isEmail from 'validator/lib/isEmail'
import Consents, { getConsentsError } from './Consents'
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
  PaymentRequestButtonElement
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_PUBLISHABLE_KEY_CONNECTED
} from '../../lib/constants'
import { css } from 'glamor'

import SignIn, { withSignIn } from '../Auth/SignIn'
import { withSignOut } from '../Auth/SignOut'
import withMe from '../../lib/apollo/withMe'
import gql from 'graphql-tag'
import { graphql, compose } from 'react-apollo'

// from components/Payment/Form.js
import * as PSPIcons from '../Payment/Icons/PSP'
import { format } from 'd3-format'
const pad2 = format('02')
const PAYMENT_METHOD_HEIGHT = 64
//

const OFFERS = [
  {
    package: 'ABO',
    label: 'Jährlich',
    price: 'CHF 240 pro Jahr',
    text:
      'Sie erhalten täglich eine bis drei neue Geschichten und werden Mitglied der Project R Genossenschaft. Und sicheren so die Zukunft der Republik.',
    submitPledgeProps: {
      total: 24000,
      options: [
        {
          amount: 1,
          periods: 1,
          price: 24000,
          templateId: '00000000-0000-0000-0008-000000000001',
          autoPay: true
        }
      ]
    },
    companyId: 'c0000000-0000-0000-0001-000000000001'
  },
  {
    package: 'MONTHLY_ABO',
    label: 'Monatlich',
    price: 'CHF 22 pro Monat',
    text:
      'Schön, dass Sie dabei sind. Sie erhalten täglich eine bis drei neue Geschichten.',
    submitPledgeProps: {
      total: 2000,
      options: [
        {
          amount: 1,
          periods: 1,
          price: 2000,
          templateId: '00000000-0000-0000-0008-000000000002',
          autoPay: true
        }
      ]
    },
    companyId: 'c0000000-0000-0000-0001-000000000002'
  },
  // test data to check if buying !subscription on COMPANY_TWO works
  {
    package: 'ABO_COMPANY_TWO',
    label: 'Halbjährlich',
    price: 'CHF 120 pro Halbjahr',
    text:
      'Schön, dass Sie dabei sind. Sie erhalten täglich eine bis drei neue Geschichten.',
    submitPledgeProps: {
      total: 12000,
      options: [
        {
          amount: 1,
          periods: 1,
          price: 12000,
          templateId: '00000000-0000-0000-0008-000000000020',
          autoPay: true
        }
      ]
    },
    companyId: 'c0000000-0000-0000-0001-000000000002'
  }
]

const styles = {
  label: css({
    color: '#B7C1BD',
    fontSize: 12,
    lineHeight: '13px',
    ...fontStyles.sansSerifRegular,
    marginBottom: 13,
    [mediaQueries.mUp]: {
      marginBottom: 9,
      fontSize: 14,
      lineHeight: '15px'
    }
  }),
  // from components/Payment/Form.js
  paymentMethod: css({
    fontFamily: fontFamilies.sansSerifMedium,
    fontSize: 14,
    color: '#000',
    display: 'inline-block',
    backgroundColor: '#fff',
    border: `1px solid ${colors.secondary}`,
    height: PAYMENT_METHOD_HEIGHT - 2, // 2px borders
    padding: 10,
    cursor: 'pointer',
    marginRight: 10,
    marginBottom: 10,
    lineHeight: 0,
    verticalAlign: 'top',
    '& input': {
      display: 'none'
    }
  }),
  paymentMethodText: css({
    lineHeight: '40px',
    verticalAlign: 'middle'
  }),
  paymentMethodSourceText: css({
    display: 'inline-block',
    paddingLeft: 15,
    paddingRight: 10,
    lineHeight: '20px',
    verticalAlign: 'middle'
  }),
  paymentMethodHiddenText: css({
    position: 'absolute',
    left: -10000,
    top: 'auto'
  })
  //
}

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY, {
  apiVersion: '2020-08-27'
})

const stripeClients = [
  {
    companyId: 'c0000000-0000-0000-0001-000000000001',
    client: stripePromise
  },
  {
    companyId: 'c0000000-0000-0000-0001-000000000002',
    client: loadStripe(STRIPE_PUBLISHABLE_KEY_CONNECTED)
  }
]
const getLoadedStripeClientForCompany = async ({ companyId }) => {
  // get stripe client belonging to company of package
  const stripeClient = stripeClients.find(c => c.companyId === companyId).client

  const loadedStripeClient = await stripeClient
  return loadedStripeClient
}

const Join = ({
  t,
  black,
  start,
  submit,
  pay,
  addPaymentMethod,
  me,
  stripePaymentMethods
}) => {
  const [currentOffer, setOffer] = useState(OFFERS[0])

  return (
    <Elements
      stripe={stripePromise}
      fonts={[
        {
          family: fontStyles.sansSerifRegular.fontFamily,
          weight: fontStyles.sansSerifRegular.fontWeight,
          src:
            'https://cdn.repub.ch/s3/republik-assets/fonts/gt-america-standard-regular.woff)'
        }
      ]}
    >
      <Interaction.H1 id='join' style={{ marginBottom: 15 }}>
        Abonnentin und Mitglied werden
      </Interaction.H1>
      <Interaction.P
        style={{ fontSize: 17, lineHeight: '26px', marginBottom: 20 }}
      >
        Unabhängiger Journalismus kostet. Die Republik ist werbefrei und wird
        finanziert von ihren Leserinnen.{' '}
        {!start && (
          <Editorial.A href='/'>Mehr Informationen zur Republik.</Editorial.A>
        )}
      </Interaction.P>
      {OFFERS.map(offer => {
        const isSelected = offer.package === currentOffer.package
        return (
          <div
            key={offer.package}
            style={{
              borderBottom: isSelected
                ? `2px solid ${black ? '#000' : colors.primary}`
                : '2px solid transparent',
              marginRight: 15,
              marginBottom: 10,
              paddingBottom: 5,
              float: 'left',
              fontSize: 22,
              ...(isSelected && fontStyles.sansSerifMedium),
              cursor: isSelected ? 'default' : 'pointer'
            }}
            onClick={e => {
              e.preventDefault()
              setOffer(offer)
            }}
          >
            {offer.label}
          </div>
        )
      })}
      <br style={{ clear: 'both' }} />
      <Interaction.P style={{ fontSize: 17, lineHeight: '26px' }}>
        {currentOffer.text}
      </Interaction.P>
      <Form
        t={t}
        black={black}
        start={start}
        submit={submit}
        pay={pay}
        addPaymentMethod={addPaymentMethod}
        me={me}
        stripePaymentMethods={stripePaymentMethods}
        currentOffer={currentOffer}
      />
    </Elements>
  )
}

const Form = ({
  t,
  black,
  start,
  submit,
  pay,
  addPaymentMethod,
  me,
  stripePaymentMethods,
  currentOffer
}) => {
  const [emailState, setEmailState] = useState({ value: me?.email || '' })
  const [consents, setConsents] = useState([])
  const [currentStripePaymentMethod, setStripePaymentMethod] = useState()
  const stripe = useStripe()
  const elements = useElements()

  const getPaymentMethodId = async () => {
    let paymentMethodId
    if (currentStripePaymentMethod) {
      console.log('using existing card')
      paymentMethodId = currentStripePaymentMethod.id
    } else {
      console.log('using new card')
      await stripe
        .createPaymentMethod({
          type: 'card',
          card: elements.getElement(CardElement)
        })
        .then(result => {
          if (result.error) {
            console.error(result.error)
            alert(`createPaymentMethod: ${result.error.message}`)
          } else {
            paymentMethodId = result.paymentMethod.id
            console.log(`new PaymentMethod created ${paymentMethodId}`)
          }
        })
    }
    return paymentMethodId
  }

  // uses currentOffer and email from context
  const submitAndPay = async ({ paymentMethodId }) => {
    console.log('submiting...')
    return submit({
      ...currentOffer.submitPledgeProps,
      user: {
        firstName: 'Patrick',
        lastName: 'Tester',
        email: emailState.value
      },
      consents: ['PRIVACY', 'TOS', 'STATUTE'],
      payload: {}
    }).then(({ data: submitData }) => {
      console.log('submitPledge success!', submitData)

      console.log('paying...')
      return pay({
        pledgeId: submitData.submitPledge.pledgeId,
        method: 'STRIPE',
        stripePlatformPaymentMethodId: paymentMethodId
      }).then(({ data: payData }) => {
        console.log('payPledge success!', payData)

        return {
          submitPledge: submitData.submitPledge,
          payPledge: payData.payPledge
        }
      })
    })
  }

  return (
    <form style={{ display: 'block', minHeight: 1000 }}>
      <Field
        black={black}
        name='email'
        type='email'
        label={t('pledge/contact/email/label')}
        error={emailState.dirty && emailState.error}
        onChange={(_, value, shouldValidate) => {
          setEmailState(state => ({
            ...state,
            value,
            dirty: shouldValidate,
            error:
              (value.trim().length <= 0 &&
                t('pledge/contact/email/error/empty')) ||
              (!isEmail(value) && t('pledge/contact/email/error/invalid'))
          }))
        }}
        value={emailState.value}
      />
      <div
        style={{
          borderBottom: `1px solid ${black ? 'black' : colors.disabled}`,
          paddingTop: 5,
          paddingBottom: 5,
          marginBottom: 20
        }}
      >
        <div {...styles.label}>Ihre Kreditkarte eingeben...</div>
        <CardElement
          options={{
            hidePostalCode: true,
            // iconStyle: 'solid',
            style: {
              base: {
                fontSize: '22px',
                ...fontStyles.sansSerifRegular,
                color: colors.text,
                // borderBottom: '1px solid black',
                '::placeholder': {
                  color: colors.disabled
                },
                ':disabled': {
                  color: colors.disabled
                }
              },
              invalid: {
                color: colors.error
              }
            }
          }}
        />
        {stripePaymentMethods?.length && (
          <Fragment>
            <Label>...oder eine gespeicherte Kreditkarte auswählen</Label>
            <br />
            {stripePaymentMethods.map((stripePaymentMethod, i) => {
              const Icon =
                (stripePaymentMethod.card.brand === 'Visa' && (
                  <PSPIcons.Visa />
                )) ||
                (stripePaymentMethod.card.brand === 'MasterCard' && (
                  <PSPIcons.Mastercard />
                ))

              return (
                <label
                  key={i}
                  {...styles.paymentMethod}
                  style={{
                    opacity:
                      currentStripePaymentMethod?.id === stripePaymentMethod.id
                        ? 1
                        : 0.4
                  }}
                >
                  <input
                    type='radio'
                    name='paymentMethod'
                    onChange={event => {
                      event.preventDefault()
                      const value = event.target.value
                      setStripePaymentMethod(
                        stripePaymentMethods.find(pm => pm.id === value)
                      )
                    }}
                    value={stripePaymentMethod.id}
                    checked={
                      currentStripePaymentMethod?.id === stripePaymentMethod.id
                    }
                  />
                  {Icon && Icon}
                  {Icon && (
                    <span {...styles.paymentMethodHiddenText}>
                      {stripePaymentMethod.card.brand}
                    </span>
                  )}
                  <span {...styles.paymentMethodSourceText}>
                    {!Icon && stripePaymentMethod.card.brand}
                    {'**** '}
                    {stripePaymentMethod.card.last4}
                    <br />
                    {pad2(stripePaymentMethod.card.expMonth)}/
                    {stripePaymentMethod.card.expYear}
                  </span>
                </label>
              )
            })}
            <br />
          </Fragment>
        )}
      </div>
      <Button
        block
        primary
        black={black}
        style={black ? { backgroundColor: 'black', color: 'white' } : undefined}
        onClick={async e => {
          e.preventDefault()

          console.log(`let's go...`)

          const paymentMethodId = await getPaymentMethodId()

          if (!paymentMethodId) {
            return
          }

          console.log('adding paymentMethod...')
          addPaymentMethod({
            stripePlatformPaymentMethodId: paymentMethodId,
            companyId: currentOffer.companyId
          }).then(async result => {
            console.log('addPaymentMethod success!', result)

            const { stripeClientSecret } = result.data.addPaymentMethod

            if (stripeClientSecret) {
              // get stripe client belonging to company of package
              const stripeClient = await getLoadedStripeClientForCompany({
                companyId: currentOffer.companyId
              })

              console.log('confirmCardSetup...')
              const confirmResult = await stripeClient.confirmCardSetup(
                stripeClientSecret
              )

              const { paymentIntent, error } = confirmResult
              if (error) {
                console.warn(error)
                alert(`confirmCardSetup ${error.message}`)
                return
              }
              console.log('stripeClientSecret confirmed')
            }
          })
        }}
      >
        Only AddPaymentMethod
      </Button>
      <br />
      <Button
        block
        primary
        black={black}
        style={black ? { backgroundColor: 'black', color: 'white' } : undefined}
        onClick={async e => {
          e.preventDefault()

          if (!emailState.value?.length) {
            alert('email missing')
            return
          }

          const paymentMethodId = await getPaymentMethodId()
          if (!paymentMethodId) {
            return
          }

          const {
            payPledge: { stripeClientSecret }
          } = await submitAndPay({
            paymentMethodId
          })

          if (stripeClientSecret) {
            // get stripe client belonging to company of package
            const stripeClient = await getLoadedStripeClientForCompany({
              companyId: currentOffer.companyId
            })

            console.log('confirmCardPayment...')
            const confirmResult = await stripeClient.confirmCardPayment(
              stripeClientSecret
            )

            const { paymentIntent, error } = confirmResult
            if (error) {
              console.warn(error)
              alert(`confirmCardPayment: ${error.message}`)
              return
            }
            console.log('paymentConfirmed')
          }

          console.log('finished')
        }}
      >
        Pledge: {currentOffer.price}
      </Button>
      <br />
      <CheckoutForm
        // This is a workarround to rerender the PaymentRequestButtonElement
        // if the currentOffer changes.
        // On updating the paymentRequest of the button:
        // https://github.com/stripe/react-stripe-elements/issues/284
        key={currentOffer.label}
        currentOffer={currentOffer}
        submitAndPay={submitAndPay}
      />
    </form>
  )
}

// https://stripe.com/docs/stripe-js/elements/payment-request-button#html-js-testing
const CheckoutForm = ({ currentOffer, submitAndPay }) => {
  const stripe = useStripe()
  const [paymentRequest, setPaymentRequest] = useState(null)

  useEffect(() => {
    if (stripe && currentOffer) {
      const pr = stripe.paymentRequest({
        country: 'CH',
        currency: 'chf',
        total: {
          label: currentOffer.label,
          amount: currentOffer.submitPledgeProps.total
        },
        requestPayerName: false,
        requestPayerEmail: false,
        requestShipping: false
      })

      // Check the availability of the Payment Request API.
      pr.canMakePayment().then(result => {
        if (result) {
          setPaymentRequest(pr)
        }
      })

      pr.on('paymentmethod', async ev => {
        const paymentMethodId = ev.paymentMethod.id

        const {
          payPledge: { stripeClientSecret }
        } = await submitAndPay({
          paymentMethodId
        })

        if (stripeClientSecret) {
          // get stripe client belonging to company of package
          const stripeClient = await getLoadedStripeClientForCompany({
            companyId: currentOffer.companyId
          })

          // Confirm the PaymentIntent without handling potential next actions (yet).
          const {
            paymentIntent,
            error: confirmError
          } = await stripeClient.confirmCardPayment(
            stripeClientSecret,
            {},
            { handleActions: false }
          )

          if (confirmError) {
            // Report to the browser that the payment failed, prompting it to
            // re-show the payment interface, or show an error message and close
            // the payment interface.
            ev.complete('fail')
            console.log({ confirmError })
          } else {
            // Report to the browser that the confirmation was successful, prompting
            // it to close the browser payment method collection interface.
            ev.complete('success')
            // Check if the PaymentIntent requires any actions and if so let Stripe.js
            // handle the flow. If using an API version older than "2019-02-11" instead
            // instead check for: `paymentIntent.status === "requires_source_action"`.
            if (paymentIntent.status === 'requires_action') {
              // Let Stripe.js handle the rest of the payment flow.
              const { error } = await stripeClient.confirmCardPayment(
                stripeClientSecret
              )
              if (error) {
                console.log({ error })
                alert(`confirmCardPayment: ${error.message}`)
                // The payment failed -- ask your customer for a new payment method.
              } else {
                console.log('paymentIntent requires_action success')
                // The payment has succeeded.
              }
            } else {
              console.log('paymentIntent success')
              // The payment has succeeded.
            }
          }
        } else {
          ev.complete('success')
        }
      })
    }
  }, [stripe, currentOffer])

  if (paymentRequest) {
    return <PaymentRequestButtonElement options={{ paymentRequest }} />
  }

  return <p>paymentRequest not available</p>
}

export const myPaymentMethodsQuery = gql`
  query myPaymentMethods($accessToken: ID) {
    me(accessToken: $accessToken) {
      id
      stripePaymentMethods {
        id
        isDefault
        card {
          brand
          last4
          expMonth
          expYear
          isExpired
        }
      }
    }
  }
`

const submitPledge = gql`
  mutation submitPledge(
    $total: Int!
    $options: [PackageOptionInput!]!
    $user: UserInput!
    $reason: String
    $messageToClaimers: String
    $consents: [String!]
    $accessToken: ID
    $payload: JSON
  ) {
    submitPledge(
      pledge: {
        total: $total
        options: $options
        user: $user
        reason: $reason
        messageToClaimers: $messageToClaimers
        accessToken: $accessToken
        payload: $payload
      }
      consents: $consents
    ) {
      pledgeId
      userId
      emailVerify
      pfAliasId
      pfSHA
    }
  }
`

const payPledge = gql`
  mutation payPledge(
    $pledgeId: ID!
    $method: PaymentMethod!
    $sourceId: String
    $stripePlatformPaymentMethodId: ID
    $pspPayload: JSON
    $address: AddressInput
    $paperInvoice: Boolean
    $makeDefault: Boolean
  ) {
    payPledge(
      pledgePayment: {
        pledgeId: $pledgeId
        method: $method
        sourceId: $sourceId
        stripePlatformPaymentMethodId: $stripePlatformPaymentMethodId
        makeDefault: $makeDefault
        pspPayload: $pspPayload
        address: $address
        paperInvoice: $paperInvoice
      }
    ) {
      pledgeId
      userId
      emailVerify
      stripeClientSecret
    }
  }
`

const addPaymentMethodQuery = gql`
  mutation addPaymentMethod(
    $stripePlatformPaymentMethodId: ID!
    $companyId: ID!
  ) {
    addPaymentMethod(
      stripePlatformPaymentMethodId: $stripePlatformPaymentMethodId
      companyId: $companyId
    ) {
      stripeClientSecret
    }
  }
`

export const withPay = Component => {
  const EnhancedComponent = compose(
    graphql(payPledge, {
      props: ({ mutate }) => ({
        pay: variables => {
          return mutate({
            variables,
            refetchQueries: [{ query: myPaymentMethodsQuery }]
          })
        }
      })
    }),
    withSignIn
  )(Component)
  return props => <EnhancedComponent {...props} />
}

const JoinWithMutations = compose(
  graphql(addPaymentMethodQuery, {
    props: ({ mutate }) => ({
      addPaymentMethod: variables => {
        return mutate({
          variables,
          refetchQueries: [{ query: myPaymentMethodsQuery }]
        })
      }
    })
  }),
  graphql(submitPledge, {
    props: ({ mutate }) => ({
      submit: variables => {
        return mutate({
          variables
        })
      }
    })
  }),
  graphql(myPaymentMethodsQuery, {
    withRef: true,
    options: ({ accessToken }) => ({
      fetchPolicy: 'network-only',
      ssr: false,
      variables: { accessToken }
    }),
    props: ({ data }) => ({
      stripePaymentMethods: data.me && data.me.stripePaymentMethods,
      loadingStripePaymentMethods: data.loading
    })
  }),
  withSignOut,
  withPay,
  withMe,
  withT
)(Join)

export default JoinWithMutations
