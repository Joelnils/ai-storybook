// Frontend-Only API Client for Static Deployment
class FrontendAPIClient {
    constructor() {
        // These will be configured via environment variables or config
        this.OPENAI_API_KEY = window.ENV?.OPENAI_API_KEY || '';
        this.STRIPE_PUBLISHABLE_KEY = window.ENV?.STRIPE_PUBLISHABLE_KEY || '';
        this.EMAILJS_SERVICE_ID = window.ENV?.EMAILJS_SERVICE_ID || '';
        this.EMAILJS_TEMPLATE_ID = window.ENV?.EMAILJS_TEMPLATE_ID || '';
        this.EMAILJS_USER_ID = window.ENV?.EMAILJS_USER_ID || '';
    }

    // Create Stripe Checkout session (frontend-only)
    async createPaymentIntent(storyData) {
        try {
            console.log('💳 Creating Stripe checkout session...');
            
            if (!this.STRIPE_PUBLISHABLE_KEY) {
                throw new Error('Stripe publishable key not configured');
            }

            const stripe = Stripe(this.STRIPE_PUBLISHABLE_KEY);
            
            // For frontend-only, we'll redirect to Stripe Checkout directly
            // In a real scenario, you'd create this via Stripe's API or a serverless function
            const session = await stripe.redirectToCheckout({
                lineItems: [{
                    price_data: {
                        currency: 'sek',
                        product_data: {
                            name: `Personlig saga: ${storyData.title}`,
                            description: `En personlig AI-genererad saga för ${storyData.childName}`,
                        },
                        unit_amount: 5000, // 50 kr in öre
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                successUrl: `${window.location.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&email=${storyData.parentEmail}`,
                cancelUrl: `${window.location.origin}/simple.html?canceled=true`,
                customerEmail: storyData.parentEmail,
            });

            return {
                success: true,
                sessionId: session.id
            };

        } catch (error) {
            console.error('❌ Payment setup error:', error);
            throw error;
        }
    }

    // Generate story using OpenAI API directly
    async generateStory(storyData) {
        try {
            console.log('🎯 Generating story with Netlify Functions...');
            
            // Use Netlify Functions for API calls
            const apiUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:8080/.netlify/functions/generate-story'
                : '/.netlify/functions/generate-story';
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ storyData })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Story API error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Story generation failed');
            }

            // Generate images for the story
            const images = await this.generateImages(result.story.content, storyData.theme);
            
            return {
                success: true,
                story: {
                    ...result.story,
                    images: images
                }
            };

        } catch (error) {
            console.error('❌ Story generation error:', error);
            throw error;
        }
    }

