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
    const { title, childName, childAge, theme, details } = JSON.parse(event.body);
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    console.log('📝 Generating story text for:', childName);
    
    let content;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
      
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
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: storyPrompt }],
          max_tokens: 600,
          temperature: 0.8
        })
      });
      
      clearTimeout(timeoutId);

      if (storyResponse.ok) {
        const storyResult = await storyResponse.json();
        content = storyResult.choices[0].message.content.trim();
        console.log('✅ OpenAI story generated');
      } else {
        throw new Error('OpenAI failed');
      }
    } catch (error) {
      console.warn('⚠️ Using template story:', error.message);
      content = `${childName} började sitt magiska äventyr i världen av ${theme}. Det var en vacker dag när hen upptäckte att något spännande väntade runt hörnet.

När ${childName} utforskade vidare, träffade hen nya vänner som skulle hjälpa till på resan. Tillsammans skulle de lösa mysterier och övervinna utmaningar som kom i deras väg.

Plötsligt hände något oväntat som förändrade allt. ${childName} insåg att hen hade en speciell förmåga som kunde hjälpa alla andra. Det var dags att vara modig och visa vad hen gick för.

Med hjälp av sina vänner lyckades ${childName} övervinna alla hinder. Hen lärde sig viktiga lektioner om vänskap, mod och att aldrig ge upp sina drömmar.

Till slut återvände ${childName} hem med nya erfarenheter och ett hjärta fullt av glädje. Äventyret hade lärt hen att allt är möjligt när man tror på sig själv.

Och så levde ${childName} lyckligt i många år framöver, alltid redo för nästa stora äventyr som väntade runt hörnet.`;
    }

    // Return story immediately with demo images
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const placeholderImages = paragraphs.slice(0, 6).map((_, index) => ({
      position: index,
      url: `/images/demo_prinsessan_${Math.min(index, 5)}.png`,
      description: `Generating custom illustration ${index + 1}...`,
      isPlaceholder: true
    }));

    console.log('✅ Story text ready with placeholders');

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
    console.error('Story generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};