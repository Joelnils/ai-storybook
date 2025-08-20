exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: 'Hello from Netlify Functions!'
  };
};