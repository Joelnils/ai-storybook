// API Client for Netlify Functions
class NetlifyAPIClient {
    constructor() {
        // Force Netlify functions for production
        console.log('🌐 Current location:', window.location.href);
        console.log('🌐 Current hostname:', window.location.hostname);
        
        // Always use Netlify functions unless explicitly on localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.baseURL = 'http://localhost:8888/.netlify/functions';
            console.log('🏠 Using localhost functions');
        } else {
            // Use relative path to avoid CORS issues
            this.baseURL = '/.netlify/functions';
            console.log('🌐 Using relative Netlify functions path');
        }
        
        console.log('🌐 Netlify API Client initialized with base URL:', this.baseURL);
    }

    async testFunction() {
        console.log('🧪 Testing Netlify Functions...');
        
        try {
            const response = await fetch(`${this.baseURL}/test`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Netlify Functions test successful:', data);
            return data;

        } catch (error) {
            console.error('❌ Netlify Functions test failed:', error);
            throw error;
        }
    }

    async healthCheck() {
        console.log('🏥 Health check not needed for Netlify Functions');
        return { status: 'OK' };
    }

    async createPaymentIntent(storyData) {
        console.log('💳 Creating Stripe checkout session...');
        
        try {
            const response = await fetch(`${this.baseURL}/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ storyData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Checkout session created successfully');
            return data;

        } catch (error) {
            console.error('❌ Payment setup error:', error);
            throw error;
        }
    }

    async generateStory(storyData) {
        console.log('📖 Generating story...');
        
        try {
            const response = await fetch(`${this.baseURL}/generate-story`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ storyData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Story generated successfully');
            return data;

        } catch (error) {
            console.error('❌ Story generation error:', error);
            throw error;
        }
    }

    async generateCompleteStory(storyData) {
        console.log('🎯 Starting email delivery story generation...');
        
        try {
            const response = await fetch(`${this.baseURL}/generate-and-email-story`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(storyData)
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('Failed to parse response:', jsonError);
                throw new Error('Server returned invalid response');
            }
            
            console.log('✅ Story generation and email delivery initiated');
            return result;

        } catch (error) {
            console.error('❌ Story generation error:', error);
            throw error;
        }
    }

    async generateImagesInBackground(story) {
        console.log('🎨 Starting background image generation...');
        
        try {
            // Start background image generation
            const imageResponse = await fetch(`${this.baseURL}/generate-images-background`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    storyContent: story.content,
                    childName: story.childName,
                    childAge: story.childAge || '6-8',
                    theme: story.theme,
                    storyId: story.storyId
                })
            });

            if (imageResponse.ok) {
                let imageResult;
                try {
                    imageResult = await imageResponse.json();
                    console.log('✅ Background image generation completed');
                    
                    // Update the page with real images
                    if (typeof window !== 'undefined' && window.updateStoryImages) {
                        window.updateStoryImages(story.storyId, imageResult.images);
                    }
                    
                    return imageResult;
                } catch (jsonError) {
                    console.warn('⚠️ Background image response parsing failed:', jsonError);
                }
            } else {
                console.warn('⚠️ Background image generation failed:', imageResponse.status);
            }
        } catch (error) {
            console.warn('Background image generation error:', error);
        }
    }

    async generateImages(storyContent, theme) {
        console.log('🎨 Generating images...');
        
        try {
            const response = await fetch(`${this.baseURL}/generate-images`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ storyContent, theme })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Images generated successfully');
            return data;

        } catch (error) {
            console.error('❌ Image generation error:', error);
            throw error;
        }
    }

    async createAndEmailPDF(data) {
        console.log('📄 Creating PDF and sending email...');
        
        try {
            const response = await fetch(`${this.baseURL}/create-and-email-pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ PDF created and email sent successfully');
            return result;

        } catch (error) {
            console.error('❌ PDF creation/email error:', error);
            throw error;
        }
    }

    async createPDF(story) {
        console.log('📄 Creating PDF using jsPDF in browser...');
        
        try {
            // Use jsPDF to create PDF in browser
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.text(story.title, 20, 30);
            
            // Add subtitle
            doc.setFontSize(14);
            doc.text(`En personlig saga för ${story.childName}`, 20, 45);
            
            // Add story content
            doc.setFontSize(12);
            const paragraphs = story.content.split('\\n\\n').filter(p => p.trim());
            let yPosition = 65;
            
            paragraphs.forEach((paragraph, index) => {
                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 30;
                }
                
                // Add paragraph
                const lines = doc.splitTextToSize(paragraph, 170);
                doc.text(lines, 20, yPosition);
                yPosition += lines.length * 7;
                
                // Add space for image placeholder
                if (story.images && story.images[index]) {
                    yPosition += 20;
                    doc.text(`[Bild: ${story.images[index].description}]`, 20, yPosition);
                    yPosition += 15;
                }
                
                yPosition += 10; // Extra space between paragraphs
            });
            
            console.log('✅ PDF created successfully');
            return doc;

        } catch (error) {
            console.error('❌ PDF creation error:', error);
            throw error;
        }
    }
}

// Create global API client instance
const netlifyAPI = new NetlifyAPIClient();