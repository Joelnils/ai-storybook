// Global variables
let selectedTheme = '';
let currentStory = null;
let stripe = null;
let elements = null;
let paymentElement = null;

// Theme selection
document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', function() {
        // Remove selected class from all options
        document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('selected'));
        
        // Add selected class to clicked option
        this.classList.add('selected');
        selectedTheme = this.dataset.theme;
    });
});

// Story generation
document.getElementById('storyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    generateStory();
});

// Initialize Stripe when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Get Stripe publishable key from backend
        const response = await api.request('/payments/config');
        const config = response.data;
        
        // Initialize Stripe
        stripe = Stripe(config.publishableKey);
        console.log('✅ Stripe initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Stripe:', error);
        // For demo purposes, use a test key if backend is unavailable
        stripe = Stripe('pk_test_51HvQwTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    }
});

async function generateStory() {
    const formData = {
        title: document.getElementById('storyTitle').value,
        childName: document.getElementById('childName').value,
        childAge: document.getElementById('childAge').value,
        theme: selectedTheme,
        details: document.getElementById('storyDetails').value,
        includeImages: true,
        imageStyle: 'cartoon'
    };

    // Validate form first
    if (!formData.title || !formData.childName || !formData.childAge || !selectedTheme) {
        authManager.showNotification('🙋‍♀️ Fyll i alla obligatoriska fält och välj ett tema för din saga!', 'error');
        return;
    }

    // Check authentication first
    if (!api.isAuthenticated()) {
        authManager.showAuthModal();
        return;
    }

    // Show payment modal instead of generating immediately
    showPaymentModal(formData);
}

// Payment Modal Functions
async function showPaymentModal(storyData) {
    // Update payment modal with story details
    document.getElementById('paymentStoryTitle').textContent = `"${storyData.title}"`;
    document.getElementById('paymentStoryDetails').textContent = 
        `Personlig saga för ${storyData.childName} (${storyData.childAge} år) med tema: ${getThemeDisplayName(storyData.theme)}`;
    
    // Show payment modal
    document.getElementById('paymentModal').classList.add('show');
    
    try {
        // Create payment intent on backend
        const response = await api.createCustomStoryPaymentIntent(storyData);
        
        if (response.success) {
            await initializeStripeElements(response.data.clientSecret, storyData, response.data.paymentIntentId);
        } else {
            throw new Error(response.error || 'Failed to create payment intent');
        }
    } catch (error) {
        console.error('Payment setup error:', error);
        closePaymentModal();
        authManager.showNotification('Kunde inte förbereda betalning. Försök igen.', 'error');
    }
}

