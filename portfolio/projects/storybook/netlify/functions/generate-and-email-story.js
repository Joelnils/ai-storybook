const fetch = require('node-fetch');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Set longer timeout for comprehensive story generation
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
    const { title, childName, childAge, theme, details, parentEmail } = JSON.parse(event.body);
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    console.log('🎯 Starting complete story generation for:', childName);
    
    // Step 1: Generate story text (fast)
    let content;
    try {
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
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: storyPrompt }],
          max_tokens: 800,
          temperature: 0.8
        })
      });

      if (storyResponse.ok) {
        const storyResult = await storyResponse.json();
        content = storyResult.choices[0].message.content.trim();
        console.log('✅ Story text generated with OpenAI');
      } else {
        throw new Error('OpenAI story generation failed');
      }
    } catch (error) {
      console.warn('⚠️ Using template story due to:', error.message);
      content = `${childName} började sitt magiska äventyr i världen av ${theme}. Det var en vacker dag när hen upptäckte att något spännande väntade.

När ${childName} utforskade vidare, träffade hen nya vänner som skulle hjälpa till på resan. Tillsammans skulle de lösa mysterier och övervinna utmaningar.

Plötsligt hände något oväntat som förändrade allt. ${childName} insåg att hen hade en speciell förmåga som kunde hjälpa alla andra.

Med hjälp av sina vänner lyckades ${childName} övervinna alla hinder. Hen lärde sig viktiga lektioner om vänskap, mod och att aldrig ge upp.

Till slut återvände ${childName} hem med nya erfarenheter och ett hjärta fullt av glädje. Äventyret hade lärt hen att allt är möjligt.

Och så levde ${childName} lyckligt i många år framöver, alltid redo för nästa stora äventyr som väntade runt hörnet.`;
    }

    // Step 2: Generate DALL-E images efficiently
    console.log('🎨 Generating DALL-E images...');
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const images = [];
    const maxImages = Math.min(paragraphs.length, 4); // Reduced to 4 for reliability
    
    const generateImageWithTimeout = async (i, paragraph) => {
      const imagePrompt = `Children's book illustration: A ${childAge} year old child named ${childName} in a ${theme} adventure. Scene: ${paragraph.substring(0, 120)}. Style: Cartoon, child-friendly, colorful, engaging illustration for Swedish children's book. NO TEXT OR WORDS in the image.`;
      
      try {
        // Set 90 second timeout per image
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);
        
        console.log(`🎨 Starting image ${i + 1}/${maxImages}...`);
        
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
            // Download image data for PDF
            const imgController = new AbortController();
            const imgTimeoutId = setTimeout(() => imgController.abort(), 30000);
            
            const imgResponse = await fetch(imageResult.data[0].url, { 
              signal: imgController.signal 
            });
            clearTimeout(imgTimeoutId);
            
            const imgBuffer = await imgResponse.buffer();
            
            console.log(`✅ Generated and downloaded image ${i + 1}`);
            return {
              position: i,
              buffer: imgBuffer,
              url: imageResult.data[0].url,
              description: `${childName}'s adventure - Scene ${i + 1}`
            };
          }
        } else {
          console.warn(`⚠️ Failed to generate image ${i + 1}: ${imageResponse.status}`);
        }
      } catch (imgError) {
        if (imgError.name === 'AbortError') {
          console.warn(`⏰ Image ${i + 1} generation timed out`);
        } else {
          console.warn(`❌ Image ${i + 1} error:`, imgError.message);
        }
      }
      
      // Return fallback
      return {
        position: i,
        buffer: null,
        description: `Illustration ${i + 1}`,
        isFallback: true
      };
    };

    // Generate images sequentially to manage timeouts
    for (let i = 0; i < maxImages; i++) {
      const paragraph = paragraphs[i];
      const imageResult = await generateImageWithTimeout(i, paragraph);
      images.push(imageResult);
    }
    
    // Fill remaining positions with fallbacks if needed
    for (let i = maxImages; i < 6; i++) {
      images.push({
        position: i,
        buffer: null,
        description: `Demo illustration ${i + 1}`,
        isFallback: true
      });
    }

    // Step 3: Generate PDF
    console.log('📄 Creating PDF...');
    const pdfBuffer = await createStoryPDF({
      title,
      content,
      childName,
      theme,
      images
    });

    // Step 4: Send email
    console.log('📧 Sending email...');
    await sendStoryEmail(parentEmail, {
      title,
      childName,
      content,
      images: images.filter(img => !img.isFallback).length
    }, pdfBuffer);

    console.log('✅ Complete story generation and email delivery successful');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Story generated and emailed successfully',
        realImages: images.filter(img => !img.isFallback).length,
        totalImages: images.length
      })
    };

  } catch (error) {
    console.error('❌ Complete story generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function createStoryPDF(story) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Title page
    doc.fontSize(24).font('Helvetica-Bold').text(story.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).font('Helvetica').text(`En personlig saga för ${story.childName}`, { align: 'center' });
    doc.moveDown(3);

    // Story content with images
    const paragraphs = story.content.split('\n\n').filter(p => p.trim());
    
    paragraphs.forEach((paragraph, index) => {
      // Add image if available
      const image = story.images.find(img => img.position === index);
      if (image && image.buffer) {
        try {
          const pageWidth = doc.page.width - 100;
          const imgWidth = Math.min(pageWidth, 400);
          const x = (doc.page.width - imgWidth) / 2;
          
          doc.image(image.buffer, x, doc.y, { width: imgWidth });
          doc.moveDown(2);
        } catch (imgError) {
          console.warn('Failed to add image to PDF:', imgError.message);
        }
      }

      // Add paragraph text
      doc.fontSize(12).font('Helvetica').text(paragraph.trim(), {
        align: 'left',
        lineGap: 5
      });
      doc.moveDown(2);

      // Add page break if not last paragraph
      if (index < paragraphs.length - 1) {
        doc.addPage();
      }
    });

    doc.end();
  });
}

async function sendStoryEmail(customerEmail, story, pdfBuffer) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: `Din personliga saga: ${story.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">🎉 Din saga är klar!</h2>
        
        <p>Hej!</p>
        
        <p>Vi har skapat en personlig saga för <strong>${story.childName}</strong>:</p>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin: 0; color: #374151;">${story.title}</h3>
          <p style="margin: 10px 0 0 0; color: #6B7280;">
            📖 Personlig berättelse<br>
            🎨 ${story.images} AI-genererade illustrationer<br>
            📄 Komplett PDF bifogad
          </p>
        </div>
        
        <p>Din saga är bifogad som en PDF-fil som du kan:</p>
        <ul>
          <li>Läsa direkt på din enhet</li>
          <li>Skriva ut för att skapa en fysisk bok</li>
          <li>Dela med vänner och familj</li>
        </ul>
        
        <p>Vi hoppas att ${story.childName} kommer att älska sin personliga saga!</p>
        
        <p style="margin-top: 30px;">
          Varma hälsningar,<br>
          <strong>AI Sagoskapare</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
        <p style="font-size: 12px; color: #9CA3AF;">
          Detta email skickades eftersom du beställde en personlig saga från AI Sagoskapare.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `${story.title} - ${story.childName}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}