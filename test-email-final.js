const fetch = require('node-fetch');

async function testForgotPassword() {
  try {
    console.log('🔄 Testing forgot password functionality...');
    
    const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'helanantony2026@mca.ajce.in'
      })
    });
    
    console.log('📊 Response status:', response.status);
    
    const data = await response.json();
    console.log('📋 Response data:', data);
    
    if (response.ok) {
      console.log('✅ SUCCESS: Forgot password email sent successfully!');
      console.log('📧 Check your email: helanantony2026@mca.ajce.in');
    } else {
      console.log('❌ ERROR:', data.error);
      console.log('🔍 Details:', data.details);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testForgotPassword();
