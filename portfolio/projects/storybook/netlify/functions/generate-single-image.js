const fetch = require('node-fetch');

exports.handler = async (event, context) => {
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
    const { paragraph, childName, childAge, theme, position } = JSON.parse(event.body);
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    console.log(`🎨 Generating image ${position + 1} for ${childName}`);
    
    const imagePrompt = `Children's book illustration: A ${childAge} year old child named ${childName} in a ${theme} adventure. Scene: ${paragraph.substring(0, 150)}. Style: Cartoon, child-friendly, colorful, engaging illustration for Swedish children's book. NO TEXT OR WORDS in the image.`;
    
    try {
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: imagePrompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1
        })
      });

      if (imageResponse.ok) {
        const imageResult = await imageResponse.json();
        if (imageResult.data?.[0]?.url) {
          console.log(`✅ Generated image ${position + 1}: ${imageResult.data[0].url}`);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              image: {
                position: position,
                url: imageResult.data[0].url,
                description: `${childName}'s adventure - Scene ${position + 1}`
              }
            })
          };
        }
      } else {
        throw new Error(`DALL-E API error: ${imageResponse.status}`);
      }
    } catch (imageError) {
      console.warn(`❌ Failed to generate image ${position + 1}:`, imageError.message);
      
      // Return fallback image
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          image: {
            position: position,
            url: `/images/demo_prinsessan_${Math.min(position, 5)}.png`,
            description: `Fallback illustration ${position + 1}`,
            isFallback: true
          }
        })
      };
    }

    // Should not reach here
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Unexpected error' })
    };

  } catch (error) {
    console.error('Single image generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};