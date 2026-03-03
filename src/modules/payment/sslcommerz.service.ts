import axios from 'axios';
import config from '../../config';

export type ISSLCommerzPaymentData = {
  total_amount: number;
  currency: 'BDT';
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  shipping_method: 'Courier' | 'YES' | 'NO';
  product_name: string;
  product_category: string;
  product_profile: string;
  cus_name: string;
  cus_email: string;
  cus_add1: string;
  cus_city: string;
  cus_postcode: string;
  cus_country: string;
  cus_phone: string;
};

const initiatePayment = async (data: ISSLCommerzPaymentData) => {
  try {
    const isSandbox = config.ssl_is_sandbox === 'true';
    const baseUrl = isSandbox 
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

    const payload = {
      store_id: config.ssl_store_id,
      store_passwd: config.ssl_store_pass,
      ...data,
    };

    const response = await axios({
      method: 'post',
      url: baseUrl,
      data: payload,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      transformRequest: [(data: any) => {
        return Object.entries(data)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&');
      }],
    } as any);

    return response.data;
  } catch (error) {
    console.error('SSLCommerz Error:', error);
    throw error;
  }
};

const verifyPayment = async (val_id: string) => {
  try {
    const isSandbox = config.ssl_is_sandbox === 'true';
    const baseUrl = isSandbox
      ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
      : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

    const response = await axios({
      method: 'get',
      url: baseUrl,
      params: {
        val_id: val_id,
        store_id: config.ssl_store_id,
        store_passwd: config.ssl_store_pass,
        format: 'json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('SSLCommerz Verification Error:', error);
    throw error;
  }
};

const initiateRefund = async (data: {
  bank_tran_id: string;
  refund_amount: number;
  refund_remark: string;
}) => {
  try {
    const isSandbox = config.ssl_is_sandbox === 'true';
    const baseUrl = isSandbox
      ? 'https://sandbox.sslcommerz.com/validator/api/reFenD.php'
      : 'https://securepay.sslcommerz.com/validator/api/reFenD.php';

    const response = await axios({
      method: 'get',
      url: baseUrl,
      params: {
        ...data,
        store_id: config.ssl_store_id,
        store_passwd: config.ssl_store_pass,
        format: 'json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('SSLCommerz Refund Error:', error);
    throw error;
  }
};

const queryRefundStatus = async (refund_ref_id: string) => {
  try {
    const isSandbox = config.ssl_is_sandbox === 'true';
    const baseUrl = isSandbox
      ? 'https://sandbox.sslcommerz.com/validator/api/queryRefund.php'
      : 'https://securepay.sslcommerz.com/validator/api/queryRefund.php';

    const response = await axios({
      method: 'get',
      url: baseUrl,
      params: {
        refund_ref_id,
        store_id: config.ssl_store_id,
        store_passwd: config.ssl_store_pass,
        format: 'json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('SSLCommerz Refund Status Error:', error);
    throw error;
  }
};

export const SSLCommerzService = {
  initiatePayment,
  verifyPayment,
  initiateRefund,
  queryRefundStatus,
};
