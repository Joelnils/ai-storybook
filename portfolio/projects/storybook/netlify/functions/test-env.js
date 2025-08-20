exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Environment variable test',
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) : 'none',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('STRIPE'))
    })
  };
};