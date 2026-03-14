const axios = require('axios');
const { PAYSTACK_SECRET_KEY } = require('../config/env');

const paystackAPI = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Create Dedicated Virtual Account for Author
const createDedicatedAccount = async (authorData) => {
  try {
    const response = await paystackAPI.post('/dedicated_account', {
      customer: authorData.email,
      preferred_bank: 'wema-bank',
      first_name: authorData.firstName,
      last_name: authorData.lastName,
      phone: authorData.phone
    });
    
    return {
      accountNumber: response.data.data.account_number,
      accountName: response.data.data.account_name,
      bankName: response.data.data.bank.name,
      bankCode: response.data.data.bank.code,
      customerId: response.data.data.customer.id
    };
  } catch (error) {
    console.error('Paystack dedicated account error:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Failed to create virtual account');
  }
};

// Create Subaccount for Settlement (20% commission)
const createSubaccount = async (authorData) => {
  try {
    const response = await paystackAPI.post('/subaccount', {
      business_name: authorData.fullName,
      settlement_bank: authorData.bankCode,
      account_number: authorData.accountNumber,
      percentage_charge: 20,
      description: `Author: ${authorData.displayName}`,
      primary_contact_email: authorData.email,
      primary_contact_name: authorData.fullName,
      primary_contact_phone: authorData.phone
    });
    
    return {
      subaccountCode: response.data.data.subaccount_code
    };
  } catch (error) {
    console.error('Paystack subaccount error:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Failed to create subaccount');
  }
};

// Get Nigerian Banks
const getBanks = async () => {
  try {
    const response = await paystackAPI.get('/bank?country=nigeria');
    return response.data.data;
  } catch (error) {
    throw new Error('Failed to fetch banks');
  }
};

// Verify Account Number
const verifyAccount = async (accountNumber, bankCode) => {
  try {
    const response = await paystackAPI.get(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
    return {
      accountName: response.data.data.account_name,
      accountNumber: response.data.data.account_number
    };
  } catch (error) {
    throw new Error('Invalid account number');
  }
};

// Initialize Payment with Split
const initializePayment = async (email, amount, bookId, subaccountCode) => {
  try {
    const response = await paystackAPI.post('/transaction/initialize', {
      email,
      amount: amount * 100,
      metadata: { bookId },
      subaccount: subaccountCode,
      transaction_charge: 0,
      bearer: 'account'
    });
    
    return {
      authorizationUrl: response.data.data.authorization_url,
      reference: response.data.data.reference
    };
  } catch (error) {
    throw new Error('Failed to initialize payment');
  }
};

// Verify Payment
const verifyPayment = async (reference) => {
  try {
    const response = await paystackAPI.get(`/transaction/verify/${reference}`);
    return response.data.data;
  } catch (error) {
    throw new Error('Failed to verify payment');
  }
};

module.exports = { 
  createDedicatedAccount, 
  createSubaccount, 
  getBanks, 
  verifyAccount, 
  initializePayment, 
  verifyPayment 
};
