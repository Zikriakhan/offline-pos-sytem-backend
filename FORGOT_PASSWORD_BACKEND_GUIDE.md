## Forgot Password Feature - Backend Integration Guide

This document provides the backend code needed to support the Forgot Password functionality.

### 1. Environment Variables

Add these to your `.env` file:

```env
# Email Configuration for Password Reset
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=noreply@digikhata.com
JWT_RESET_SECRET=your-reset-token-secret-key
RESET_TOKEN_EXPIRY=15m
```

### 2. Install Dependencies

```bash
npm install nodemailer
```

### 3. Create Email Service (utils/emailService.js)

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

exports.sendResetEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.SENDER_EMAIL || 'noreply@digikhata.com',
    to: email,
    subject: 'Password Reset - Digi Khata',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
            <p style="margin: 10px 0 0 0;">Digi Khata POS System</p>
          </div>
          
          <div style="border: 1px solid #ddd; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hello,</p>
            
            <p>We received a request to reset your password. Use the code below to complete the process:</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">Verification Code</p>
              <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea;">${otp}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>Important:</strong> This code will expire in 15 minutes. Do not share this code with anyone.
            </p>
            
            <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px; margin-bottom: 10px;">
              This is an automated email from Digi Khata. Please do not reply to this email.
            </p>
            
            <p style="color: #999; font-size: 12px;">
              © 2026 Digi Khata - All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

exports.sendPasswordChangedEmail = async (email, userName) => {
  const mailOptions = {
    from: process.env.SENDER_EMAIL || 'noreply@digikhata.com',
    to: email,
    subject: 'Password Changed - Digi Khata',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Password Changed</h1>
            <p style="margin: 10px 0 0 0;">Digi Khata POS System</p>
          </div>
          
          <div style="border: 1px solid #ddd; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Hello ${userName},</p>
            
            <p>Your password has been successfully changed.</p>
            
            <p style="color: #666; font-size: 14px;">
              If you did not make this change, please contact our support team immediately.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px;">
              © 2026 Digi Khata - All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
```

### 4. Update User Model (models/User.js)

Add these fields to your User schema:

```javascript
{
  resetOTP: {
    type: String,
    default: null,
  },
  resetOTPExpiry: {
    type: Date,
    default: null,
  },
  resetAttempts: {
    type: Number,
    default: 0,
  },
  resetLocked: {
    type: Boolean,
    default: false,
  },
  resetLockedUntil: {
    type: Date,
    default: null,
  },
  lastPasswordChange: {
    type: Date,
    default: null,
  }
}
```

### 5. Add Auth Routes (routes/authRoutes.js)

Add these routes:

```javascript
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-otp', authController.verifyOTP);
```

### 6. Add Auth Controller Methods (controllers/authController.js)

Add these methods to your authController:

```javascript
const emailService = require('../utils/emailService');
const crypto = require('crypto');

// Forgot Password - Generate and send OTP
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({ 
        message: 'If email exists, you will receive a reset code shortly' 
      });
    }

    // Check if user is locked due to too many attempts
    if (user.resetLocked && user.resetLockedUntil > new Date()) {
      return res.status(429).json({ 
        message: 'Too many reset attempts. Please try again later.' 
      });
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with OTP
    user.resetOTP = otp;
    user.resetOTPExpiry = otpExpiry;
    user.resetAttempts = (user.resetAttempts || 0) + 1;
    
    // Lock after 5 attempts
    if (user.resetAttempts > 5) {
      user.resetLocked = true;
      user.resetLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lock
    }

    await user.save();

    // Send email with OTP
    try {
      await emailService.sendResetEmail(user.email, otp);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Still return success so user knows to check email
    }

    res.status(200).json({ 
      message: 'If email exists, you will receive a reset code shortly' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

// Reset Password - Validate OTP and set new password
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP exists and is not expired
    if (!user.resetOTP || user.resetOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.resetOTPExpiry) {
      user.resetOTP = null;
      user.resetOTPExpiry = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    user.password = hashedPassword;
    user.resetOTP = null;
    user.resetOTPExpiry = null;
    user.resetAttempts = 0;
    user.resetLocked = false;
    user.resetLockedUntil = null;
    user.lastPasswordChange = new Date();

    await user.save();

    // Send confirmation email
    try {
      await emailService.sendPasswordChangedEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    res.status(200).json({ 
      message: 'Password has been reset successfully. Please login with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

// Verify OTP only
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.resetOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.resetOTPExpiry) {
      user.resetOTP = null;
      user.resetOTPExpiry = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired' });
    }

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};
```

### 7. Database Migration

If you have an existing User database, add the new fields:

```javascript
// Optional: Create a migration script
const mongoose = require('mongoose');
const User = require('../models/User');

async function addPasswordResetFields() {
  try {
    await User.updateMany({}, {
      $set: {
        resetOTP: null,
        resetOTPExpiry: null,
        resetAttempts: 0,
        resetLocked: false,
        resetLockedUntil: null,
        lastPasswordChange: null
      }
    });
    console.log('Password reset fields added to all users');
  } catch (error) {
    console.error('Migration error:', error);
  }
}
```

### Key Features Implemented:

✅ **Security:**
- OTP expires after 15 minutes
- Password must be at least 6 characters
- Rate limiting (locked after 5 failed attempts)
- Account lockout for 30 minutes after multiple attempts

✅ **User Experience:**
- Email verification code (OTP)
- Simple 2-step reset process
- Clear error messages
- Email confirmation after password reset

✅ **Email Templates:**
- Professional HTML email template
- Includes branding (Digi Khata)
- Clear instructions for users

### Testing the Feature:

1. Click "Forgot Password" on the login page
2. Enter your email address
3. Check your email for the OTP
4. Return to the form and enter OTP + new password
5. Password will be reset and you can login

### API Endpoints:

**POST /auth/forgot-password**
- Request: `{ email: "user@example.com" }`
- Response: Success message

**POST /auth/reset-password**
- Request: `{ email: "user@example.com", otp: "123456", newPassword: "newpass" }`
- Response: Success message

**POST /auth/verify-otp**
- Request: `{ email: "user@example.com", otp: "123456" }`
- Response: Verification result