async function initializeStripeElements(clientSecret, storyData, paymentIntentId) {
    if (!stripe) {
        throw new Error('Stripe not initialized');
    }
    
    const isDevelopmentMode = clientSecret.includes('_dev_');
    
    if (isDevelopmentMode) {
        // Development mode: Skip Stripe Elements creation
        console.log('🔧 Development mode: Skipping Stripe Elements initialization');
        
        // Hide payment element and show development notice
        const paymentElementContainer = document.querySelector('.payment-element');
        paymentElementContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: #f0f9ff; border: 2px dashed #0ea5e9; border-radius: 10px;">
                <h4 style="color: #0ea5e9; margin-bottom: 1rem;">🔧 Development Mode</h4>
                <p style="color: #475569;">Stripe payment skipped for testing</p>
                <p style="color: #64748b; font-size: 0.9rem;">Click "Pay" to proceed with story generation</p>
            </div>
        `;
    } else {
        // Create Elements instance
        elements = stripe.elements({
            clientSecret: clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#7c3aed',
                    colorBackground: '#ffffff',
                    colorText: '#1f2937',
                    colorDanger: '#ef4444',
                    borderRadius: '15px'
                }
            }
        });
        
        // Create and mount Payment Element
        paymentElement = elements.create('payment');
        paymentElement.mount('.payment-element');
    }
    
    // Handle form submission (same for both modes)
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handlePaymentSubmission(clientSecret, storyData, paymentIntentId);
    });
}

async function handlePaymentSubmission(clientSecret, storyData, paymentIntentId) {
    const submitButton = document.getElementById('submit-payment');
    submitButton.disabled = true;
    submitButton.textContent = 'Bearbetar...';
    
    // Show payment processing
    document.getElementById('paymentProcessing').classList.add('show');
    
    try {
        // Check if this is a development mode mock payment
        const isDevelopmentMode = clientSecret && clientSecret.includes('_dev_');
        
        let paymentIntent;
        
        if (isDevelopmentMode) {
            // Development mode: Skip Stripe confirmation
            console.log('🔧 Development mode: Skipping Stripe payment confirmation');
            paymentIntent = {
                id: paymentIntentId,
                status: 'succeeded'
            };
        } else {
            // Production mode: Confirm payment with Stripe
            if (!elements) {
                throw new Error('Stripe Elements not initialized');
            }
            
            const result = await stripe.confirmPayment({
                elements,
                redirect: 'if_required'
            });
            
            if (result.error) {
                throw result.error;
            }
            
            paymentIntent = result.paymentIntent;
        }
        
        if (paymentIntent.status === 'succeeded') {
            // Payment successful, now generate story
            await generateStoryAfterPayment(paymentIntent.id);
        } else {
            throw new Error('Payment not completed');
        }
    } catch (error) {
        console.error('Payment error:', error);
        
        // Hide payment processing
        document.getElementById('paymentProcessing').classList.remove('show');
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = '🪄 Betala och Skapa Saga (€7.99)';
        
        let errorMessage = 'Betalning misslyckades. Försök igen.';
        if (error.type === 'card_error' || error.type === 'validation_error') {
            errorMessage = error.message;
        }
        
        authManager.showNotification(errorMessage, 'error');
    }
}

async function generateStoryAfterPayment(paymentIntentId) {
    try {
        // Close payment modal and show story generation loading
        closePaymentModal();
        document.getElementById('paymentProcessing').classList.remove('show');
        document.getElementById('loadingAnimation').classList.add('show');
        
        console.log('🔄 Starting story generation after payment...');
        
        // Generate story using payment confirmation
        const response = await api.generateStoryFromPayment(paymentIntentId);
        
        if (response.success) {
            console.log('✅ Story generated successfully after payment');
            
            // Hide loading and display story
            document.getElementById('loadingAnimation').classList.remove('show');
            displayGeneratedStory(response.data);
            authManager.showNotification('Saga skapad och betald! ✨', 'success');
        } else {
            throw new Error(response.error || 'Story generation failed');
        }
    } catch (error) {
        console.error('Story generation after payment failed:', error);
        
        // Hide loading
        document.getElementById('loadingAnimation').classList.remove('show');
        
        authManager.showNotification('Betalning mottagen men story generation misslyckades. Kontakta support.', 'error');
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('show');
    
    // Clean up Stripe elements
    if (paymentElement) {
        paymentElement.destroy();
        paymentElement = null;
    }
    if (elements) {
        elements = null;
    }
}

function getThemeDisplayName(theme) {
    const themes = {
        'adventure': 'Äventyr',
        'fantasy': 'Fantasy', 
        'animals': 'Djur',
        'space': 'Rymden',
        'underwater': 'Havet',
        'friendship': 'Vänskap'
    };
    return themes[theme] || theme;
}

// Display generated story as a picture book
function displayGeneratedStory(storyData) {
    console.log('Creating picture book for:', storyData);
    
    // Hide everything else
    document.getElementById('loadingAnimation').style.display = 'none';
    document.querySelector('.create-story').style.display = 'none';
    document.getElementById('storyResult').style.display = 'none';
    
    // Create picture book overlay
    createPictureBook(storyData);
}

function createPictureBook(storyData) {
    // Remove existing book if any
    const existingBook = document.getElementById('pictureBook');
    if (existingBook) {
        existingBook.remove();
    }
    
    // Split story into paragraphs (same as backend)
    const paragraphs = storyData.content.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
    const pages = [];
    
    // Title page with cover image
    const coverImage = storyData.generatedImages && storyData.generatedImages.find(img => 
        img.position === 'cover'
    );
    
    pages.push({
        title: storyData.title || 'Din Magiska Saga',
        subtitle: `En saga för ${storyData.childName}`,
        content: '',
        isTitle: true,
        image: coverImage
    });
    
    // Story pages (one paragraph per page - matches backend logic)
    for (let i = 0; i < paragraphs.length; i++) {
        const pageContent = paragraphs[i];
        
        if (pageContent) {
            // Find the exact image for this page position (i is the paragraph index, which matches backend)
            const pageImage = storyData.generatedImages && storyData.generatedImages.find(img => 
                img.position === i // Backend uses 0-indexed positions for pages ('cover' is cover)
            );
            
            pages.push({
                content: pageContent,
                pageNumber: i + 1,
                image: pageImage
            });
        }
    }
    
    let currentPage = 0;
    
    // Create book HTML
    const bookHTML = `
        <div id="pictureBook" class="picture-book-overlay">
            <div class="picture-book">
                <button class="book-close" onclick="closePictureBook()">&times;</button>
                <div class="book-pages">
                    <div class="book-page active" id="page-${currentPage}">
                        ${renderPage(pages[0])}
                    </div>
                </div>
                <div class="book-controls">
                    <div class="book-navigation">
                        <button class="page-btn" id="prevBtn" onclick="previousPage()" disabled>← Föregående</button>
                        <span class="page-counter">Sida 1 av ${pages.length}</span>
                        <button class="page-btn" id="nextBtn" onclick="nextPage()">Nästa →</button>
                    </div>
                    <div class="book-downloads">
                        <button class="download-btn book-download-btn" onclick="downloadPDF()">📄 PDF</button>
                        <button class="download-btn book-download-btn" onclick="downloadEPUB()">📚 EPUB</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add book CSS
    const bookStyle = `
        <style id="picture-book-styles">
        .picture-book-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        }
        
        .picture-book {
            width: 95%;
            max-width: 1000px;
            height: 700px;
            background: #fff;
            border-radius: 20px;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        
        .book-close {
            position: absolute;
            top: 15px;
            right: 15px;
            width: 40px;
            height: 40px;
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            z-index: 1001;
        }
        
        .book-pages {
            height: calc(100% - 90px);
            padding: 0;
            overflow: hidden;
        }
        
        .book-page {
            display: none;
            height: 100%;
            animation: slideIn 0.5s ease;
            position: relative;
        }
        
        .book-page.active {
            display: block;
        }
        
        .page-layout {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .page-image-section {
            flex: 3;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 75%;
            padding: 0;
            width: 100%;
        }
        
        .page-full-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .page-text-section {
            background: rgba(255, 255, 255, 0.98);
            padding: 1rem 1.5rem;
            text-align: center;
            border-radius: 15px 15px 0 0;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
            min-height: 15%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            margin-top: auto;
        }
        
        .page-text-section.centered {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: transparent;
            box-shadow: none;
        }
        
        .page-title {
            font-family: 'Fredoka', cursive;
            font-size: 1.8rem;
            color: #1f2937;
            margin-bottom: 0.3rem;
        }
        
        .page-subtitle {
            font-size: 1rem;
            color: #374151;
            margin-bottom: 0.5rem;
        }
        
        .page-content {
            font-size: 1.1rem;
            line-height: 1.5;
            color: #1f2937;
        }
        
        .book-controls {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: #f8f9fa;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 40px;
        }
        
        .book-navigation {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .book-downloads {
            display: flex;
            gap: 10px;
        }
        
        .book-download-btn {
            background: #10b981;
            font-size: 0.9rem;
            padding: 8px 16px;
        }
        
        .book-download-btn:hover {
            background: #059669;
        }
        
        .page-btn {
            background: #f59e0b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .page-btn:hover:not(:disabled) {
            background: #e08c0a;
            transform: translateY(-2px);
        }
        
        .page-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .page-counter {
            font-weight: 500;
            color: #666;
        }
        
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
        }
        </style>
    `;
    
    // Add to page
    document.head.insertAdjacentHTML('beforeend', bookStyle);
    document.body.insertAdjacentHTML('beforeend', bookHTML);
    
    // Store pages globally for navigation
    window.bookPages = pages;
    window.currentBookPage = 0;
    
    // Store current story
    currentStory = {
        id: storyData.id,
        title: storyData.title,
        content: storyData.content,
        childName: storyData.childName,
        generatedImages: storyData.generatedImages || []
    };
    
    console.log('Picture book created with', pages.length, 'pages');
}

function renderPage(page) {
    if (page.isTitle) {
        if (page.image && page.image.url) {
            return `
                <div class="page-layout">
                    <div class="page-image-section">
                        <img src="${page.image.url}" alt="Cover illustration" class="page-full-image" />
                    </div>
                    <div class="page-text-section">
                        <div class="page-title">${page.title}</div>
                        <div class="page-subtitle">${page.subtitle}</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="page-layout">
                    <div class="page-text-section centered">
                        <div class="page-title">${page.title}</div>
                        <div class="page-subtitle">${page.subtitle}</div>
                        <div style="font-size: 4rem; margin: 2rem;">📚</div>
                    </div>
                </div>
            `;
        }
    } else {
        if (page.image && page.image.url) {
            return `
                <div class="page-layout">
                    <div class="page-image-section">
                        <img src="${page.image.url}" alt="Story illustration" class="page-full-image" />
                    </div>
                    <div class="page-text-section">
                        <div class="page-content">${page.content}</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="page-layout">
                    <div class="page-text-section centered">
                        <div class="page-content">${page.content}</div>
                        <div style="font-size: 3rem; margin-top: 2rem;">✨</div>
                    </div>
                </div>
            `;
        }
    }
}

function nextPage() {
    if (window.currentBookPage < window.bookPages.length - 1) {
        window.currentBookPage++;
        updateBookPage();
    }
}

function previousPage() {
    if (window.currentBookPage > 0) {
        window.currentBookPage--;
        updateBookPage();
    }
}

function updateBookPage() {
    const pages = document.querySelectorAll('.book-page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Create new page if it doesn't exist
    let currentPageEl = document.getElementById(`page-${window.currentBookPage}`);
    if (!currentPageEl) {
        currentPageEl = document.createElement('div');
        currentPageEl.className = 'book-page';
        currentPageEl.id = `page-${window.currentBookPage}`;
        currentPageEl.innerHTML = renderPage(window.bookPages[window.currentBookPage]);
        document.querySelector('.book-pages').appendChild(currentPageEl);
    }
    
    currentPageEl.classList.add('active');
    
    // Update controls
    document.getElementById('prevBtn').disabled = window.currentBookPage === 0;
    document.getElementById('nextBtn').disabled = window.currentBookPage === window.bookPages.length - 1;
    document.querySelector('.page-counter').textContent = `Sida ${window.currentBookPage + 1} av ${window.bookPages.length}`;
}

function closePictureBook() {
    const book = document.getElementById('pictureBook');
    const styles = document.getElementById('picture-book-styles');
    if (book) book.remove();
    if (styles) styles.remove();
    
    // Show both the story creation and result sections
    document.querySelector('.create-story').style.display = 'block';
    document.getElementById('storyResult').style.display = 'block';
}

// Legacy function for backward compatibility (now removed)
function generateAIStory(formData) {
    // This function is now replaced by the API-based approach
    console.warn('generateAIStory is deprecated. Use displayGeneratedStory instead.');
    
    // Generate story content based on form data (fallback)
    const stories = {
        adventure: {
            content: `En vacker morgon vaknade ${formData.childName} till ljudet av fåglarnas kvitter. Utanför fönstret såg ${formData.childName} något som blänkte i skogen.

            "Det måste vara något magiskt!" tänkte ${formData.childName} och sprang ut för att undersöka.

            I skogen hittade ${formData.childName} en glittrande karta som ledde till en gömd skattkista. Men för att hitta skatten måste ${formData.childName} lösa tre gåtor från skogens visa djur.

            Den första gåtan kom från en klok uggla: "Vad blir våtare ju mer det torkar?" ${formData.childName} tänkte länge och svarade slutligen: "En handduk!" Ugglan nickade och pekade mot öster.

            Efter många äventyr fann ${formData.childName} slutligen skatten - men det var inte guld eller silver. Det var något mycket värdefullare: kunskapen om att mod och vänlighet är de största skatterna av alla.`,
            illustrations: ['🗺️', '🦉', '📦', '✨']
        },
        fantasy: {
            content: `I en tid långt, längt bort levde ${formData.childName} i en magisk värld där enhörningar dansar och draker sjunger.

            En dag upptäckte ${formData.childName} att den magiska kristallen som skyddar landet hade försvunnit! Utan den skulle all magi försvinna för alltid.

            ${formData.childName} fick hjälp av en vänlig drake vid namn Sparkle och tillsammans begav de sig ut på en resa för att hitta kristallen.

            De reste över regnbågsberg och genom molnskog, där de träffade en vis trollkarl som berättade att kristallen var gömd i Månens palats.

            Med mod och vänskap lyckades ${formData.childName} och Sparkle rädda kristallen och återställa magin till landet. Alla firade och ${formData.childName} blev utnämnd till landets första unga trollkarl!`,
            illustrations: ['🦄', '💎', '🐉', '🏰']
        },
        animals: {
            content: `${formData.childName} bodde på en gård med många djur. En dag märkte ${formData.childName} att något var fel - alla djur såg ledsna ut.

            "Vad är det som är fel?" frågade ${formData.childName} den gamla katten Musse.

            "Vi har tappat bort våra glädjetekar," muttrade Musse. "Utan dem kan vi inte skratta eller leka längre."

            ${formData.childName} bestämde sig för att hjälpa sina vänner. Tillsammans med hunden Rufus, kon Bella och grisen Olle letade de överallt.

            Till slut hittade de glädjetekarnas på vinden - de hade bara varit blyga och gömde sig! ${formData.childName} övertalade dem att komma tillbaka, och snart var hela gården fylld av skratt och lek igen.`,
            illustrations: ['🐱', '🐕', '🐷', '😄']
        },
        space: {
            content: `${formData.childName} hade alltid drömt om att resa till rymden. En kväll när ${formData.childName} tittade på stjärnorna, hände något magiskt.

            En liten silverraket landade i trädgården! Ur den klev en vänlig utomjording vid namn Zipp.

            "Hej ${formData.childName}!" sa Zipp. "Jag behöver din hjälp att hitta tillbaka till min hemplanet Stjärnglitter."

            Tillsammans flög de genom rymden och besökte fantastiska planeter. På Marshmallow-planeten var allt mjukt och sött, och på Regnbågsplaneten regnade det färger!

            Till slut hittade de Stjärnglitter, och som tack fick ${formData.childName} en magisk stjärnsten som alltid skulle påminna om deras vänskap.`,
            illustrations: ['🚀', '👽', '🌟', '🪐']
        },
        underwater: {
            content: `${formData.childName} var på semester vid havet när något märkligt hände. En vacker havsnäcka började glittra och plötsligt kunde ${formData.childName} andas under vattnet!

            Nere i havets djup träffade ${formData.childName} en vänlig delfin vid namn Splash som visade vägen till den underbara undervattenstaden Korallheim.

            I staden bodde sjöjungfrur, sjöhästar och pratande fiskar. Men staden var i fara - en ledsen havsunge hade råkat blockera det magiska vattenfallet som gav staden dess energi.

            ${formData.childName} och Splash hjälpte havsungen att flytta de stora stenarna. Som tack fick ${formData.childName} en pärla som alltid skulle skydda mot faror från havet.

            När äventyret var över simmade ${formData.childName} tillbaka till ytan med underbar minnen av vännerna under vattnet.`,
            illustrations: ['🐬', '🧜‍♀️', '💎', '🌊']
        },
        friendship: {
            content: `${formData.childName} var ny i staden och kände sig ensam. Den första dagen i den nya skolan satt ${formData.childName} ensam på en bänk.

            Plötsligt kom en flicka vid namn Lisa fram. "Vill du leka med mig?" frågade hon med ett vänligt leende.

            Lisa visade ${formData.childName} alla de bästa platserna på skolan - det hemliga trädet, den magiska lekplatsen och biblioteket med alla äventyrsböcker.

            Snart blev de bästa vänner och hade så roligt tillsammans. De upptäckte att även om de var olika på många sätt, hade de samma kärlek för äventyr och berättelser.

            ${formData.childName} insåg att det bästa äventyret av alla är att hitta en riktig vän. Och från den dagen var ${formData.childName} aldrig ensam igen.`,
            illustrations: ['👫', '🌳', '📚', '❤️']
        }
    };

    const storyData = stories[formData.theme] || stories.adventure;
    
    // Display generated story
    document.getElementById('generatedTitle').textContent = formData.title;
    document.getElementById('generatedSubtitle').textContent = `En personlig saga för ${formData.childName}`;
    
    // Create story content with illustrations
    const paragraphs = storyData.content.split('\n\n');
    let storyHTML = '';
    
    paragraphs.forEach((paragraph, index) => {
        if (paragraph.trim()) {
            storyHTML += `<div class="story-paragraph">${paragraph.trim()}</div>`;
            
            // Add illustration after every other paragraph
            if (index < storyData.illustrations.length) {
                storyHTML += `<div class="story-illustration">${storyData.illustrations[index]}</div>`;
            }
        }
    });
    
    document.getElementById('storyContent').innerHTML = storyHTML;
    document.getElementById('storyResult').style.display = 'block';
    
    // Scroll to result
    document.getElementById('storyResult').scrollIntoView({ behavior: 'smooth' });
    
    // Store current story for download
    currentStory = {
        title: formData.title,
        content: storyHTML,
        childName: formData.childName
    };
}

async function downloadPDF() {
    if (!currentStory || !currentStory.id) {
        authManager.showNotification('Ingen saga att ladda ner', 'error');
        return;
    }

    if (!api.isAuthenticated()) {
        authManager.showAuthModal();
        return;
    }

    try {
        // Show loading state
        const downloadBtn = document.querySelector('.download-btn');
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = 'Skapar PDF...';
        downloadBtn.disabled = true;

        const response = await api.generatePDF(currentStory.id);
        
        if (response.success) {
            // Create download link
            const link = document.createElement('a');
            link.href = `http://localhost:3001${response.data.downloadUrl}`;
            link.download = response.data.filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            authManager.showNotification('PDF skapad och nedladdning startad! 📱', 'success');
        }
    } catch (error) {
        console.error('PDF generation error:', error);
        authManager.showNotification('Kunde inte skapa PDF. Försök igen.', 'error');
    } finally {
        // Reset button
        const downloadBtn = document.querySelector('.download-btn');
        downloadBtn.textContent = '📱 Ladda ner som PDF';
        downloadBtn.disabled = false;
    }
}

async function downloadEPUB() {
    if (!currentStory || !currentStory.id) {
        authManager.showNotification('Ingen saga att ladda ner', 'error');
        return;
    }

    if (!api.isAuthenticated()) {
        authManager.showAuthModal();
        return;
    }

    try {
        // Show loading state - find the EPUB button specifically
        const downloadBtns = document.querySelectorAll('.download-btn');
        let epubBtn = null;
        downloadBtns.forEach(btn => {
            if (btn.textContent.includes('E-bok')) {
                epubBtn = btn;
            }
        });
        
        if (!epubBtn) {
            throw new Error('Could not find EPUB button');
        }

        const originalText = epubBtn.textContent;
        epubBtn.textContent = 'Skapar E-bok...';
        epubBtn.disabled = true;

        const response = await api.generateEPUB(currentStory.id);
        
        if (response.success) {
            // Create download link
            const link = document.createElement('a');
            link.href = `http://localhost:3001${response.data.downloadUrl}`;
            link.download = response.data.filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            authManager.showNotification('E-bok skapad och nedladdning startad! 📚', 'success');
        } else {
            throw new Error(response.error || 'Failed to generate EPUB');
        }

    } catch (error) {
        console.error('EPUB generation error:', error);
        authManager.showNotification('Kunde inte skapa e-boken. Försök igen.', 'error');
    } finally {
        // Reset button state
        const downloadBtns = document.querySelectorAll('.download-btn');
        downloadBtns.forEach(btn => {
            if (btn.textContent.includes('Skapar E-bok')) {
                btn.textContent = '📚 Ladda ner som E-bok';
                btn.disabled = false;
            }
        });
    }
}

function shareStory() {
    if (!currentStory) return;
    
    alert(`📤 Dela Din Saga\n\nFantastiskt! Du kan nu dela "${currentStory.title}" med:\n\n📧 Email till familj\n📱 SMS till vänner\n📲 Sociala medier\n🖨️ Skriv ut som bok\n\nSprid magin! ✨`);
}

function createNewStory() {
    // Reset form and hide result
    document.getElementById('storyForm').reset();
    document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('selected'));
    selectedTheme = '';
    document.getElementById('storyResult').style.display = 'none';
    document.querySelector('.create-story').style.display = 'block';
    
    // Scroll to form
    document.getElementById('create').scrollIntoView({ behavior: 'smooth' });
}

// Demo stories content
const demoStories = {
    'jättefisken': {
        title: 'Sagan om Jättefisken',
        childName: 'Mia',
        content: `Mia stod vid havets kant, tittade ut över det skimrande vattnet och undrade vad som fanns under ytan. Idag var dagen då hon skulle få reda på det. Utstyrd med simfötter, dykmask och snorkel tog hon sina första försiktiga simtag mot äventyret.

Medan Mia utforskade det underbara korallriket, mötte hon färgglada fiskar som lekte i vattnet. Hon svävade förbi anemoner som vajade mjukt i strömmarna och upptäckte skimrande sjöstjärnor på mjuka sandbottnar. Då såg hon något stort som rörde sig i det blå.

En enorm jättefisk, med fjäll som skimrade i alla regnbågens färger, simmade lugnt fram till henne. Mia kände först en rädsla, men jättefiskens vänliga ögon visade att den bara var nyfiken. "Hej, jag heter Mia," sa hon. "Och jag är en jättefisk," svarade den med en röst som var djup och mild.

Jättefisken visade Mia runt i havets underverk. De simmade genom hemliga passager, förbi gamla skeppsvrak och utforskade korallträdgårdar som Mia aldrig hade kunnat föreställa sig. "Havet är fullt av hemligheter," sa jättefisken. "Och vänskap är den största skatten."

När solen började sjunka mot horisonten, visste Mia att det var dags att återvända. Jättefisken vinkade farväl med sin stora stjärtfena. "Kom tillbaka snart," sa den. Mia simmade tillbaka till stranden, fylld av tacksamhet och under över de magiska äventyren hon upplevt.

Mia satt på stranden och tittade ut över havet i skymningen. Hon visste att hon alltid skulle bära med sig minnet av jättefisken och de hemliga undervattensvärldarna. Och hon visste att mer äventyr väntade, bara hon var modig nog att dyka in i det okända.`,
        illustrations: [
            'http://127.0.0.1:3001/uploads/images/story_image_1755357597627_0.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755357616228_1.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755357630290_2.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755357647783_3.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755357666206_4.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755357696411_5.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755357717355_6.png'
        ]
    },
    'prinsessan': {
        title: 'Prinsessan och Stjärnan',
        childName: 'Prinsessan',
        content: `I ett land långt borta, där himlen alltid var blå och solen sken klar, bodde en ung prinsessa vid namn Livia. Hon hade långt, lockigt hår som skimrade i solen och bar alltid en klänning i ljusblått och silver, färgerna på himlen vid daggry.

En kväll, när Livia tittade upp mot stjärnorna, såg hon en som lyste klarare än alla andra. Plötsligt föll stjärnan ner från himlen och landade i slottsträdgården. Prinsessan sprang ut för att se var stjärnan hade tagit vägen och fann där en lysande stjärna, inte av eld och gas, utan av något magiskt.

"Hej, jag heter Stella," sa stjärnan med en mjuk och vänlig röst. "Jag har fallit från himlen för att lära mig om vänskap på jorden." Livia välkomnade Stella med öppna armar och tillsammans började de utforska slottsträdgården.

De lekte bland blommorna, pratade med de vänliga djuren och delade historier om deras världar. Livia visade Stella hur vackert livet på jorden kunde vara, och Stella lärde Livia om stjärnornas hemligheter.

En dag, när de vandrade genom skogen, träffade de en äldre kvinna som var vilse. Med Stellas ljus och Livias mod, ledde de kvinnan tillbaka till byn. Tacksamheten i kvinnans ögon fick dem att inse värdet av vänlighet och hjälpsamhet.

När det blev dags för Stella att återvända till himlen, kände Livia en tår rinna ner för kinden. Men Stella lovade att alltid lysa starkt för henne varje natt. "Titta upp mot stjärnorna," sa Stella, "så är jag alltid hos dig."

Prinsessan Livia lärde sig att mod inte bara handlar om att vara stark i farliga stunder, utan också om att vara vänlig och öppna sitt hjärta för nya vänner. Och varje natt, när hon tittade upp mot himlen, fann hon tröst i Stellas strålande ljus, påminnelse om deras oförglömliga äventyr och det eviga bandet mellan dem.`,
        illustrations: [
            'http://127.0.0.1:3001/uploads/images/story_image_1755356828157_0.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755356848661_1.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755356863396_2.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755356877533_3.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755356893863_4.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755356916826_5.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755356931540_6.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755356953596_7.png'
        ]
    },
    'robotkatten': {
        title: 'Robotkatten Max',
        childName: 'Tom',
        content: `Tom satt i sitt rum och ritade när hans mamma kom in med en låda. 'Det här är till dig, Tom,' sa hon med ett leende. Tom tittade nyfiket på lådan.

När Tom öppnade lådan hoppade en liten robotkatt ut. Den blinkade glatt med sina gröna ögon. 'Hej, jag heter Max!' sa den med en mjuk röst. Tom skrattade. Han hade aldrig sett något liknande. 'Hej, Max!' svarade han.

Dagen efter tog Tom med sig Max till parken. Max sprang runt och utforskade allt med stor entusiasm. 'Du är så snabb!' sade Tom och skrattade. De spelade tills solen började gå ner.

En dag när de var i parken träffade de Lisa, en flicka från Toms skola. 'Vad är det där?' frågade hon och pekade på Max. Tom förklarade att Max var en robotkatt. Lisa log. 'Han är jättecool. Får jag leka med er?' Tom tittade på Max, som blinkade glatt. 'Självklart,' svarade Tom.

Tillsammans hade de ännu roligare. Lisa lärde Max att kasta boll, och Max försökte lära Lisa att springa lika snabbt som han. De skrattade och lekte tills det blev dags att gå hem.

Dagen efter i skolan kom fler barn fram till Tom och frågade om Max. Tom kände sig stolt och glad över att ha en så unik vän. Han insåg att vänskap inte handlar om hur man ser ut eller var man kommer ifrån, utan om omtanke och glädje man delar med andra.

Från den dagen var Tom och Max aldrig ensamma. De hade lärt sig att vänskap växer när man delar den med andra. Och Max, även om han var en robot, hade ett hjärta fullt av värme och vänlighet.`,
        illustrations: [
            'http://127.0.0.1:3001/uploads/images/story_image_1755358079022_0.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755358100763_1.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755358118466_2.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755358134310_3.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755358155597_4.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755358177993_5.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755358199220_6.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755358215919_7.png'
        ]
    },
    'magiska-skogen': {
        title: 'Den Magiska Skogen',
        childName: 'Emil',
        content: `En solig morgon bestämde sig Emil för att utforska skogen bakom sitt hus. Han hade alltid varit nyfiken på vad som fanns därinne, men idag kände han sig särskilt äventyrslysten.

När han gick djupare in i skogen, började träden skimra i märkliga färger, och blommorna lyste som små lyktor. Emil var förundrad och kände sig som om han stigit in i en annan värld.

Plötsligt hörde han en röst som sa, "Hej! Vem är du?" Emil tittade ner och såg en liten talande ekorre. Han svarade, "Jag heter Emil. Är du en magisk ekorre?" Ekorren nickade och sa, "Alla vi här i den magiska skogen kan prata! Följ med, så får du träffa mina vänner!"

Ekorren förde Emil till en klar glänta där fler djur väntade. Det fanns en björn, en räv, och till och med en hjort som alla hälsade på Emil med vänliga röster. Emil kunde knappt tro sina ögon!

Djuren berättade för Emil om skogens magi, hur de alla lever i harmoni och hjälper varandra. Emil lärde sig om vikten av vänskap och att dela med sig. Han kände sig glad och varm inombords.

Innan det blev dags för Emil att gå hem, planterade han en blomma tillsammans med djuren. De sa att blomman skulle växa och påminna dem alla om deras nya vänskap.

Emil vandrade hemåt, fylld med glädje och berättelser att dela med sin familj. Han visste att han alltid skulle vara välkommen tillbaka till den magiska skogen, där vänskap blomstrade och äventyren aldrig tog slut.`,
        illustrations: [
            'http://127.0.0.1:3001/uploads/images/story_image_1755344743060_0.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755344758196_1.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755344772965_2.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755344788463_3.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755344802860_4.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755344817770_5.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755344832851_6.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755344850357_7.png'
        ]
    },
    'rymdäventyr': {
        title: 'Lillas Rymdäventyr',
        childName: 'Lilla',
        content: `En kväll när Lilla tittade upp mot himlen glittrade stjärnorna extra mycket. "Tänk om jag kunde besöka dem," tänkte hon. Just då blinkade en stjärna till, som om den hörde hennes önskan.

Nästa morgon vaknade Lilla av ett milt ljus som sken genom hennes fönster. Utanför stod en skimrande rymdfarkost. "Är det för mig?" undrade Lilla. Just då blinkade farkosten till, precis som stjärnan kvällen innan. Det var dags för äventyr!

Inne i rymdfarkosten fanns en karta över galaxen med märkena för magiska platser att besöka. Den första platsen var Planeta Amicorum, vänskapens planet. Med en tryckning på startknappen började resan.

När de landade på Planeta Amicorum möttes de av vänliga utomjordingar med leenden stora som månar. De bjöd in Lilla på en fest där alla dansade under glittrande stjärnor. "Vänskap är universums språk," sa en av dem till Lilla.

Lillas nästa stopp var Planeta Prismatica, en planet som skimrade i alla regnbågens färger. Här lärde sig Lilla att varje färg representerade olika drömmar och önskningar från världens alla hörn.

På den tredje planeten, Planeta Risus, hörde Lilla skratt och glädjerop så snart hon steg ur rymdfarkosten. Här lekte barnen lekar som inte krävde annat än fantasi. "Glädje är frihet," sa en leende vän.

Efter att ha besökt många fantastiska planeter och mött otaliga nya vänner var det dags för Lilla att återvända hem. Hon fylldes av tacksamhet för allt hon upplevt och lärt sig. Universum var fullt av vänner och äventyr.

När Lilla kom hem igen kände hon sig förvandlad. Hon hade med sig en bit av varje planet i sitt hjärta och en ny förståelse för vikten av vänskap, drömmar och glädje. "Tack, universum, för att du visade mig hur stort och vänligt du är," sa hon innan hon somnade.

Och ute i mörkret, bland alla stjärnor, glittrade en extra stark. Det var som om universum sa: "Varsågod, Lilla. Dröm stort och för alltid."`,
        illustrations: [
            'http://127.0.0.1:3001/uploads/images/story_image_1755345494463_0.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755345519979_1.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755345539668_2.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755345560114_3.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755345580005_4.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755345604705_5.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755345627040_6.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755345655301_7.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755345686852_8.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755345718077_9.png'
        ]
    },
    'räven': {
        title: 'Sagan om Räven',
        childName: 'Joel',
        content: `Joel knöt sina gröna gummistövlar extra hårt och lade den röda ryggsäcken på ryggen. Idag skulle han utforska den stora skogen bakom huset. Solen silade genom trädens gröna kronor och visade vägen framåt, medan fåglarnas sång välkomnade honom till skogens värld.

Bland höga träd och mjuka mosstuvor gick Joel på upptäcktsfärd. Plötsligt hörde han ett litet jamande ljud från buskarna. När han tittade närmare upptäckte han en liten rävunge med fluffig röd päls och nyfikna gula ögon som tittade upp på honom.

"Hej lilla räv," viskade Joel försiktigt och sträckte ut handen. Rävungen var först lite rädd, men Joels vänliga röst fick den att känna sig trygg. Snart lekte de tillsammans, rullande runt på den mjuka mossan och skrattande åt varandras upptåg.

Joel delade sin matsäck med sin nya kompis. De satt på en mossbelagd stubbe under ett stort träd och åt tillsammans. Rävungen smackade nöjt på Joels smörgås medan Joel berättade om alla äventyr han drömt om att uppleva i skogen.

När eftermiddagen övergick i kväll visste Joel att det var dags att säga hejdå. Han kramade om sin rävvän och lovade att komma tillbaka snart. "Vi träffas här imorgon," sa han, och rävungen viftade med sin stora fluffiga svans som svar.

Nästa dag kom Joel tillbaka, och rävungen väntade redan. Tillsammans utforskade de djupare in i skogen, där rävungen visade Joel hemliga stigar och berättade genom sin blick om alla skogens under och hemligheter.

När Joel kommer ihåg detta äventyr ler han alltid. För i skogen lärde han sig att vänskap kan blomstre överallt, även med de minsta och fluffigaste av vänner. Och varje gång han ser skogen vet han att äventyr och nya vänner väntar på honom.

Och så fortsätter Joel och rävungen att träffas, dag efter dag, och upptäcker tillsammans skogens alla hemligheter och skönhet, förenade av en vänskap som kommer att vara för alltid.`,
        illustrations: [
            'http://127.0.0.1:3001/uploads/images/story_image_1755414207280_0.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755414222070_1.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755414237804_2.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755414254060_3.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755414270030_4.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755414287023_5.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755414304779_6.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755414320518_7.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755414338382_8.png'
        ]
    },
    'enhörning': {
        title: 'Enhörningen och Regnbågen',
        childName: 'Nova',
        content: `I byns ände, där regnbågar föds och stjärnor vilar, bodde Nova, en flicka med drömmar stora som himlen. Hennes hjärta var fyllt av äventyrslust, och hennes bästa vän var en vit enhörning vid namn Luna. Tillsammans delade de hemligheter och skratt under det stora blå.

En dag, när grå moln rullade in och regnet smekte marken, kände Nova en sorgsenhet sprida sig. Allt spel och skoj tycktes försvinna med solens ljus. Men Luna, med ögon fyllda av magi, viskade, "Efter regnet kommer glädjen, låt oss hitta den tillsammans." Och så begav de sig ut på ett äventyr.

Genom skogar och ängar, under regnbågens båge, letade de. Vattenpölar blev till speglar av himlen, och varje droppe berättade en historia. De skrattade, sprang, och snurrade tillsammans, tillsammans upptäckande världens färger på nytt.

Plötsligt, i en klar pöl omgiven av blommor, speglade sig något magiskt. En regnbåge, fast inte som någon annan. Den strålade av alla färger, men även av kärlek och vänskap. Nova och Luna hade skapat sin egen regnbåge, med glädjen de funnit i varandra.

Medan solen sakta återvände och torkade regnets spår, insåg Nova att världen var full av under, även i de enklaste ögonblick. Hennes äventyr med Luna hade lärt henne att efter varje regn, väntar en ny början, fylld med färg och ljus.

Och så, varje gång regnet besökte deras lilla by, visste Nova och Luna att en ny regnbåge väntade på dem, ett löfte om nya äventyr och oändlig glädje. Tillsammans skulle de alltid hitta ljuset, förälskade i livets enkla skönhet och kraften i deras vänskap.`,
        illustrations: [
            'http://127.0.0.1:3001/uploads/images/story_image_1755346368011_0.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755346389852_1.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755346410342_2.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755346432230_3.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755346453817_4.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755346473179_5.png',
            'http://127.0.0.1:3001/uploads/images/story_image_1755346489811_6.png'
        ]
    }
};

function readDemoStory(storyId) {
    console.log('Reading demo story:', storyId);
    
    const story = demoStories[storyId];
    if (!story) {
        console.error('Demo story not found:', storyId);
        return;
    }

    // Create story data in the same format as generated stories
    const paragraphs = story.content.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
    const generatedImages = story.illustrations.map((url, index) => ({
        id: `demo_${storyId}_img_${index}`,
        url: url,
        prompt: `Demo illustration for ${story.title} page ${index + 1}`,
        position: index === 0 ? 'cover' : Math.min(index - 1, paragraphs.length - 1)
    }));

    const storyData = {
        id: `demo_${storyId}`,
        title: story.title,
        childName: story.childName,
        content: story.content,
        generatedImages: generatedImages,
        wordCount: story.content.split(' ').length,
        readingTimeMinutes: Math.ceil(story.content.split(' ').length / 200),
        createdAt: new Date().toISOString()
    };

    // Display the demo story using the same picture book format
    displayGeneratedStory(storyData);
    
    // Show a notification that this is a demo
    setTimeout(() => {
        authManager.showNotification('📖 Detta är en gratis demo-saga! Skapa din egen personliga saga med AI-generatorn ovan. ✨', 'info');
    }, 1000);
}

async function buyStory(storyId) {
    if (!api.isAuthenticated()) {
        authManager.showAuthModal();
        return;
    }

    try {
        // Get story ID from the card - convert string ID to database ID
        const storyIdMap = {
            'jättefisken': 1,
            'prinsessan': 2,
            'robotkatten': 3,
            'magiska-skogen': 4,
            'rymdäventyr': 5,
            'enhörning': 6
        };

        const premadeStoryId = storyIdMap[storyId];
        if (!premadeStoryId) {
            authManager.showNotification('Ogiltigt saga-ID', 'error');
            return;
        }

        // Create payment intent
        const response = await api.createPaymentIntent(premadeStoryId);
        
        if (response.success) {
            // For now, show success message. In production, integrate Stripe Elements
            authManager.showNotification(
                `Betalning för "${response.data.story.title}" förbereds! Stripe-integration kommer snart.`, 
                'info'
            );
            
            // TODO: Implement Stripe Elements checkout flow
            console.log('Payment Intent:', response.data);
            
        }
    } catch (error) {
        console.error('Purchase error:', error);
        
        if (error.message.includes('already purchased')) {
            authManager.showNotification('Du har redan köpt denna saga!', 'info');
        } else {
            authManager.showNotification('Kunde inte starta köp. Försök igen.', 'error');
        }
    }
}

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add some interactive magic
document.querySelectorAll('.story-illustration').forEach(illustration => {
    illustration.addEventListener('click', function() {
        this.style.animation = 'bounce 0.6s ease';
        setTimeout(() => {
            this.style.animation = 'float 6s infinite ease-in-out';
        }, 600);
    });
});

// Form validation enhancements
document.getElementById('childName').addEventListener('input', function() {
    this.value = this.value.replace(/[^a-zA-ZåäöÅÄÖ\s]/g, '');
});

// Add sparkle effect to title
setInterval(() => {
    const sparkles = ['✨', '⭐', '🌟', '💫'];
    const randomSparkle = sparkles[Math.floor(Math.random() * sparkles.length)];
    console.log(`${randomSparkle} Magisk saga-skapare aktiv! ${randomSparkle}`);
}, 5000);