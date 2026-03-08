import { sendEmail } from '../../helpers/nodeMailer';
import config from '../../config';

const sendOrderConfirmationEmail = async (to: string, orderDetails: any) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
      <h2 style="color: #333; text-align: center;">Order Confirmed!</h2>
      <p>Hello ${orderDetails.userName},</p>
      <p>Thank you for your order. We've received it and are preparing it for shipment.</p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Order ID:</strong> #${orderDetails.orderId}</p>
        <p><strong>Total Amount:</strong> ${orderDetails.payableAmount} BDT</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #ddd;">
            <th style="text-align: left; padding: 10px;">Item</th>
            <th style="text-align: right; padding: 10px;">Qty</th>
            <th style="text-align: right; padding: 10px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${orderDetails.items.map((item: any) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px;">${item.productTitle} (${item.flavorName || ''} - ${item.sizeName || ''})</td>
              <td style="text-align: right; padding: 10px;">${item.quantity}</td>
              <td style="text-align: right; padding: 10px;">${item.price} BDT</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="text-align: right; margin-top: 15px;">
        <p>Discount: -${orderDetails.discountAmount} BDT</p>
        <p>Delivery Charge: +${orderDetails.deliveryCharge} BDT</p>
        <h3 style="color: #2c3e50;">Grand Total: ${orderDetails.payableAmount} BDT</h3>
      </div>
      <p style="font-size: 12px; color: #777; margin-top: 30px; text-align: center;">
        If you have any questions, please contact our support at ${config.softograph_email}.
      </p>
    </div>
  `;

  await sendEmail(to, html, `Order Confirmation - #${orderDetails.orderId}`);
};

const sendAdminOrderAlert = async (orderDetails: any) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>New Order Received!</h2>
      <p>A new order has been placed on the store.</p>
      <ul>
        <li><strong>Order ID:</strong> #${orderDetails.orderId}</li>
        <li><strong>Customer:</strong> ${orderDetails.userName} (${orderDetails.userEmail})</li>
        <li><strong>Total Amount:</strong> ${orderDetails.payableAmount} BDT</li>
      </ul>
      <p><a href="${config.admin_client_url}/orders/${orderDetails.orderId}" style="background: #3498db; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order in Admin Panel</a></p>
    </div>
  `;

  await sendEmail(config.softograph_email as string, html, `NEW ORDER - #${orderDetails.orderId}`);
};

const sendPaymentSuccessEmail = async (to: string, orderDetails: any) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
      <h2 style="color: #27ae60; text-align: center;">Payment Successful!</h2>
      <p>Hello ${orderDetails.userName},</p>
      <p>We've successfully processed your payment for Order #${orderDetails.orderId}. Your order is now being processed for delivery.</p>
      <div style="background: #f0fdf4; border: 1px solid #cefad0; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Transaction ID:</strong> ${orderDetails.transactionId}</p>
        <p><strong>Amount Paid:</strong> ${orderDetails.payableAmount} BDT</p>
      </div>
      <p style="text-align: center; margin-top: 30px;">
        <a href="${config.frontend_url}/account/orders" style="color: #3498db;">Track your order status here</a>
      </p>
    </div>
  `;

  await sendEmail(to, html, `Payment Success - Order #${orderDetails.orderId}`);
};

export const NotificationService = {
  sendOrderConfirmationEmail,
  sendAdminOrderAlert,
  sendPaymentSuccessEmail,
};
