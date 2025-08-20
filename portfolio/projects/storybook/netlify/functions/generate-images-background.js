const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Set longer timeout - Netlify Pro allows up to 15 minutes
  context.callbackWaitsForEmptyEventLoop = false;
  
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
    const { storyContent, childName, childAge, theme, storyId } = JSON.parse(event.body);
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    console.log('🎨 Starting background image generation for story:', storyId);
    
    const paragraphs = storyContent.split('\n\n').filter(p => p.trim());
    const images = [];
    const maxImages = Math.min(paragraphs.length, 6);
    
    // Generate images one by one with generous timeouts
    for (let i = 0; i < maxImages; i++) {
      console.log(`🎨 Generating image ${i + 1}/${maxImages}`);
      
      const paragraph = paragraphs[i];
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
            images.push({
              position: i,
              url: imageResult.data[0].url,
              description: `${childName}'s adventure - Scene ${i + 1}`,
              prompt: imagePrompt
            });
            console.log(`✅ Generated image ${i + 1}: ${imageResult.data[0].url}`);
          }
        } else {
          console.warn(`⚠️ Failed to generate image ${i + 1}:`, await imageResponse.text());
          // Use demo image as fallback
          images.push({
            position: i,
            url: `/images/demo_prinsessan_${Math.min(i, 5)}.png`,
            description: `Fallback illustration ${i + 1}`,
            isFallback: true
          });
        }
      } catch (imgError) {
        console.warn('Could not generate image for paragraph', i + 1, imgError);
        // Use demo image as fallback
        images.push({
          position: i,
          url: `/images/demo_prinsessan_${Math.min(i, 5)}.png`,
          description: `Fallback illustration ${i + 1}`,
          isFallback: true
        });
      }

      // Small delay between images to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('✅ Background image generation complete for story:', storyId);
    console.log('Generated', images.filter(img => !img.isFallback).length, 'real DALL-E images');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        storyId: storyId,
        images: images,
        realImagesCount: images.filter(img => !img.isFallback).length
      })
    };

  } catch (error) {
    console.error('Background image generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};