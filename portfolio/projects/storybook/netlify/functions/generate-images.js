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
    const { storyContent, theme } = JSON.parse(event.body);
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    const paragraphs = storyContent.split('\n\n').filter(p => p.trim());
    const images = [];
    const maxImages = Math.min(paragraphs.length, 6);

    for (let i = 0; i < maxImages; i++) {
      const paragraph = paragraphs[i];
      const imagePrompt = `Children's book illustration: ${paragraph.substring(0, 200)}. Cartoon style, child-friendly, colorful, engaging Swedish children's story. NO TEXT OR WORDS in the image.`;

      try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
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

        if (response.ok) {
          const result = await response.json();
          if (result.data?.[0]?.url) {
            images.push({
              position: i,
              url: result.data[0].url,
              description: `Illustration för sida ${i + 1}`
            });
          }
        }
      } catch (imgError) {
        console.warn('Could not generate image for paragraph', i + 1, imgError);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        images: images
      })
    };

  } catch (error) {
    console.error('Image generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};