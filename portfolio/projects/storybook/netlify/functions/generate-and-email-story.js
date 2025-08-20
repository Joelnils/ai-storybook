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
    const doc = new PDFDocument({ 
      margin: 40,
      size: 'A4',
      info: {
        Title: story.title,
        Author: 'AI Sagoskapare',
        Subject: `Personlig saga för ${story.childName}`,
        Creator: 'AI Sagoskapare'
      }
    });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on('error', reject);

    // Define colors
    const primaryColor = '#4F46E5';
    const textColor = '#1F2937';
    const subtitleColor = '#6B7280';
    
    // Beautiful title page
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F8FAFC');
    
    // Decorative header border
    doc.rect(0, 0, doc.page.width, 100)
       .fill(primaryColor);
    
    // Title
    doc.fillColor('#FFFFFF')
       .fontSize(32)
       .font('Helvetica-Bold')
       .text(story.title, 40, 30, { align: 'center', width: doc.page.width - 80 });
    
    // Subtitle
    doc.fillColor('#E0E7FF')
       .fontSize(18)
       .font('Helvetica')
       .text(`En personlig saga för ${story.childName}`, 40, 75, { 
         align: 'center', 
         width: doc.page.width - 80 
       });

    // Decorative elements
    doc.circle(100, 150, 30).fill('#FEF3C7');
    doc.circle(doc.page.width - 100, 150, 25).fill('#DBEAFE');
    doc.circle(150, 200, 20).fill('#F3E8FF');
    
    // Main content area with white background
    doc.rect(20, 120, doc.page.width - 40, doc.page.height - 200)
       .fill('#FFFFFF')
       .stroke('#E5E7EB');

    // Welcome message
    doc.fillColor(textColor)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('🌟 Din personliga saga 🌟', 40, 160, { align: 'center', width: doc.page.width - 80 });
    
    doc.fillColor(subtitleColor)
       .fontSize(14)
       .font('Helvetica')
       .text(`Skapad speciellt för ${story.childName}`, 40, 190, { align: 'center', width: doc.page.width - 80 });
    
    doc.text('Tema: ' + story.theme, 40, 220, { align: 'center', width: doc.page.width - 80 });

    // Story content pages
    const paragraphs = story.content.split('\n\n').filter(p => p.trim());
    
    paragraphs.forEach((paragraph, index) => {
      doc.addPage();
      
      // Page background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FEFEFE');
      
      // Header stripe
      doc.rect(0, 0, doc.page.width, 60)
         .fill('#F8F9FA')
         .stroke('#E5E7EB');
      
      // Page number
      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(`Sida ${index + 1}`, doc.page.width - 100, 20);
      
      // Chapter indicator
      doc.fillColor(subtitleColor)
         .fontSize(10)
         .font('Helvetica')
         .text(`Kapitel ${index + 1}`, 40, 20);

      let yPosition = 100;

      // Add image if available
      const image = story.images.find(img => img.position === index);
      if (image && image.buffer) {
        try {
          // Image container with shadow
          const imgWidth = Math.min(doc.page.width - 120, 350);
          const x = (doc.page.width - imgWidth) / 2;
          
          // Shadow effect
          doc.rect(x + 3, yPosition + 3, imgWidth, imgWidth * 0.75)
             .fill('#E5E7EB');
          
          // White border
          doc.rect(x - 5, yPosition - 5, imgWidth + 10, (imgWidth * 0.75) + 10)
             .fill('#FFFFFF')
             .stroke('#D1D5DB');
          
          doc.image(image.buffer, x, yPosition, { 
            width: imgWidth,
            height: imgWidth * 0.75,
            fit: [imgWidth, imgWidth * 0.75]
          });
          
          yPosition += (imgWidth * 0.75) + 30;
          
          // Image caption
          doc.fillColor(subtitleColor)
             .fontSize(10)
             .font('Helvetica-Oblique')
             .text(image.description, 40, yPosition - 20, { 
               align: 'center', 
               width: doc.page.width - 80 
             });
          
        } catch (imgError) {
          console.warn('Failed to add image to PDF:', imgError.message);
          yPosition += 20;
        }
      }

      // Text container
      const textY = Math.max(yPosition, 250);
      doc.rect(40, textY - 10, doc.page.width - 80, 200)
         .fill('#FFFFFF')
         .stroke('#F3F4F6');

      // Paragraph text with better typography
      doc.fillColor(textColor)
         .fontSize(14)
         .font('Helvetica')
         .text(paragraph.trim(), 60, textY, {
           align: 'justify',
           width: doc.page.width - 120,
           lineGap: 8,
           paragraphGap: 12
         });

      // Decorative footer
      doc.rect(0, doc.page.height - 40, doc.page.width, 40)
         .fill('#F8F9FA');
      
      // Footer pattern
      for (let i = 0; i < doc.page.width; i += 30) {
        doc.circle(i, doc.page.height - 20, 3).fill('#E5E7EB');
      }
    });

    // Final page
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F0F9FF');
    
    doc.fillColor(primaryColor)
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('Slut på sagan! 🌟', 40, 200, { align: 'center', width: doc.page.width - 80 });
    
    doc.fillColor(textColor)
       .fontSize(16)
       .font('Helvetica')
       .text(`Tack för att du läste ${story.childName}s äventyr!`, 40, 250, { 
         align: 'center', 
         width: doc.page.width - 80 
       });
    
    doc.fillColor(subtitleColor)
       .fontSize(12)
       .font('Helvetica-Oblique')
       .text('Skapad med AI Sagoskapare', 40, 300, { 
         align: 'center', 
         width: doc.page.width - 80 
       });

    doc.end();
  });
}

