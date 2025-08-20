const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { storyData } = JSON.parse(event.body);
    
    // Debug: Log environment variables (remove in production)
    console.log('Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) : 'none'
    });
    
    // Check if we're in development mode
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('development')) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'You did not provide an API key. You need to provide your API key in the Authorization header, using Bearer auth (e.g. \'Authorization: Bearer YOUR_SECRET_KEY\'). See https://stripe.com/docs/api#authentication for details, or we can help at https://support.stripe.com/.'
        })
      };
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'sek',
          product_data: {
            name: `Personlig saga: ${storyData.title}`,
            description: `En personlig AI-genererad saga för ${storyData.childName} (${storyData.childAge} år)`,
            images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400'],
          },
          unit_amount: 5000, // 50 SEK in öre
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: storyData.parentEmail,
      success_url: `${process.env.URL || event.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&email=${storyData.parentEmail}`,
      cancel_url: `${process.env.URL || event.headers.origin}/simple.html?canceled=true`,
      metadata: {
        storyTitle: storyData.title,
        childName: storyData.childName,
        childAge: storyData.childAge,
        theme: storyData.theme,
        parentEmail: storyData.parentEmail,
        details: storyData.details || ''
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url
      })
    };

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};