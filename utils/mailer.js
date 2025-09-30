import nodemailer from 'nodemailer';

const createMailgunTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.mailgun.org",
    port: 2525,
    secure: false,
    auth: {
      user: process.env.MAILGUN_SMTP_USER,
      pass: process.env.MAILGUN_SMTP_PASS,
    },
    logger: true,
    debug: true,
  });
};


export const sendOrderConfirmation = async (order) => {
  if (!order.userEmail) return;

  const transporter = createMailgunTransporter();

  const itemsListHTML = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">₹${item.price * item.quantity}</td>
    </tr>`).join('');

  const htmlContent = `
    <div style="max-width: 600px; margin: auto; font-family: 'Segoe UI', sans-serif; border: 1px solid #eee; padding: 24px; border-radius: 8px;">
      <h2 style="color: #2e7d32; text-align: center;">🍽️ Thank you for ordering at <span style="color: #d32f2f;">Tastoria</span></h2>
      <p>Hello <strong>${order.userEmail}</strong>,</p>
      <p>Your order has been <strong style="color: #388e3c;">confirmed</strong>! Below are the details:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
        <thead style="background: #f5f5f5;">
          <tr>
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: left;">Qty</th>
            <th style="padding: 10px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsListHTML}</tbody>
      </table>
      <p style="margin-top: 20px;"><strong>Table:</strong> ${order.tableId}</p>
      <p><strong>Total:</strong> ₹${order.total}</p>
      <div style="margin-top: 30px; text-align: center;">
        <p style="font-size: 14px; color: #777;">We’re preparing your order and will serve you shortly.</p>
        <p style="margin-top: 12px; font-size: 12px; color: #aaa;">Tastoria Café</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Tastoria Orders" <${process.env.MAILGUN_SMTP_USER}>`,
    to: order.userEmail,
    subject: `✅ Order Confirmed - Tastoria`,
    html: htmlContent,
    text: `
Hi ${order.userEmail},

Your order has been confirmed!

Table: ${order.tableId}
Total: ₹${order.total}
Items: ${order.items.map(item => `${item.quantity} x ${item.name} - ₹${item.price * item.quantity}`).join(', ')}

Thank you for ordering at Tastoria!
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent to", order.userEmail);
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
  }
};

export const sendOrderCancellation = async (order) => {
  if (!order.userEmail) return;

  const transporter = createMailgunTransporter();

  const itemsListHTML = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">₹${item.price * item.quantity}</td>
    </tr>`).join('');

  const htmlContent = `
    <div style="max-width: 600px; margin: auto; font-family: 'Segoe UI', sans-serif; border: 1px solid #eee; padding: 24px; border-radius: 8px;">
      <h2 style="color: #d32f2f; text-align: center;">❌ Order Cancelled at <span style="color: #2e7d32;">Tastoria</span></h2>
      <p>Hello <strong>${order.userEmail}</strong>,</p>
      <p>We're sorry to inform you that your order has been <strong style="color: #d32f2f;">cancelled</strong>. Here are the details:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
        <thead style="background: #f5f5f5;">
          <tr>
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: left;">Qty</th>
            <th style="padding: 10px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsListHTML}</tbody>
      </table>
      <p style="margin-top: 20px;"><strong>Table:</strong> ${order.tableId}</p>
      <p><strong>Total:</strong> ₹${order.total}</p>
      <div style="margin-top: 30px; text-align: center;">
        <p style="font-size: 14px; color: #777;">We hope to serve you next time. The Order might be cancelled due to unavailability of the items.</p>
        <p style="margin-top: 12px; font-size: 12px; color: #aaa;">Tastoria Café</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Tastoria Orders" <${process.env.MAILGUN_SMTP_USER}>`,
    to: order.userEmail,
    subject: `❌ Order Cancelled - Tastoria`,
    html: htmlContent,
    text: `
Hi ${order.userEmail},

Your order has been cancelled.

Table: ${order.tableId}
Total: ₹${order.total}
Items: ${order.items.map(item => `${item.quantity} x ${item.name} - ₹${item.price * item.quantity}`).join(', ')}

We hope to serve you again at Tastoria.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("⚠️ Cancellation email sent to", order.userEmail);
  } catch (error) {
    console.error("❌ Failed to send cancellation email:", error.message);
  }
};
