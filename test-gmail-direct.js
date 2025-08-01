const nodemailer = require('nodemailer');

async function testGmailDirect() {
  console.log('🔄 Testing Gmail SMTP directly...');
  
  try {
    // Create transporter with different configurations
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'helanantony03@gmail.com',
        pass: 'vwwxdszgvdsztvze'
      }
    });

    console.log('📧 Attempting to send test email...');

    const mailOptions = {
      from: 'helanantony03@gmail.com',
      to: 'helanantony2026@mca.ajce.in',
      subject: 'Test Email - HerbTrade',
      text: 'This is a test email to verify Gmail SMTP configuration.',
      html: '<h2>Test Email</h2><p>This is a test email to verify Gmail SMTP configuration.</p>'
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ SUCCESS: Email sent successfully!');
    console.log('📋 Message ID:', result.messageId);
    console.log('📧 Check your email: helanantony2026@mca.ajce.in');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testGmailDirect();
