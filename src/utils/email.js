// utils/email.js
const { Resend } = require('resend');
const pug = require('pug'); // For HTML email templates (optional, but good practice)
const { htmlToText } = require('html-to-text'); // For converting HTML to plain text

// Export the Email class and sendCouponEmail function together
const Email = module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.fullName.split(' ')[0];
    this.url = url;
    this.from = 'WiderNetFarms Support <noreply@data.widernetfarms.org>';
  }

  async sendEmail({ to, subject, html }) {
    const resend = new Resend('re_9tZmVBVQ_2ow1XSBKtDFaVPnBhPqSfk1r');
    try {
      const response = await resend.emails.send({
      from: this.from,
      to,
      subject,
      html
    });
    console.log("Resend response:", response);
      console.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      // Optionally, you can throw the error to handle it upstream
      // throw error;
    }
  }

  // Send the actual email
  async send(template, subject) {
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject
    });
    await this.sendEmail({ to: this.to, subject, html });
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to WiderNetFarms!');
  }

  async sendEmailVerification(code) {
    // We'll pass the code directly if not using a URL link
    // For simplicity, for email verification we'll use a direct code as shown in the UI
    // If using a URL, the template would be 'emailVerification' and url would contain the token
    const html = pug.renderFile(`${__dirname}/../views/email/emailVerification.pug`, {
      firstName: this.firstName,
      code: code, // Pass the verification code directly
      url: this.url, // In case we need it for an alternative "click here" link
      subject: 'Verify Your Email Address'
    });

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: 'Verify Your Email Address',
      html,
      text: htmlToText(html)
    };
  await this.sendEmail({ to: this.to, subject: 'Verify Your Email Address', html });
  }

  async sendPasswordReset(code) {
    // Send a 4-digit code for password reset
    const html = pug.renderFile(`${__dirname}/../views/email/passwordReset.pug`, {
      firstName: this.firstName,
      code: code,
      subject: 'Your Password Reset Code'
    });

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: 'Your Password Reset Code',
      html,
      text: htmlToText(html)
    };
  await this.sendEmail({ to: this.to, subject: 'Your Password Reset Code', html });
  }
};

module.exports.sendCouponEmail = async (userEmail, couponCode, couponValue, couponType, expiryDate, extra = {}) => {
  const expiryString = expiryDate ? new Date(expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const discountDescription = couponType === 'percentage' ? `${couponValue}% off` : `NGN ${couponValue.toFixed(2)} off`;

  let productDetails = '';
  if (extra.productNames) {
    productDetails += `<p><strong>Products:</strong> ${extra.productNames}</p>`;
  }
  if (extra.orderId) {
    productDetails += `<p><strong>Order ID:</strong> ${extra.orderId}</p>`;
  }
  if (extra.totalAmount) {
    productDetails += `<p><strong>Order Total:</strong> NGN ${extra.totalAmount.toLocaleString()}</p>`;
  }

  const subject = `Your Exclusive WiderNetFarms Coupon!`;
  const htmlContent = `
    <h1>Here's Your Exclusive Coupon!</h1>
    <p>Dear customer,</p>
    <p>As a thank you for your recent purchase, here is a special coupon code just for you:</p>
    <h2 style="color: #4CAF50;">${couponCode}</h2>
    <p>This coupon gives you <strong>${discountDescription}</strong> on your next order.</p>
    <p>It expires on: <strong>${expiryString}</strong>. Don't miss out!</p>
    ${productDetails}
    <p>Use this code at checkout to enjoy your discount.</p>
    <p>Happy Shopping!</p>
    <p>The WiderNetFarms Team</p>
  `;

  const resend = new Resend('re_9tZmVBVQ_2ow1XSBKtDFaVPnBhPqSfk1r');
  await resend.emails.send({
    from: `WiderNetFarms Support <${process.env.EMAIL_FROM}>`,
    to: userEmail,
    subject,
    html: htmlContent
  });
};