// utils/email.js
const nodemailer = require('nodemailer');
const pug = require('pug'); // For HTML email templates (optional, but good practice)
const htmlToText = require('html-to-text'); // For converting HTML to plain text

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.fullName.split(' ')[0];
    this.url = url;
    this.from = `WiderNetFarms Support <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Implement a production email service like SendGrid, Mailgun, AWS SES
      // Example for SendGrid (install @sendgrid/mail):
      // return nodemailer.createTransport({
      //   service: 'SendGrid',
      //   auth: {
      //     user: process.env.SENDGRID_USERNAME,
      //     pass: process.env.SENDGRID_PASSWORD
      //   }
      // });
      // For now, let's just use Mailtrap for both dev/prod sim if not deploying
    }

    // Default to Mailtrap for development (or simulated production)
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html) // Convert HTML to plain text for email clients that don't display HTML
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
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
      text: htmlToText.fromString(html)
    };
    await this.newTransport().sendMail(mailOptions);
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Your password reset token (valid for 10 min)');
  }
};