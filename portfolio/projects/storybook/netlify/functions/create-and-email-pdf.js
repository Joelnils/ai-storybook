const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
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
    const { story, customerEmail } = JSON.parse(event.body);
    
    console.log('📄 Creating PDF for story:', story.title);
    
    // Create PDF
    const pdfBuffer = await createStoryPDF(story);
    
    console.log('📧 Sending email to:', customerEmail);
    
    // Send email with PDF attachment
    await sendStoryEmail(customerEmail, story, pdfBuffer);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'PDF created and email sent successfully'
      })
    };

  } catch (error) {
    console.error('PDF creation/email error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

async function createStoryPDF(story) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Title page
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(story.title, 50, 100, { align: 'center' });
      
      doc.fontSize(16)
         .font('Helvetica')
         .text(`En personlig saga för ${story.childName}`, 50, 150, { align: 'center' });
      
      doc.fontSize(12)
         .text(`Skapad med AI Sagoskapare`, 50, 200, { align: 'center' });
      
      // Split story into paragraphs
      const paragraphs = story.content.split('\n\n').filter(p => p.trim());
      
      for (let i = 0; i < paragraphs.length; i++) {
        doc.addPage();
        
        // Add image if available
        const storyImage = story.images.find(img => img.position === i);
        let yPosition = 50;
        
        if (storyImage && !storyImage.isFallback) {
          try {
            // Download image
            const imageResponse = await fetch(storyImage.url);
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.buffer();
              
              // Add image to PDF
              doc.image(imageBuffer, 50, yPosition, {
                width: 400,
                height: 300,
                fit: [400, 300],
                align: 'center'
              });
              yPosition += 320;
            }
          } catch (imgError) {
            console.warn('Could not add image to PDF:', imgError);
          }
        }
        
        // Add text
        doc.fontSize(12)
           .font('Helvetica')
           .text(paragraphs[i], 50, yPosition, {
             width: 500,
             align: 'left',
             lineGap: 5
           });
      }
      
      // Footer on last page
      doc.fontSize(10)
         .text(`\n\nSkapad med AI Sagoskapare - ${new Date().toLocaleDateString('sv-SE')}`, 50, doc.page.height - 100, {
           align: 'center'
         });
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

async function sendStoryEmail(customerEmail, story, pdfBuffer) {
  // Configure email transporter (you'll need to add email credentials)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email service
    auth: {
      user: process.env.EMAIL_USER, // Add to Netlify env vars
      pass: process.env.EMAIL_PASS  // Add to Netlify env vars
    }
  });
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: `Din personliga saga: ${story.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">🎉 Din saga är klar!</h2>
        
        <p>Hej!</p>
        
        <p>Tack för din beställning! Din personliga saga <strong>"${story.title}"</strong> för ${story.childName} är nu klar.</p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📖 Om din saga:</h3>
          <ul>
            <li><strong>Titel:</strong> ${story.title}</li>
            <li><strong>Huvudperson:</strong> ${story.childName}</li>
            <li><strong>Tema:</strong> ${story.theme}</li>
            <li><strong>Sidor:</strong> ${story.images.length} sidor med illustrationer</li>
          </ul>
        </div>
        
        <p>Din saga finns bifogad som en PDF-fil som du kan:</p>
        <ul>
          <li>📱 Läsa på din telefon eller surfplatta</li>
          <li>🖨️ Skriva ut och binda till en riktig bok</li>
          <li>💾 Spara som ett minne för framtiden</li>
        </ul>
        
        <p>Vi hoppas att ${story.childName} kommer att älska sin personliga saga!</p>
        
        <p>Med vänliga hälsningar,<br>
        <strong>AI Sagoskapare</strong></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          Har du frågor? Svara på detta email så hjälper vi dig gärna.
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
  console.log('✅ Email sent successfully to:', customerEmail);
}