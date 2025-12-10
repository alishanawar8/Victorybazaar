const axios = require('axios');

// Razorpay Integration
exports.createRazorpayOrder = async (order, payment) => {
    try {
        const Razorpay = require('razorpay');
        
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const options = {
            amount: Math.round(order.total * 100), // Paise mein convert
            currency: 'INR',
            receipt: `receipt_${order.orderId}`,
            notes: {
                orderId: order.orderId,
                paymentId: payment.paymentId
            }
        };

        const razorpayOrder = await razorpay.orders.create(options);

        return {
            success: true,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            paymentLink: null // Razorpay mein payment link alag se generate karna padta hai
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

// Stripe Integration
exports.createStripePayment = async (order, payment) => {
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(order.total * 100), // Cents mein convert
            currency: 'inr',
            metadata: {
                orderId: order.orderId,
                paymentId: payment.paymentId
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return {
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

// PayPal Integration
exports.createPaypalOrder = async (order, payment) => {
    try {
        // PayPal API credentials
        const auth = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString('base64');

        const response = await axios.post(
            `${process.env.PAYPAL_API_URL}/v2/checkout/orders`,
            {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value: (order.total / 83).toFixed(2) // INR to USD approx
                        },
                        reference_id: order.orderId,
                        description: `Payment for Order ${order.orderId}`
                    }
                ],
                payment_source: {
                    paypal: {
                        experience_context: {
                            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
                            brand_name: 'Victory Bazaar',
                            locale: 'en-US',
                            landing_page: 'LOGIN',
                            user_action: 'PAY_NOW',
                            return_url: `${process.env.FRONTEND_URL}/payment/success`,
                            cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
                        }
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const paypalOrder = response.data;

        return {
            success: true,
            orderId: paypalOrder.id,
            paymentLink: paypalOrder.links.find(link => link.rel === 'approve').href
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

// PhonePe Integration
exports.createPhonePeOrder = async (order, payment) => {
    try {
        const merchantId = process.env.PHONEPE_MERCHANT_ID;
        const saltKey = process.env.PHONEPE_SALT_KEY;
        const saltIndex = process.env.PHONEPE_SALT_INDEX;

        const payload = {
            merchantId: merchantId,
            merchantTransactionId: payment.paymentId,
            amount: Math.round(order.total * 100), // Paise mein
            merchantUserId: `USER_${payment.user}`,
            redirectUrl: `${process.env.FRONTEND_URL}/payment/callback`,
            redirectMode: 'POST',
            callbackUrl: `${process.env.BACKEND_URL}/api/payments/webhook/phonepe`,
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };

        // Base64 encode payload
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

        // Generate signature
        const crypto = require('crypto');
        const signature = crypto
            .createHash('sha256')
            .update(base64Payload + '/pg/v1/pay' + saltKey)
            .digest('hex') + '###' + saltIndex;

        const response = await axios.post(
            'https://api.phonepe.com/apis/hermes/pg/v1/pay',
            {
                request: base64Payload
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': signature
                }
            }
        );

        const phonePeResponse = response.data;

        return {
            success: true,
            paymentLink: phonePeResponse.data.instrumentResponse.redirectInfo.url
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

// Verify Payment (Generic)
exports.verifyPayment = async (payment, gatewayData) => {
    try {
        switch (payment.paymentGateway) {
            case 'razorpay':
                return await verifyRazorpayPayment(payment, gatewayData);
            case 'stripe':
                return await verifyStripePayment(payment, gatewayData);
            case 'paypal':
                return await verifyPaypalPayment(payment, gatewayData);
            case 'phonepe':
                return await verifyPhonePePayment(payment, gatewayData);
            default:
                return { success: true, data: {} };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

// Razorpay Verification
async function verifyRazorpayPayment(payment, gatewayData) {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = gatewayData;

    const crypto = require('crypto');
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        return {
            success: true,
            data: {
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                signature: razorpay_signature
            }
        };
    } else {
        return {
            success: false,
            error: 'Invalid signature'
        };
    }
}

// Stripe Verification
async function verifyStripePayment(payment, gatewayData) {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const paymentIntent = await stripe.paymentIntents.retrieve(gatewayData.paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
        return {
            success: true,
            data: {
                paymentId: paymentIntent.id
            }
        };
    } else {
        return {
            success: false,
            error: `Payment failed: ${paymentIntent.status}`
        };
    }
}

// PayPal Verification
async function verifyPaypalPayment(payment, gatewayData) {
    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
        `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${gatewayData.orderId}/capture`,
        {},
        {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        }
    );

    const captureData = response.data;

    if (captureData.status === 'COMPLETED') {
        return {
            success: true,
            data: {
                paymentId: captureData.purchase_units[0].payments.captures[0].id,
                orderId: captureData.id
            }
        };
    } else {
        return {
            success: false,
            error: `Payment status: ${captureData.status}`
        };
    }
}

// PhonePe Verification
async function verifyPhonePePayment(payment, gatewayData) {
    // PhonePe verification logic
    // Typically done via webhook
    return {
        success: true,
        data: gatewayData
    };
}

// Capture Payment
exports.capturePayment = async (payment) => {
    // Gateway specific capture logic
    return { success: true, data: {} };
};

// Process Refund
exports.processRefund = async (payment, amount, reason) => {
    // Gateway specific refund logic
    return { 
        success: true, 
        refundId: `REF${Date.now()}` 
    };
};