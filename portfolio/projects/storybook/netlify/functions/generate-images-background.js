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
    
    // Try to generate just 2 images within function timeout limits
    const targetImages = Math.min(maxImages, 2); // Reduce to 2 for reliability
    console.log(`🎨 Attempting to generate ${targetImages} images within timeout limits`);
    
    // Generate images with aggressive timeout protection
    const generateWithTimeout = async (i, paragraph) => {
      const imagePrompt = `Children's book illustration: A ${childAge} year old child named ${childName} in a ${theme} adventure. Scene: ${paragraph.substring(0, 150)}. Style: Cartoon, child-friendly, colorful, engaging illustration for Swedish children's book. NO TEXT OR WORDS in the image.`;
      
      try {
        // Set 60 second timeout per image (aggressive)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        console.log(`🎨 Starting image ${i + 1} generation...`);
        
        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          signal: controller.signal,
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
        
        clearTimeout(timeoutId);

        if (imageResponse.ok) {
          const imageResult = await imageResponse.json();
          if (imageResult.data?.[0]?.url) {
            console.log(`✅ Successfully generated image ${i + 1}`);
            return {
              position: i,
              url: imageResult.data[0].url,
              description: `${childName}'s adventure - Scene ${i + 1}`,
              prompt: imagePrompt
            };
          }
        } else {
          console.warn(`⚠️ Image ${i + 1} API error:`, imageResponse.status);
        }
      } catch (imgError) {
        if (imgError.name === 'AbortError') {
          console.warn(`⏰ Image ${i + 1} generation timed out`);
        } else {
          console.warn(`❌ Image ${i + 1} error:`, imgError.message);
        }
      }
      
      // Return fallback
      console.log(`🔄 Using fallback image for position ${i + 1}`);
      return {
        position: i,
        url: `/images/demo_prinsessan_${Math.min(i, 5)}.png`,
        description: `Fallback illustration ${i + 1}`,
        isFallback: true
      };
    };

    // Generate images sequentially to avoid overwhelming the function
    for (let i = 0; i < targetImages; i++) {
      const paragraph = paragraphs[i];
      const imageResult = await generateWithTimeout(i, paragraph);
      images.push(imageResult);
      
      // Small delay between generations
      if (i < targetImages - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Fill remaining positions with fallback images
    for (let i = targetImages; i < maxImages; i++) {
      images.push({
        position: i,
        url: `/images/demo_prinsessan_${Math.min(i, 5)}.png`,
        description: `Demo illustration ${i + 1}`,
        isFallback: true
      });
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