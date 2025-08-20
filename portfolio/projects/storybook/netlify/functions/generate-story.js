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
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    const prompt = `Skriv en svensk barnberättelse för ${storyData.childName}, ${storyData.childAge} år.

TITEL: ${storyData.title}
TEMA: ${storyData.theme}
SPECIELLA ÖNSKEMÅL: ${storyData.details || 'Inga speciella önskemål'}

INSTRUKTIONER:
- Gör ${storyData.childName} till huvudkaraktären
- Anpassa språket för ${storyData.childAge} år
- Skriv exakt 6 stycken (cirka 400-500 ord)
- Varje stycke ska vara 2-4 meningar
- Inkludera en viktig lärdom
- Håll tonen positiv och uppmuntrande
- Dela upp i naturliga paragrafer

Skriv endast berättelsen, ingen extra text:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content.trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        story: {
          title: storyData.title,
          content: content,
          childName: storyData.childName,
          theme: storyData.theme,
          parentEmail: storyData.parentEmail
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