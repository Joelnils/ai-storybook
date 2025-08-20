// Simple API Client for Streamlined Storybook
const SIMPLE_API_BASE = 'http://localhost:3001';

class SimpleAPIClient {
    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${SIMPLE_API_BASE}/health`);
            return await response.json();
        } catch (error) {
            console.error('❌ Health check failed:', error);
            throw error;
        }
    }

    // Create Stripe Checkout session
    async createPaymentIntent(storyData) {
        try {
            console.log('💳 Creating payment intent...');
            
            const response = await fetch(`${SIMPLE_API_BASE}/api/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ storyData })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Payment setup failed');
            }

            console.log('✅ Payment intent created successfully');
            return result;

        } catch (error) {
            console.error('❌ Payment setup error:', error);
            throw error;
        }
    }

    // Generate complete story with images (for demo purposes)
    async generateStory(storyData) {
        try {
            console.log('🎯 Starting story generation...');
            
            const response = await fetch(`${SIMPLE_API_BASE}/api/generate-story`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(storyData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Story generation failed');
            }

            console.log('✅ Story generated successfully');
            return result;

        } catch (error) {
            console.error('❌ Story generation error:', error);
            throw error;
        }
    }

    // Generate story with images AND send email (development mode)
    async generateStoryWithEmail(storyData) {
        try {
            console.log('🎯 Starting story generation with email...');
            
            const response = await fetch(`${SIMPLE_API_BASE}/api/generate-story-with-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(storyData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Story generation with email failed');
            }

            console.log('✅ Story generated and emailed successfully');
            return result;

        } catch (error) {
            console.error('❌ Story generation with email error:', error);
            throw error;
        }
    }

    // Generate demo images
    async generateDemoImages(storyId, storyTitle, content) {
        try {
            console.log('🎨 Generating demo images for:', storyTitle);
            
            const response = await fetch(`${SIMPLE_API_BASE}/api/generate-demo-images`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ storyId, storyTitle, content })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Demo image generation failed');
            }

            console.log('✅ Demo images generated successfully');
            return result;

        } catch (error) {
            console.error('❌ Demo image generation error:', error);
            throw error;
        }
    }

    // Create PDF from story (client-side with jsPDF) - matching browser demo style exactly
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
                        console.warn('Could not add story image for page', index + 1);
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
                    yPosition += 8; // Line height matching browser 1.8 ratio
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
            img.crossOrigin = 'anonymous';
            
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
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
        });
    }
}

// Create global instance
const simpleAPI = new SimpleAPIClient();

// Export for use in other scripts
window.simpleAPI = simpleAPI;