async function sendStoryEmail(customerEmail, story, pdfBuffer) {
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;
  
  // Check if email credentials are configured
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('❌ Email credentials not configured');
    console.log('EMAIL_USER exists:', !!EMAIL_USER);
    console.log('EMAIL_PASS exists:', !!EMAIL_PASS);
    throw new Error('Email service not configured. Please set EMAIL_USER and EMAIL_PASS environment variables in Netlify.');
  }

  console.log('📧 Configuring email transport...');
  
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
    
    // Test the connection
    await transporter.verify();
    console.log('✅ Email transport verified successfully');
    
  } catch (transportError) {
    console.error('❌ Email transport configuration failed:', transportError.message);
    
    // Try alternative SMTP configuration
    try {
      console.log('🔄 Trying alternative SMTP configuration...');
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      await transporter.verify();
      console.log('✅ Alternative SMTP configuration successful');
      
    } catch (altError) {
      console.error('❌ Alternative SMTP also failed:', altError.message);
      throw new Error(`Email configuration failed: ${transportError.message}. Please check your Gmail app password.`);
    }
  }
  
  const mailOptions = {
    from: `"AI Sagoskapare" <${EMAIL_USER}>`,
    to: customerEmail,
    subject: `🌟 Din personliga saga: "${story.title}" är klar!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Din saga är klar!</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: bold;">🎉 Din saga är klar!</h1>
            <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">Personlig berättelse skapad med AI</p>
          </div>
          
          <!-- Main content -->
          <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hej!</p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Vi har skapat en helt unik och personlig saga för <strong style="color: #4F46E5;">${story.childName}</strong>:
            </p>
            
            <!-- Story info box -->
            <div style="background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%); border: 2px solid #0EA5E9; border-radius: 15px; padding: 25px; margin: 30px 0;">
              <h2 style="color: #0F172A; margin: 0 0 15px 0; font-size: 22px; text-align: center;">📖 ${story.title}</h2>
              
              <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 20px 0;">
                <div style="background: #FFFFFF; padding: 10px 15px; border-radius: 20px; border: 1px solid #E2E8F0;">
                  <span style="color: #475569; font-size: 14px;">📚 Personlig berättelse</span>
                </div>
                <div style="background: #FFFFFF; padding: 10px 15px; border-radius: 20px; border: 1px solid #E2E8F0;">
                  <span style="color: #475569; font-size: 14px;">🎨 ${story.images} AI-bilder</span>
                </div>
                <div style="background: #FFFFFF; padding: 10px 15px; border-radius: 20px; border: 1px solid #E2E8F0;">
                  <span style="color: #475569; font-size: 14px;">📄 Professionell PDF</span>
                </div>
              </div>
            </div>
            
            <h3 style="color: #1F2937; font-size: 18px; margin: 30px 0 15px 0;">🎯 Vad kan du göra med din saga?</h3>
            
            <div style="background: #F9FAFB; border-left: 4px solid #10B981; padding: 20px; margin: 20px 0;">
              <ul style="margin: 0; padding: 0; list-style: none;">
                <li style="color: #374151; font-size: 15px; margin: 8px 0; padding-left: 25px; position: relative;">
                  <span style="position: absolute; left: 0; color: #10B981;">📱</span>
                  Läs direkt på din telefon, surfplatta eller dator
                </li>
                <li style="color: #374151; font-size: 15px; margin: 8px 0; padding-left: 25px; position: relative;">
                  <span style="position: absolute; left: 0; color: #10B981;">🖨️</span>
                  Skriv ut för att skapa en fysisk bok att hålla i
                </li>
                <li style="color: #374151; font-size: 15px; margin: 8px 0; padding-left: 25px; position: relative;">
                  <span style="position: absolute; left: 0; color: #10B981;">👨‍👩‍👧‍👦</span>
                  Dela med vänner, familj och mor-/farföräldrar
                </li>
                <li style="color: #374151; font-size: 15px; margin: 8px 0; padding-left: 25px; position: relative;">
                  <span style="position: absolute; left: 0; color: #10B981;">💾</span>
                  Spara som en minnesgåva för framtiden
                </li>
              </ul>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 30px 0;">
              Vi hoppas att <strong>${story.childName}</strong> kommer att älska sitt personliga äventyr! 
              Varje saga är unik och skapad med avancerad AI-teknologi för att ge den bästa läsupplevelsen.
            </p>
            
            <div style="background: #FEF3C7; border-radius: 10px; padding: 20px; margin: 30px 0; text-align: center;">
              <p style="color: #92400E; margin: 0; font-size: 14px; font-style: italic;">
                💡 Tips: PDF:en öppnas bäst i en PDF-läsare som Adobe Reader för bästa kvalitet!
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin: 0 0 10px 0; font-size: 16px;">
              Varma hälsningar,<br>
              <strong style="color: #4F46E5;">AI Sagoskapare</strong> 🤖✨
            </p>
            
            <div style="margin: 20px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; line-height: 1.4;">
                Detta email skickades eftersom du beställde en personlig saga från AI Sagoskapare.<br>
                Skapad med OpenAI DALL-E 3 och GPT-teknologi.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: `${story.title} - ${story.childName}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  try {
    console.log(`📧 Sending email to: ${customerEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
    
  } catch (sendError) {
    console.error('❌ Failed to send email:', sendError.message);
    throw new Error(`Email delivery failed: ${sendError.message}`);
  }
}