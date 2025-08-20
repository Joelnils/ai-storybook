const fetch = require('node-fetch');

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
    const { title, childName, childAge, theme, details, parentEmail } = JSON.parse(event.body);
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    console.log('🎯 Generating story text for:', childName);
    
    // Generate story text only (fast)
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

    let content;
    
    try {
      // Add timeout protection for OpenAI call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7 second timeout
      
      const storyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // Faster than GPT-4
          messages: [{ role: 'user', content: storyPrompt }],
          max_tokens: 600, // Reduced for faster generation
          temperature: 0.8
        })
      });
      
      clearTimeout(timeoutId);

      if (!storyResponse.ok) {
        throw new Error(`OpenAI API error: ${storyResponse.status}`);
      }

      const storyResult = await storyResponse.json();
      content = storyResult.choices[0].message.content.trim();
      
      console.log('✅ OpenAI story generated successfully');
      
    } catch (openaiError) {
      console.warn('⚠️ OpenAI generation failed, using template story:', openaiError.message);
      
      // Fallback to a template story if OpenAI fails
      content = `${childName} började sitt äventyr i den magiska världen av ${theme}. Det var en solig dag när hen upptäckte att något spännande väntade runt hörnet.

När ${childName} utforskade vidare, träffade hen nya vänner som skulle hjälpa till på äventyret. Tillsammans skulle de lösa mysterier och övervinna utmaningar som kom i deras väg.

Plötsligt hände något oväntat som förändrade allt. ${childName} insåg att hen hade en speciell förmåga som kunde hjälpa alla andra. Det var dags att vara modig och visa vad hen gick för.

Med hjälp av sina nya vänner lyckades ${childName} övervinna alla hinder. Hen lärde sig viktiga lektioner om vänskap, mod och att aldrig ge upp sina drömmar.

Till slut återvände ${childName} hem med nya erfarenheter och en hjärta fullt av glädje. Äventyret hade lärt hen att allt är möjligt när man tror på sig själv.

Och så levde ${childName} lyckligt i många år framöver, alltid redo för nästa stora äventyr som väntade runt hörnet.`;
    }

    // Return story with placeholder images immediately
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const placeholderImages = paragraphs.slice(0, 6).map((_, index) => ({
      position: index,
      url: `/images/demo_prinsessan_${Math.min(index, 5)}.png`,
      description: `Generating illustration ${index + 1}...`,
      isPlaceholder: true
    }));

    console.log('✅ Story text generated, returning with placeholders');

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
          images: placeholderImages,
          storyId: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      })
    };

  } catch (error) {
    console.error('Story text generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};