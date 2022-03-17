import { useEffect, useState } from 'react'
import {
  Stripe,
  PaymentRequest,
  PaymentRequestOptions,
  PaymentRequestPaymentMethodEvent,
  PaymentRequestWallet,
} from '@stripe/stripe-js'
import { loadStripe } from '../stripe'
import { makePaymentRequestOptions } from './PaymentRequestOption.helper'
import track from '../../../lib/matomo'
import { v4 } from 'uuid'

export enum WalletPaymentMethod {
  APPLE_PAY = 'STRIPE-WALLET-APPLE-PAY',
  GOOGLE_PAY = 'STRIPE-WALLET-GOOGLE-PAY',
}

function getPaymentRequestWalletValue(
  wallet: WalletPaymentMethod,
): PaymentRequestWallet {
  switch (wallet) {
    case WalletPaymentMethod.APPLE_PAY:
      return 'applePay'
    case WalletPaymentMethod.GOOGLE_PAY:
      return 'googlePay'
    default:
      return null
  }
}

export enum PaymentRequestStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READY = 'READY',
  SHOWING = 'SHOWING',
  CANCELED = 'CANCELED',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  UNAVAILABLE = 'UNAVAILABLE',
}

type LeanPaymentRequestOptions = Pick<PaymentRequestOptions, 'total'>

type PaymentHandler = (event: PaymentRequestPaymentMethodEvent) => Promise<void>
type PaymentCanceledHandler = () => void

interface PaymentRequestValues {
  status: PaymentRequestStatus
  initialize: (wallet: WalletPaymentMethod) => Promise<PaymentRequestStatus>
  show: (
    handlePayment: PaymentHandler,
    handleCancel: PaymentCanceledHandler,
  ) => void
  usedWallet: WalletPaymentMethod
}

/**
 * Hook used to wrap a Stripe.js payment-request object
 * Upon the first initialization stripe is lazy-loaded.
 *
 * @param options used to initialize the payment request
 */
function usePaymentRequest(
  options: LeanPaymentRequestOptions,
): PaymentRequestValues {
  const [paymentRequestID] = useState(v4())
  const [stripe, setStripe] = useState<Stripe>(null)
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest>(null)
  const [status, setStatus] = useState<PaymentRequestStatus>(
    PaymentRequestStatus.IDLE,
  )

  const [usedWallet, setUsedWallet] = useState<WalletPaymentMethod>(null)
  const [lastOptions, setLastOptions] =
    useState<LeanPaymentRequestOptions>(null)

  useEffect(() => {
    // In case the input options have changed (f.e. shipping address is now required)
    // Reinitialize the payment request
    if (
      paymentRequest &&
      JSON.stringify(lastOptions) !== JSON.stringify(options)
    ) {
      setLastOptions(options)
      initializePaymentRequest(usedWallet)
    }
  }, [paymentRequest, lastOptions, options])

  async function createPaymentRequest(
    wallet: WalletPaymentMethod,
  ): Promise<PaymentRequestStatus> {
    let stripePromise = stripe
    if (!stripe) {
      const globalStripePromise = await loadStripe()
      setStripe(globalStripePromise)
      stripePromise = globalStripePromise
    }

    const newPaymentRequest = await stripePromise.paymentRequest(
      makePaymentRequestOptions(options, getPaymentRequestWalletValue(wallet)),
    )

    // Track used options to prevent useless re-initializations
    setLastOptions(options)
    // Track the wallet in case the previous payment request was initialized with a different one
    setUsedWallet(wallet)

    const canMakePaymentResult = await newPaymentRequest.canMakePayment()

    if (!canMakePaymentResult) {
      setStatus(PaymentRequestStatus.UNAVAILABLE)
      track([
        `payment-request ${paymentRequestID} initialization failed`,
        `wallet-type: ${wallet}`,
        `options: ${JSON.stringify(options)}`,
      ])
      return PaymentRequestStatus.UNAVAILABLE
    }

    setPaymentRequest(newPaymentRequest)
    setStatus(PaymentRequestStatus.READY)
    track([
      `payment-request ${paymentRequestID} initialization successful`,
      `wallet-type: ${wallet}`,
      `options: ${JSON.stringify(options)}`,
    ])
    return PaymentRequestStatus.READY
  }

  async function initializePaymentRequest(
    wallet: WalletPaymentMethod,
  ): Promise<PaymentRequestStatus> {
    setStatus(PaymentRequestStatus.LOADING)
    return createPaymentRequest(wallet)
  }

  function show(
    handlePayment: PaymentHandler,
    handleCancel: PaymentCanceledHandler,
  ) {
    if (!paymentRequest || paymentRequest.isShowing()) {
      return
    }

    paymentRequest.on('paymentmethod', (ev) => {
      handlePayment(ev)
        .then(() => {
          ev.complete('success')
          setStatus(PaymentRequestStatus.SUCCEEDED)
          track([
            `payment-request ${paymentRequestID} payment succeeded`,
            `wallet-type: ${usedWallet}`,
            `options: ${JSON.stringify(options)}`,
          ])
        })
        .catch((err) => {
          ev.complete('fail')
          setStatus(PaymentRequestStatus.FAILED)
          track([
            `payment-request ${paymentRequestID} payment failed`,
            `wallet-type: ${usedWallet}`,
            `options: ${JSON.stringify(options)}`,
          ])
        })
    })

    paymentRequest.on('cancel', () => {
      setStatus(PaymentRequestStatus.CANCELED)
      setPaymentRequest(null)
      handleCancel()

      // The result of the following reinitialization is ignored
      // since we can only get to this point if it was successful before
      createPaymentRequest(usedWallet)
    })

    paymentRequest.show()
    setStatus(PaymentRequestStatus.SHOWING)
  }

  return {
    status,
    initialize: initializePaymentRequest,
    show,
    usedWallet,
  }
}

export default usePaymentRequest
