import nodemailer from "nodemailer";

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

export const sendVerificationEmail = async (email, verificationToken) => {
  const transporter = createTransporter();

  const verificationUrl = `${process.env.BASE_URL}/api/v1/auth/verify/${verificationToken}`;

  const mailOptions = {
    from: `"${process.env.SENDER_NAME}" <${process.env.SENDER_EMAIL}>`,
    to: email,
    subject: "Verify Your Email - CloudFile Manager",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">☁️ CloudFile Manager</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Your secure cloud storage solution!</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: white; margin: 0 0 15px 0; font-size: 24px;">📧 Email Verification Required</h2>
          <p style="color: white; margin: 0; font-size: 16px;">Secure your cloud storage account by verifying your email</p>
        </div>
        
        <div style="padding: 20px 0;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Hi there! 👋</p>
          <p style="margin: 0 0 20px 0;">Welcome to CloudFile Manager! You're just one step away from accessing your secure cloud storage. Please verify your email address to start uploading and managing your files:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
              ✅ Verify Email & Access My Files
            </a>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;"><strong>⏰ Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #d1ecf1; border-radius: 5px; border-left: 4px solid #17a2b8;">
            <p style="margin: 0; color: #0c5460; font-size: 13px;"><strong>🚀 What's next?</strong> After verification, you can upload files, create folders, and share your content securely with others!</p>
          </div>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0 0 10px 0;">This email was sent from CloudFile Manager. If you didn't create an account, please ignore this email.</p>
          <p style="margin: 0;">© 2025 CloudFile Manager. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `Welcome to CloudFile Manager! Please verify your email address by visiting: ${verificationUrl}\n\nThis link will expire in 24 hours.\n\nAfter verification, you can start uploading and managing your files securely in the cloud!\n\nIf you didn't create an account, please ignore this email.`,
  };

  return await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = createTransporter();

  const resetUrl = `${process.env.BASE_URL}/reset/${resetToken}`;

  const mailOptions = {
    from: `"${process.env.SENDER_NAME}" <${process.env.SENDER_EMAIL}>`,
    to: email,
    subject: "Reset Your Password - CloudFile Manager",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc3545; margin: 0; font-size: 28px;">☁️ CloudFile Manager</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Password Reset Request</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: white; margin: 0 0 15px 0; font-size: 24px;">🔒 Password Reset</h2>
          <p style="color: white; margin: 0; font-size: 16px;">Secure your CloudFile Manager account</p>
        </div>
        
        <div style="padding: 20px 0;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Hello! 👋</p>
          <p style="margin: 0 0 20px 0;">We received a request to reset your password for your CloudFile Manager account. If this was you, click the button below to create a new password and regain access to your files:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);">
              🔑 Reset My Password
            </a>
          </div>
          
          <p style="margin: 20px 0; color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 13px; color: #495057; border-left: 4px solid #dc3545;">
            ${resetUrl}
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #f8d7da; border-radius: 5px; border-left: 4px solid #dc3545;">
          <div style="margin-top: 30px; padding: 20px; background: #f8d7da; border-radius: 5px; border-left: 4px solid #dc3545;">
            <p style="margin: 0 0 10px 0; color: #721c24; font-size: 14px;"><strong>⏰ Important:</strong> This password reset link will expire in 10 minutes for security reasons.</p>
            <p style="margin: 0; color: #721c24; font-size: 14px;"><strong>🔐 Security Note:</strong> If you didn't request this password reset, please ignore this email and your files will remain secure.</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #d1ecf1; border-radius: 5px; border-left: 4px solid #17a2b8;">
            <p style="margin: 0; color: #0c5460; font-size: 13px;"><strong>💡 Tip:</strong> To keep your files secure, choose a strong password that includes uppercase and lowercase letters, numbers, and symbols.</p>
          </div>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0 0 10px 0;">This email was sent from CloudFile Manager. If you didn't request a password reset, someone may have entered your email by mistake.</p>
          <p style="margin: 0;">© 2025 CloudFile Manager. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `Password Reset Request\n\nSomeone requested to reset your password for your CloudFile Manager account.\n\nIf this was you, visit: ${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email and your files will remain secure.\n\n© 2025 CloudFile Manager`,
  };

  return await transporter.sendMail(mailOptions);
};