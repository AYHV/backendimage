require("dotenv").config();
const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send email
 */
const sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (email, name) => {
  const subject = "Welcome to Photographer Portfolio!";
  const html = `
    <h1>Welcome ${name}!</h1>
    <p>Thank you for registering with our photography services.</p>
    <p>We're excited to work with you!</p>
  `;

  await sendEmail({ to: email, subject, html });
};

/**
 * Send booking confirmation email
 */
const sendBookingConfirmationEmail = async (email, bookingDetails) => {
  const subject = "Booking Confirmation";
  const html = `
    <h1>Booking Confirmed!</h1>
    <p>Dear ${bookingDetails.clientName},</p>
    <p>Your booking has been confirmed.</p>
    <h3>Booking Details:</h3>
    <ul>
      <li><strong>Package:</strong> ${bookingDetails.packageName}</li>
      <li><strong>Date:</strong> ${bookingDetails.date}</li>
      <li><strong>Time:</strong> ${bookingDetails.time}</li>
      <li><strong>Location:</strong> ${bookingDetails.location || "TBD"}</li>
      <li><strong>Total Price:</strong> $${bookingDetails.price}</li>
      <li><strong>Deposit Paid:</strong> $${bookingDetails.depositAmount}</li>
      <li><strong>Remaining:</strong> $${bookingDetails.remainingAmount}</li>
    </ul>
    <p>We look forward to working with you!</p>
  `;

  await sendEmail({ to: email, subject, html });
};

/**
 * Send payment receipt email
 */
const sendPaymentReceiptEmail = async (email, paymentDetails) => {
  const subject = "Payment Receipt";
  const html = `
    <h1>Payment Received</h1>
    <p>Dear ${paymentDetails.clientName},</p>
    <p>We have received your payment.</p>
    <h3>Payment Details:</h3>
    <ul>
      <li><strong>Amount:</strong> $${paymentDetails.amount}</li>
      <li><strong>Payment Type:</strong> ${paymentDetails.type}</li>
      <li><strong>Date:</strong> ${paymentDetails.date}</li>
      <li><strong>Transaction ID:</strong> ${paymentDetails.transactionId}</li>
    </ul>
    <p>Thank you for your payment!</p>
  `;

  await sendEmail({ to: email, subject, html });
};

/**
 * Send photo delivery notification email
 */
const sendPhotoDeliveryEmail = async (email, deliveryDetails) => {
  const subject = "Your Photos Are Ready!";
  const html = `
    <h1>Your Photos Are Ready!</h1>
    <p>Dear ${deliveryDetails.clientName},</p>
    <p>We're excited to share your photos with you!</p>
    <h3>Delivery Details:</h3>
    <ul>
      <li><strong>Album:</strong> ${deliveryDetails.albumName}</li>
      <li><strong>Photo Count:</strong> ${deliveryDetails.photoCount}</li>
      <li><strong>Access Link:</strong> <a href="${
        deliveryDetails.accessLink
      }">View Photos</a></li>
      ${
        deliveryDetails.expiresAt
          ? `<li><strong>Expires:</strong> ${deliveryDetails.expiresAt}</li>`
          : ""
      }
    </ul>
    <p>Enjoy your photos!</p>
  `;

  await sendEmail({ to: email, subject, html });
};

/**
 * Send booking cancellation email
 */
const sendBookingCancellationEmail = async (email, cancellationDetails) => {
  const subject = "Booking Cancelled";
  const html = `
    <h1>Booking Cancelled</h1>
    <p>Dear ${cancellationDetails.clientName},</p>
    <p>Your booking has been cancelled.</p>
    <h3>Cancellation Details:</h3>
    <ul>
      <li><strong>Booking Date:</strong> ${cancellationDetails.date}</li>
      <li><strong>Reason:</strong> ${cancellationDetails.reason}</li>
      ${
        cancellationDetails.refundAmount
          ? `<li><strong>Refund Amount:</strong> $${cancellationDetails.refundAmount}</li>`
          : ""
      }
    </ul>
    <p>If you have any questions, please contact us.</p>
  `;

  await sendEmail({ to: email, subject, html });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendBookingConfirmationEmail,
  sendPaymentReceiptEmail,
  sendPhotoDeliveryEmail,
  sendBookingCancellationEmail,
};
