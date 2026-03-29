import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.SMTP_FROM || 'Notion Clone <noreply@example.com>';

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your email for Notion Clone',
    html: `
      <h1>Email Verification</h1>
      <p>Thank you for signing up! Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your password for Notion Clone',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Please click the link below to set a new password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
