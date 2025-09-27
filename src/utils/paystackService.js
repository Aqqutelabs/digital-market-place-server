// utils/paystackService.js
const axios = require('axios');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { ObjectId } = mongoose.Types;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'dasdfasdfadf';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Create a payment session for an order
exports.createPaymentSession = async ({ amount, email, orderId, metadata }) => {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        amount: Math.round(amount * 100), // Convert to kobo and ensure integer
        email,
        metadata: { ...metadata, orderId },
        callback_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/v1/payments/verify`
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Create payment record
    const payment = await Payment.create({
      amount,
      reference: response.data.data.reference,
      orderId: new ObjectId(orderId),
      userId: new ObjectId(metadata.userId), // Store userId
      status: 'PENDING',
      metadata: response.data.data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return {
      ...response.data.data,
      paymentId: payment._id
    };
  } catch (error) {
    console.error('Paystack payment initialization error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to initialize payment: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
  }
};

// Verify payment and update order/payment status
exports.verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );
    const { status, metadata } = response.data.data;
    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { reference },
      {
        $set: {
          status: status === 'success' ? 'COMPLETED' : 'FAILED',
          gatewayResponse: response.data.data,
          processedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    if (!payment) throw new Error('Payment record not found');
    // If payment successful, update order
    if (status === 'success' && metadata && metadata.orderId) {
      await Order.findByIdAndUpdate(
        metadata.orderId,
        {
          $set: {
            paymentStatus: 'completed',
            orderStatus: 'completed',
            updatedAt: new Date()
          }
        }
      );
    }
    return payment;
  } catch (error) {
    throw new Error('Failed to verify payment');
  }
};

// Initiate a refund for a payment
exports.initiateRefund = async (reference, amount) => {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/refund`,
      {
        transaction: reference,
        amount: amount ? amount * 100 : undefined
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { reference },
      {
        $set: {
          status: 'REFUNDED',
          metadata: {
            ...response.data.data,
            refundedAt: new Date()
          },
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    if (!payment) throw new Error('Payment record not found');
    return response.data.data;
  } catch (error) {
    throw new Error('Failed to initiate refund');
  }
};

// Get payment history for a user
exports.getPaymentHistory = async (userId) => {
  if (!ObjectId.isValid(userId)) return [];
  return Payment.find({ userId: new ObjectId(userId) })
    .populate('orderId')
    .sort({ createdAt: -1 });
};

// Get all payments
exports.getAllPayments = async () => {
  return Payment.find({}).populate('orderId').sort({ createdAt: -1 });
};