    // Generate images using Netlify Functions
    async generateImages(storyContent, theme) {
        try {
            console.log('🎨 Generating images with Netlify Functions...');
            
            // Use Netlify Functions for image generation
            const apiUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:8080/.netlify/functions/generate-images'
                : '/.netlify/functions/generate-images';
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    storyContent,
                    theme 
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Image API error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Image generation failed');
            }

            console.log('✅ Generated', result.images.length, 'images successfully');
            return result.images;

        } catch (error) {
            console.error('❌ Image generation error:', error);
            return []; // Return empty array if image generation fails
        }
    }

    // Send email using EmailJS
    async sendStoryEmail(parentEmail, story, pdfBlob) {
        try {
            console.log('📧 Sending email via EmailJS...');
            
            if (!this.EMAILJS_SERVICE_ID || !this.EMAILJS_TEMPLATE_ID || !this.EMAILJS_USER_ID) {
                throw new Error('EmailJS not configured');
            }

            // Convert PDF blob to base64
            const pdfBase64 = await this.blobToBase64(pdfBlob);

            const emailParams = {
                to_email: parentEmail,
                child_name: story.childName,
                story_title: story.title,
                pdf_attachment: pdfBase64,
                message: `Din personliga saga "${story.title}" för ${story.childName} är nu klar! PDF-filen är bifogad.`
            };

            const result = await emailjs.send(
                this.EMAILJS_SERVICE_ID,
                this.EMAILJS_TEMPLATE_ID,
                emailParams,
                this.EMAILJS_USER_ID
            );

            console.log('✅ Email sent successfully');
            return { success: true, result };

        } catch (error) {
            console.error('❌ Email sending error:', error);
            throw error;
        }
    }

    // Helper: Convert blob to base64
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Create PDF from story (client-side with jsPDF)
    async createPDF(story) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Story content pages - matching browser layout exactly (no separate cover page)
            const paragraphs = story.content.split('\n\n').filter(p => p.trim());
            
            // Process each paragraph as a page (like browser demo)
            for (let index = 0; index < paragraphs.length; index++) {
                if (index > 0) doc.addPage(); // Don't add page for first paragraph
                const paragraph = paragraphs[index];
                
                // Add page background (subtle like browser)
                doc.setFillColor(254, 254, 254);
                doc.rect(15, 15, 180, 265, 'F');
                
                // Add story title at top of first page (like browser demo)
                if (index === 0) {
                    doc.setFontSize(22);
                    doc.setTextColor(102, 126, 234);
                    doc.text(story.title, 105, 35, { align: 'center' });
                    
                    doc.setFontSize(14);
                    doc.setTextColor(107, 114, 128);
                    doc.text(`En personlig saga för ${story.childName}`, 105, 50, { align: 'center' });
                }
                
                // Add story image at top of page (like browser layout)
                const storyImage = story.images && story.images.find(img => img.position === index);
                const imageStartY = index === 0 ? 60 : 25; // Lower on first page due to title
                
                if (storyImage) {
                    try {
                        const imgData = await this.getImageAsBase64(storyImage.url);
                        // Image at top, full width like browser
                        doc.addImage(imgData, 'PNG', 20, imageStartY, 170, 120);
                    } catch (imgError) {
                        // Images from external sources (like Azure blob storage) may fail due to CORS
                        console.warn(`Image ${index + 1} could not be embedded in PDF due to CORS restrictions`);
                        // Add descriptive placeholder when image fails to load due to CORS
                        doc.setFontSize(14);
                        doc.setTextColor(100, 100, 100);
                        
                        // Create a nice placeholder box
                        doc.setDrawColor(200, 200, 200);
                        doc.setFillColor(248, 248, 248);
                        doc.roundedRect(20, imageStartY, 170, 120, 8, 8, 'FD');
                        
                        // Add placeholder text
                        doc.setTextColor(120, 120, 120);
                        doc.setFontSize(16);
                        doc.text('🖼️', 105, imageStartY + 50, { align: 'center' });
                        doc.setFontSize(12);
                        doc.text(storyImage.description || `Illustration ${index + 1}`, 105, imageStartY + 70, { align: 'center' });
                        doc.setFontSize(10);
                        doc.text('(Bilder visas i webbläsaren)', 105, imageStartY + 85, { align: 'center' });
                        
                        doc.setTextColor(45, 55, 72); // Reset text color
                    }
                }
                
                // Add text below image - exactly like browser styling
                doc.setFontSize(16); // Matching browser 1.3rem
                doc.setTextColor(45, 55, 72); // Matching browser #2d3748
                
                // Text positioning and spacing like browser
                const textStartY = storyImage ? (imageStartY + 130) : (index === 0 ? 60 : 50);
                const lines = doc.splitTextToSize(paragraph.trim(), 170);
                
                // Add text with browser-matching line spacing
                let yPosition = textStartY;
                lines.forEach((line) => {
                    if (yPosition > 270) { // Keep within page bounds
                        doc.addPage();
                        yPosition = 50;
                    }
                    doc.text(line, 25, yPosition); // Left aligned like browser
                    yPosition += 7; // Good line spacing
                });
                
                // Add subtle page styling (rounded corners effect with borders)
                doc.setDrawColor(245, 245, 245);
                doc.setLineWidth(0.5);
                doc.roundedRect(15, 15, 180, 265, 3, 3, 'S');
            }

            return doc;

        } catch (error) {
            console.error('❌ PDF creation error:', error);
            throw error;
        }
    }

    // Helper: Convert image URL to base64
    async getImageAsBase64(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            // Don't set crossOrigin for Azure blob storage URLs - causes CORS issues
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                try {
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (error) {
                    // This will happen with external images due to CORS "tainted canvas"
                    reject(error);
                }
            };
            
            img.onerror = (error) => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = imageUrl;
        });
    }
}

// Create global instance
const frontendAPI = new FrontendAPIClient();

// Export for use in other scripts
window.frontendAPI = frontendAPI;