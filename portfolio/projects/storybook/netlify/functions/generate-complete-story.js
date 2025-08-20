const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Set longer timeout context
  context.callbackWaitsForEmptyEventLoop = false;
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
    const { title, childName, childAge, theme, details, parentEmail } = JSON.parse(event.body);
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    console.log('🎯 Generating story for:', childName);
    
    // Step 1: Generate story text
    const storyPrompt = `Skriv en svensk barnberättelse för ${childName}, ${childAge} år.

TITEL: ${title}
TEMA: ${theme}
SPECIELLA ÖNSKEMÅL: ${details || 'Inga speciella önskemål'}

INSTRUKTIONER:
- Gör ${childName} till huvudkaraktären
- Anpassa språket för ${childAge} år
- Skriv exakt 6 stycken (cirka 400-500 ord)
- Varje stycke ska vara 2-4 meningar
- Inkludera en viktig lärdom
- Håll tonen positiv och uppmuntrande
- Dela upp i naturliga paragrafer

Skriv endast berättelsen, ingen extra text:`;

    const storyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: storyPrompt }],
        max_tokens: 1500,
        temperature: 0.8
      })
    });

    if (!storyResponse.ok) {
      const errorText = await storyResponse.text();
      throw new Error(`OpenAI API error: ${storyResponse.status} - ${errorText}`);
    }

    const storyResult = await storyResponse.json();
    const content = storyResult.choices[0].message.content.trim();

    // Generate fewer DALL-E images for faster response
    const paragraphs = content.split('\\n\\n').filter(p => p.trim());
    const images = [];
    const maxImages = Math.min(paragraphs.length, 3); // Reduced from 6 to 3 for speed
    
    console.log('🎨 Generating', maxImages, 'DALL-E images for story');

    // Generate images with timeout protection
    const generateImageWithTimeout = async (i, paragraph) => {
      const imagePrompt = `Children's book illustration: A ${childAge} year old child named ${childName} in a ${theme} adventure. Scene: ${paragraph.substring(0, 150)}. Style: Cartoon, child-friendly, colorful, engaging illustration for Swedish children's book. NO TEXT OR WORDS in the image.`;
      
      try {
        // Set 30 second timeout for each image generation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
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
            console.log(`✅ Generated image ${i + 1}: ${imageResult.data[0].url}`);
            return {
              position: i,
              url: imageResult.data[0].url,
              description: `${childName}'s adventure - Scene ${i + 1}`,
              prompt: imagePrompt
            };
          }
        } else {
          console.warn(`⚠️ Failed to generate image ${i + 1}:`, imageResponse.status);
        }
      } catch (imgError) {
        console.warn('Image generation timeout/error for paragraph', i + 1, imgError.message);
      }
      
      // Fallback to demo image
      return {
        position: i,
        url: `/images/demo_prinsessan_${Math.min(i, 5)}.png`,
        description: `Fallback illustration ${i + 1}`,
        isFallback: true
      };
    };

    // Generate images concurrently for speed
    const imagePromises = [];
    for (let i = 0; i < maxImages; i++) {
      const paragraph = paragraphs[i];
      imagePromises.push(generateImageWithTimeout(i, paragraph));
    }
    
    try {
      const generatedImages = await Promise.all(imagePromises);
      images.push(...generatedImages);
    } catch (error) {
      console.error('Error generating images:', error);
      // Add fallback images for all positions
      for (let i = 0; i < maxImages; i++) {
        images.push({
          position: i,
          url: `/images/demo_prinsessan_${Math.min(i, 5)}.png`,
          description: `Fallback illustration ${i + 1}`,
          isFallback: true
        });
      }
    }

    console.log('✅ Generated', images.filter(img => !img.isFallback).length, 'real DALL-E images and', images.filter(img => img.isFallback).length, 'fallbacks');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        story: {
          title: title,
          content: content,
          childName: childName,
          theme: theme,
          images: images
        }
      })
    };

  } catch (error) {
    console.error('Complete story generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};