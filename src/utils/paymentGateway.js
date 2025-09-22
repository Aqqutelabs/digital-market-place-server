// utils/paymentGateway.js
const AppError = require('./appError'); // Assuming you have an AppError utility

exports.processPayment = async (paymentMethod, amount, currency, token = null, billingInfo) => {
  // Simulate network delay for payment processing
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log(`--- Payment Gateway Mock ---`);
  console.log(`Attempting to process ${amount} ${currency} via ${paymentMethod}`);
  console.log(`Billing Information:`, billingInfo);
  // `token` would be a card token or similar from the frontend for some gateways

  // Basic validation
  if (amount <= 0) {
    console.error('Payment simulation: Amount must be positive');
    throw new AppError('Payment amount must be positive.', 400);
  }


  const transactionId = `${paymentMethod.toLowerCase()}_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`Payment successful! Mock Transaction ID: ${transactionId}`);

  return {
    status: 'success',
    transactionId: transactionId,
    message: 'Payment processed successfully.'
  };
};