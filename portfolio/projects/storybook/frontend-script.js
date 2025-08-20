// Frontend-Only Story Generation Script
document.addEventListener('DOMContentLoaded', function() {
    initializeFrontendStorybook();
});

function initializeFrontendStorybook() {
    console.log('🌟 Frontend-Only AI Storybook Creator initialized');
    
    // Setup form handler
    const storyForm = document.getElementById('storyForm');
    if (storyForm) {
        storyForm.addEventListener('submit', handleFrontendStoryGeneration);
    }
    
    // Setup theme selection
    setupThemeSelection();
    
    // Setup demo stories
    setupDemoStories();
    
    // Check API configuration
    checkAPIConfiguration();
}

function checkAPIConfiguration() {
    const hasOpenAI = window.ENV?.OPENAI_API_KEY && window.ENV.OPENAI_API_KEY !== 'sk-your-openai-api-key-here';
    const hasStripe = window.ENV?.STRIPE_PUBLISHABLE_KEY && window.ENV.STRIPE_PUBLISHABLE_KEY !== 'pk_test_your-stripe-publishable-key-here';
    const hasEmailJS = window.ENV?.EMAILJS_SERVICE_ID && window.ENV.EMAILJS_SERVICE_ID !== 'your_service_id';
    
    if (!hasOpenAI) {
        console.warn('⚠️ OpenAI API key not configured in config.js');
    }
    if (!hasStripe) {
        console.warn('⚠️ Stripe publishable key not configured in config.js');
    }
    if (!hasEmailJS) {
        console.warn('⚠️ EmailJS not configured in config.js');
    }
    
    if (hasOpenAI && hasStripe) {
        console.log('✅ API configuration looks good');
    }
}

// Handle story generation (frontend-only with payment/development modes)
async function handleFrontendStoryGeneration(event) {
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(event.target);
    const storyData = {
        title: formData.get('storyTitle'),
        childName: formData.get('childName'),
        childAge: formData.get('childAge'),
        theme: getSelectedTheme(),
        parentEmail: formData.get('parentEmail'),
        details: formData.get('storyDetails')
    };
    
    // Validate form
    if (!validateStoryForm(storyData)) {
        return;
    }
    
    // Check if we're in development mode or production
    const hasStripe = window.ENV?.STRIPE_PUBLISHABLE_KEY && window.ENV.STRIPE_PUBLISHABLE_KEY !== 'pk_test_your-stripe-publishable-key-here';
    const hasOpenAI = window.ENV?.OPENAI_API_KEY && window.ENV.OPENAI_API_KEY !== 'sk-your-openai-api-key-here';
    
    if (!hasOpenAI) {
        showError('OpenAI API key inte konfigurerad. Uppdatera config.js med din API-nyckel.');
        return;
    }
    
    if (window.ENV?.DEVELOPMENT_MODE || !hasStripe) {
        // Development/demo mode - generate story without payment
        const userChoice = confirm(
            '🚧 UTVECKLINGS/DEMO-LÄGE 🚧\n\n' +
            'Stripe är inte konfigurerat eller utvecklingsläge är aktiverat.\n\n' +
            'Vill du generera en saga gratis för testning?\n\n' +
            '(I produktionsläget skulle detta kosta 50 kr)'
        );
        
        if (userChoice) {
            await handleDevelopmentStoryGeneration(storyData);
        }
        return;
    }
    
    // Production mode - handle payment first
    try {
        // Store data for after payment
        localStorage.setItem('pendingStoryData', JSON.stringify(storyData));
        localStorage.setItem('customerEmail', storyData.parentEmail);
        
        // Show payment processing
        showProgressiveLoading();
        updateLoadingProgress('Förbereder betalning...', 0);
        
        // Redirect to Stripe Checkout
        await frontendAPI.createPaymentIntent(storyData);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Payment setup failed:', error);
        showError('Det gick inte att förbereda betalningen: ' + error.message);
    }
}

// Development mode story generation (no payment)
async function handleDevelopmentStoryGeneration(storyData) {
    try {
        console.log('🚧 Running in development mode - no payment required');
        
        // Show story generation progress
        showProgressiveLoading();
        updateLoadingProgress('Skapar din berättelse med AI...', 0);
        
        // Generate story directly
        const result = await frontendAPI.generateStory(storyData);
        
        // Update progress
        setTimeout(() => updateLoadingProgress('Förbereder visning...', 3), 1000);
        
        // Hide loading
        hideLoading();
        
        // Show story result
        displayStoryResult(result.story);
        
        // Show development notice
        setTimeout(() => {
            alert('🚧 UTVECKLINGS/DEMO-LÄGE 🚧\n\n' +
                  'Din saga har skapats för testning.\n\n' +
                  'Använd "📧 Skicka via Email" för att testa email-funktionen.\n\n' +
                  'I produktionsläget skulle detta kosta 50 kr.');
        }, 2000);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Development story generation failed:', error);
        showError('Det gick inte att skapa sagan: ' + error.message);
    }
}

function validateStoryForm(data) {
    if (!data.title) {
        showError('Vänligen ange en titel för sagan.');
        return false;
    }
    
    if (!data.childName) {
        showError('Vänligen ange barnets namn.');
        return false;
    }
    
    if (!data.childAge) {
        showError('Vänligen välj barnets ålder.');
        return false;
    }
    
    if (!data.theme) {
        showError('Vänligen välj ett tema för sagan.');
        return false;
    }
    
    if (!data.parentEmail) {
        showError('Vänligen ange förälderns email.');
        return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.parentEmail)) {
        showError('Vänligen ange en giltig email-adress.');
        return false;
    }
    
    return true;
}

function setupThemeSelection() {
    const themeOptions = document.querySelectorAll('.theme-option');
    
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            themeOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            this.classList.add('selected');
            
            console.log('Theme selected:', this.dataset.theme);
        });
    });
}

function getSelectedTheme() {
    const selectedTheme = document.querySelector('.theme-option.selected');
    return selectedTheme ? selectedTheme.dataset.theme : null;
}

function showProgressiveLoading() {
    const loadingElement = document.getElementById('loadingAnimation');
    const loadingText = loadingElement.querySelector('.loading-text');
    const loadingSubtext = loadingElement.querySelector('.loading-subtext');
    
    if (loadingText) {
        loadingText.textContent = 'Skriver din berättelse... ✨';
    }
    
    if (loadingSubtext) {
        loadingSubtext.textContent = 'AI skapar din personliga saga - detta tar 3-5 minuter';
    }
    
    // Add the show class to make it visible
    loadingElement.classList.add('show');
    document.getElementById('create').style.display = 'none';
    
    console.log('📝 Progressive loading started');
}

function hideLoading() {
    const loadingElement = document.getElementById('loadingAnimation');
    loadingElement.classList.remove('show');
    document.getElementById('create').style.display = 'block';
    console.log('📝 Loading hidden');
}

function updateLoadingProgress(message, step) {
    const loadingText = document.querySelector('#loadingAnimation .loading-text');
    const loadingSubtext = document.querySelector('#loadingAnimation .loading-subtext');
    
    console.log(`📊 Updating progress: ${message} (step ${step})`);
    
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    const progressMessages = [
        'AI skapar text baserat på dina önskemål',
        'DALL-E genererar vackra illustrationer',
        'Sätter samman text och bilder',
        'Gör de sista justeringarna'
    ];
    
    if (step < progressMessages.length && loadingSubtext) {
        loadingSubtext.textContent = progressMessages[step];
    }
}

function displayStoryResult(story, isDemo = false) {
    const resultSection = document.getElementById('storyResult');
    const titleElement = document.getElementById('generatedTitle');
    const subtitleElement = document.getElementById('generatedSubtitle');
    const contentElement = document.getElementById('storyContent');
    const actionsElement = resultSection.querySelector('.story-actions');
    
    // Set title and subtitle
    titleElement.textContent = story.title;
    subtitleElement.textContent = `En personlig saga för ${story.childName}`;
    
    // Display story content with images
    displayStoryWithImages(story, contentElement);
    
    // Update action buttons based on whether this is a demo
    if (isDemo) {
        actionsElement.innerHTML = `
            <div class="demo-notice">
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">
                    📖 Detta är en demo-saga. Skapa din egen personliga saga för PDF-nedladdning och email-leverans!
                </p>
            </div>
            <button class="btn-secondary" onclick="createNewStory()">✨ Skapa Din Egen Saga</button>
        `;
    } else {
        actionsElement.innerHTML = `
            <button class="download-btn" onclick="downloadPDF()">📱 Ladda ner som PDF</button>
            <button class="download-btn" onclick="emailPDF()">📧 Skicka via Email</button>
            <button class="btn-secondary" onclick="createNewStory()">✨ Skapa Ny Saga</button>
        `;
    }
    
    // Show result section
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
    
    // Store story for PDF generation and email
    window.currentStory = story;
}

function displayStoryWithImages(story, container) {
    container.innerHTML = '';
    
    const paragraphs = story.content.split('\n\n').filter(p => p.trim());
    
    paragraphs.forEach((paragraph, index) => {
        // Create page container
        const pageDiv = document.createElement('div');
        pageDiv.className = 'story-page';
        
        // Add image for this page if available
        const storyImage = story.images && story.images.find(img => img.position === index);
        if (storyImage) {
            const imgElement = document.createElement('img');
            imgElement.src = storyImage.url;
            imgElement.alt = `Illustration för sida ${index + 1}`;
            imgElement.className = 'story-image';
            imgElement.style.maxWidth = '100%';
            imgElement.style.borderRadius = '12px';
            imgElement.style.marginBottom = '20px';
            
            pageDiv.appendChild(imgElement);
        }
        
        // Add paragraph text
        const textDiv = document.createElement('div');
        textDiv.className = 'story-text';
        textDiv.innerHTML = `<p>${paragraph.trim()}</p>`;
        pageDiv.appendChild(textDiv);
        
        container.appendChild(pageDiv);
    });
}

// PDF Download Function
async function downloadPDF() {
    try {
        if (!window.currentStory) {
            showError('Ingen saga att ladda ner.');
            return;
        }
        
        showLoading('Skapar PDF... 📄');
        
        const pdf = await frontendAPI.createPDF(window.currentStory);
        pdf.save(`${window.currentStory.title} - ${window.currentStory.childName}.pdf`);
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('❌ PDF download error:', error);
        showError('Det gick inte att skapa PDF:en: ' + error.message);
    }
}

// Email PDF Function
async function emailPDF() {
    try {
        if (!window.currentStory) {
            showError('Ingen saga att skicka via email.');
            return;
        }
        
        const hasEmailJS = window.ENV?.EMAILJS_SERVICE_ID && window.ENV.EMAILJS_SERVICE_ID !== 'your_service_id';
        if (!hasEmailJS) {
            showError('EmailJS är inte konfigurerat. Uppdatera config.js med dina EmailJS-uppgifter för att skicka email.');
            return;
        }
        
        showLoading('Skapar PDF och skickar email... 📧');
        
        // Create PDF
        const pdf = await frontendAPI.createPDF(window.currentStory);
        const pdfBlob = pdf.output('blob');
        
        // Get email from stored story or form
        const parentEmail = window.currentStory.parentEmail || 
                          localStorage.getItem('customerEmail') ||
                          document.getElementById('parentEmail').value;
        
        if (!parentEmail) {
            showError('Ingen email-adress hittades. Vänligen fyll i email-fältet igen.');
            hideLoading();
            return;
        }
        
        // Send email
        await frontendAPI.sendStoryEmail(parentEmail, window.currentStory, pdfBlob);
        
        hideLoading();
        
        alert(`✅ Saga skickad!\n\nPDF med "${window.currentStory.title}" har skickats till:\n${parentEmail}\n\nKontrollera din inkorg (och skräppost).`);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Email sending error:', error);
        
        if (error.message.includes('EmailJS not configured')) {
            showError('EmailJS är inte konfigurerat. Uppdatera config.js med dina EmailJS-uppgifter.');
        } else {
            showError('Det gick inte att skicka emailet: ' + error.message);
        }
    }
}

// Create New Story
function createNewStory() {
    // Reset form
    document.getElementById('storyForm').reset();
    
    // Clear theme selection
    document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('selected'));
    
    // Hide result
    document.getElementById('storyResult').style.display = 'none';
    
    // Clear stored story
    window.currentStory = null;
    
    // Scroll to form
    document.getElementById('create').scrollIntoView({ behavior: 'smooth' });
}

// Demo Stories (same data as before)
const demoStories = {
    'jättefisken': {
        title: 'Sagan om Jättefisken',
        childName: 'Mia',
        theme: 'underwater',
        parentEmail: 'demo@example.se',
        content: `Mia stod vid havets kant, tittade ut över det skimrande vattnet och undrade vad som fanns under ytan. Idag var dagen då hon skulle få reda på det. Utstyrd med simfötter, dykmask och snorkel tog hon sina första försiktiga simtag mot äventyret.

Medan Mia utforskade det underbara korallriket, mötte hon färgglada fiskar som lekte i vattnet. Hon svävade förbi anemoner som vajade mjukt i strömmarna och upptäckte skimrande sjöstjärnor på mjuka sandbottnar. Då såg hon något stort som rörde sig i det blå.

En enorm jättefisk, med fjäll som skimrade i alla regnbågens färger, simmade lugnt fram till henne. Mia kände först en rädsla, men jättefiskens vänliga ögon visade att den bara var nyfiken. "Hej, jag heter Mia," sa hon. "Och jag är en jättefisk," svarade den med en röst som var djup och mild.

Jättefisken visade Mia runt i havets underverk. De simmade genom hemliga passager, förbi gamla skeppsvrak och utforskade korallträdgårdar som Mia aldrig hade kunnat föreställa sig. "Havet är fullt av hemligheter," sa jättefisken. "Och vänskap är den största skatten."

När solen började sjunka mot horisonten, visste Mia att det var dags att återvända. Jättefisken vinkade farväl med sin stora stjärtfena. "Kom tillbaka snart," sa den. Mia simmade tillbaka till stranden, fylld av tacksamhet och under över de magiska äventyren hon upplevt.

Mia satt på stranden och tittade ut över havet i skymningen. Hon visste att hon alltid skulle bära med sig minnet av jättefisken och de hemliga undervattensvärldarna. Och hon visste att mer äventyr väntade, bara hon var modig nog att dyka in i det okända.`,
        images: [
            { position: 0, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-ZScQre7gRslKNtpfr5BArEZC.png?st=2025-08-18T11%3A43%3A21Z&se=2025-08-18T13%3A43%3A21Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=7aed557a-269d-4dda-ab8b-c66e34024151&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-18T08%3A39%3A39Z&ske=2025-08-19T08%3A39%3A39Z&sks=b&skv=2024-08-04&sig=eeT3DFTzunIVJxR2Vs1hsPUvRi8LdPiNSgsWWn3ZW1E%3D', description: 'Mia vid havets kant' },
            { position: 1, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-lSLbGGewm8gLp3byQV1Zd9CB.png?st=2025-08-18T11%3A43%3A34Z&se=2025-08-18T13%3A43%3A34Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=7aed557a-269d-4dda-ab8b-c66e34024151&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-18T12%3A43%3A34Z&ske=2025-08-19T12%3A43%3A34Z&sks=b&skv=2024-08-04&sig=/vyKF13QnHiclBoimxsprHicv3%2BF2B6csCDy0MVDJ/s%3D', description: 'Mia utforskar korallrivet' },
            { position: 2, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-XOARzAZs6ChFKwBYpHBoQu46.png?st=2025-08-18T11%3A44%3A03Z&se=2025-08-18T13%3A44%3A03Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=8c7ba6b3-5a55-4cb2-a31e-3fe3f598c469&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-18T12%3A44%3A03Z&ske=2025-08-19T12%3A44%3A03Z&sks=b&skv=2024-08-04&sig=zV7jVLmpj/ZnLnAC3jT0XOEdfxjAQbRDuRBWqUvJWQM%3D', description: 'Jättefisken möter Mia' },
            { position: 3, url: 'images/jattefisken_page4.png', description: 'Mia och jättefisken utforskar havets underverk' },
            { position: 4, url: 'images/jattefisken_page5.png', description: 'Farväl mellan Mia och jättefisken' },
            { position: 5, url: 'images/jattefisken_page6.png', description: 'Mia på stranden i skymningen' }
        ]
    },
    'prinsessan': {
        title: 'Prinsessan och Stjärnan',
        childName: 'Prinsessan Livia',
        theme: 'princess',
        parentEmail: 'demo@example.se',
        content: `I ett land långt borta, där himlen alltid var blå och solen sken klar, bodde en ung prinsessa vid namn Livia. Hon hade långt, lockigt hår som skimrade i solen och bar alltid en klänning i ljusblått och silver, färgerna på himlen vid daggry.

En kväll, när Livia tittade upp mot stjärnorna, såg hon en som lyste klarare än alla andra. Plötsligt föll stjärnan ner från himlen och landade i slottsträdgården. Prinsessan sprang ut för att se var stjärnan hade tagit vägen och fann där en lysande stjärna, inte av eld och gas, utan av något magiskt.

"Hej, jag heter Stella," sa stjärnan med en mjuk och vänlig röst. "Jag har fallit från himlen för att lära mig om vänskap på jorden." Livia välkomnade Stella med öppna armar och tillsammans började de utforska slottsträdgården.

De lekte bland blommorna, pratade med de vänliga djuren och delade historier om deras världar. Livia visade Stella hur vackert livet på jorden kunde vara, och Stella lärde Livia om stjärnornas hemligheter.

En dag, när de vandrade genom skogen, träffade de en äldre kvinna som var vilse. Med Stellas ljus och Livias mod, ledde de kvinnan tillbaka till byn. Tacksamheten i kvinnans ögon fick dem att inse värdet av vänlighet och hjälpsamhet.

När det blev dags för Stella att återvända till himlen, kände Livia en tår rinna ner för kinden. Men Stella lovade att alltid lysa starkt för henne varje natt. "Titta upp mot stjärnorna," sa Stella, "så är jag alltid hos dig."

Prinsessan Livia lärde sig att mod inte bara handlar om att vara stark i farliga stunder, utan också om att vara vänlig och öppna sitt hjärta för nya vänner. Och varje natt, när hon tittade upp mot himlen, fann hon tröst i Stellas strålande ljus, påminnelse om deras oförglömliga äventyr och det eviga bandet mellan dem.`,
        images: [
            { position: 0, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-JQgZ2iYHNRxdvgNDXQidpIFs/user-F00OBhE4LdgWHPnOBLDWD8w5/img-0MZAQb88RBWlXGPAGcNUd0ZV.png?st=2025-01-19T08%3A51%3A33Z&se=2025-01-19T10%3A51%3A33Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=d505667d-d6c1-4a0a-bac7-5c84a87759f8&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-01-19T06%3A59%3A15Z&ske=2025-01-20T06%3A59%3A15Z&sks=b&skv=2024-08-04&sig=UBNNyoZX0/WQHP6A7xGiIJJxCpSp/Qv09f2M3dNb%2BMQ%3D', description: 'Illustration för sida 1' },
            { position: 1, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-JQgZ2iYHNRxdvgNDXQidpIFs/user-F00OBhE4LdgWHPnOBLDWD8w5/img-SfBrGa1PN8gZhIXHyMiJagn0.png?st=2025-01-19T08%3A51%3A56Z&se=2025-01-19T10%3A51%3A56Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=d505667d-d6c1-4a0a-bac7-5c84a87759f8&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-01-19T06%3A59%3A15Z&ske=2025-01-20T06%3A59%3A15Z&sks=b&skv=2024-08-04&sig=1zNv7pPk%2B%2BfgYs1AJvaBKJZWb9%2BOwqQ80/pDf3wNhz0%3D', description: 'Illustration för sida 2' },
            { position: 2, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-JQgZ2iYHNRxdvgNDXQidpIFs/user-F00OBhE4LdgWHPnOBLDWD8w5/img-3Dd5V4GUvKu0gO3YHqG0kvJH.png?st=2025-01-19T08%3A52%3A18Z&se=2025-01-19T10%3A52%3A18Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=d505667d-d6c1-4a0a-bac7-5c84a87759f8&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-01-19T06%3A59%3A15Z&ske=2025-01-20T06%3A59%3A15Z&sks=b&skv=2024-08-04&sig=qtF4RUUjYFgz8qh4R5mjRIFfHHxnkBdF9YGpKRdDVeM%3D', description: 'Illustration för sida 3' },
            { position: 3, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-JQgZ2iYHNRxdvgNDXQidpIFs/user-F00OBhE4LdgWHPnOBLDWD8w5/img-Fx3xUuQDHrksKfHH5KuEELBF.png?st=2025-01-19T08%3A52%3A40Z&se=2025-01-19T10%3A52%3A40Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=d505667d-d6c1-4a0a-bac7-5c84a87759f8&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-01-19T06%3A59%3A15Z&ske=2025-01-20T06%3A59%3A15Z&sks=b&skv=2024-08-04&sig=cDAjYJrFuLPz%2B0Hk1vNOBg%2BfGTWOdHhzPLELBvwp/kk%3D', description: 'Illustration för sida 4' },
            { position: 4, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-JQgZ2iYHNRxdvgNDXQidpIFs/user-F00OBhE4LdgWHPnOBLDWD8w5/img-J6QmNDYXbH1mDQChWFtMmIHp.png?st=2025-01-19T08%3A53%3A02Z&se=2025-01-19T10%3A53%3A02Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=d505667d-d6c1-4a0a-bac7-5c84a87759f8&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-01-19T06%3A59%3A15Z&ske=2025-01-20T06%3A59%3A15Z&sks=b&skv=2024-08-04&sig=J%2BSxH5zQNmNjO%2BKM9F5F5wUGgJHO1vKU%2BaF5v5uQgdg%3D', description: 'Illustration för sida 5' },
            { position: 5, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-JQgZ2iYHNRxdvgNDXQidpIFs/user-F00OBhE4LdgWHPnOBLDWD8w5/img-CWLhGJgWNlZC0qI7g1cN1VKS.png?st=2025-01-19T08%3A53%3A24Z&se=2025-01-19T10%3A53%3A24Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=d505667d-d6c1-4a0a-bac7-5c84a87759f8&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-01-19T06%3A59%3A15Z&ske=2025-01-20T06%3A59%3A15Z&sks=b&skv=2024-08-04&sig=0%2BHsRm4HCnAHhfkPzYNdUNBnYkCUGsXJjBw6sKtOH6I%3D', description: 'Illustration för sida 6' },
            { position: 6, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-JQgZ2iYHNRxdvgNDXQidpIFs/user-F00OBhE4LdgWHPnOBLDWD8w5/img-2qs5mqsRtUkAfqz4KrKm3pKx.png?st=2025-01-19T08%3A53%3A45Z&se=2025-01-19T10%3A53%3A45Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=d505667d-d6c1-4a0a-bac7-5c84a87759f8&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-01-19T06%3A59%3A15Z&ske=2025-01-20T06%3A59%3A15Z&sks=b&skv=2024-08-04&sig=pO6%2BUDVjpT74NCzYUDQcAzZXhfnyPG4XBfPFj%2BkdBn0%3D', description: 'Illustration för sida 7' }
        ]
    },
    'räven': {
        title: 'Sagan om Räven',
        childName: 'Joel',
        theme: 'animals',
        content: `Joel gick genom den tjocka skogen en solig eftermiddag, nyfiken på vad han skulle upptäcka. Träden skapade ett grönt tak över honom, och fåglarnas sång fyllde luften med melodi.

Plötsligt hörde han ett svagt gnäll från en buske. Joel tittade närmare och såg en liten rävunge som satt fast under en gren. Försiktigt lyfte Joel grenen och befriade den lilla räven. "Tack så mycket," sa rävungen med en pip. "Jag heter Rödis."

Joel och Rödis blev snabbt vänner. Rödis visade Joel hemliga stigar genom skogen som endast djuren kände till. De lekte kurragömma bland träden och delade bär som de plockade längs vägen.

En dag, när de utforskade en ny del av skogen, blev de vilse. Joel kände sig orolig, men Rödis sa lugnt, "Oroa dig inte, Joel. Vi kan använda våra sinnen för att hitta vägen hem." Tillsammans använde de ljud, dofter och ledtrådar från naturen för att navigera.

Efter en lång dag av äventyr hittade de till slut tillbaka. Joel insåg hur viktig vänskap var och hur mycket han lärt sig från sin nya vän. Rödis hade lärt honom att lita på naturen och sina egna förmågor.

Från den dagen besökte Joel skogen ofta för att träffa Rödis. Deras vänskap växte starkare för varje äventyr de delade. Joel lärde sig att de bästa vännerna kan komma från de mest oväntade ställen.

Varje gång Joel kände sig ensam eller osäker, tänkte han på Rödis och deras äventyr i skogen. Han förstod att vänskap och mod kan hjälpa en att övervinna alla utmaningar som livet för med sig.`,
        images: [
            { position: 0, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-owVQ1GfEYONseuls1iYN4PJS.png?st=2025-08-18T11%3A10%3A59Z&se=2025-08-18T13%3A10%3A59Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=52f8f7b3-ca8d-4b21-9807-8b9df114d84c&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-18T12%3A10%3A59Z&ske=2025-08-19T12%3A10%3A59Z&sks=b&skv=2024-08-04&sig=z%2Bl3aVGZF0gtuXwiatDsmrrUwwUyGSd%2BPEdAMP2VqhI%3D', description: 'Joel går genom skogen' },
            { position: 1, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-OOdMrLgNhKLUMIyxfT1RfQub.png?st=2025-08-18T11%3A11%3A37Z&se=2025-08-18T13%3A11%3A37Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=f245bf7a-16fa-44e0-959a-8c745daf7e3d&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-18T12%3A11%3A37Z&ske=2025-08-19T12%3A11%3A37Z&sks=b&skv=2024-08-04&sig=6r/14sl/12T6egpR7OgKy%2BXOe%2B/N6rZA1CGHKqkjKqo%3D', description: 'Joel hittar rävungen' },
            { position: 2, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-XDe9DJhHyLhSihRlBH1ErZXO.png?st=2025-08-18T11%3A12%3A45Z&se=2025-08-18T13%3A12%3A45Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=52f8f7b3-ca8d-4b21-9807-8b9df114d84c&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-18T05%3A06%3A01Z&ske=2025-08-19T05%3A06%3A01Z&sks=b&skv=2024-08-04&sig=xHMihyFH2sb7lc6a8djgcvHHowRq2C7lXeKGHm5pOTs%3D', description: 'Joel och Rödis blir vänner' },
            { position: 3, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-ir51tXDeglZTgKTHVkUwCtii.png?st=2025-08-18T11%3A12%3A24Z&se=2025-08-18T13%3A12%3A24Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=7aed557a-269d-4dda-ab8b-c66e34024151&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-18T03%3A03%3A00Z&ske=2025-08-19T03%3A03%3A00Z&sks=b&skv=2024-08-04&sig=KEsqQ2HTzjT/IPBH/kibjgzTpF21k4R3ICY60STq1%2BM%3D', description: 'Joel och Rödis blir vilse' },
            { position: 4, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-Dv35UOWSJ1K1v0JZeX9mLCQt.png?st=2025-08-18T11%3A13%3A19Z&se=2025-08-18T13%3A13%3A19Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=52f8f7b3-ca8d-4b21-9807-8b9df114d84c&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-17T18%3A17%3A03Z&ske=2025-08-18T18%3A17%3A03Z&sks=b&skv=2024-08-04&sig=0orC/XIbqKVPQ%2Bw0r4ludxSADzl9sd4sEgIHN2PeDtY%3D', description: 'De hittar hem med naturens hjälp' },
            { position: 5, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-22QzjmUfX5CvgpjRiLV91NTy.png?st=2025-08-18T11%3A14%3A01Z&se=2025-08-18T13%3A14%3A01Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=52f8f7b3-ca8d-4b21-9807-8b9df114d84c&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-17T16%3A59%3A17Z&ske=2025-08-18T16%3A59%3A17Z&sks=b&skv=2024-08-04&sig=LYOu7/hKpaFDYQylJGm4mRruUjioT/MRbiizqirQvpk%3D', description: 'Vänskapen växer starkare' },
            { position: 6, url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-z60JSlsuJCyWH4vY4r0DPjqZ/user-Pk6MDwx3czQ3sPrmJmqGUlB8/img-OGsixrTyFeInp9OFBZ14RjZ8.png?st=2025-08-18T11%3A14%3A28Z&se=2025-08-18T13%3A14%3A28Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=7aed557a-269d-4dda-ab8b-c66e34024151&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-18T10%3A00%3A04Z&ske=2025-08-19T10%3A00%3A04Z&sks=b&skv=2024-08-04&sig=3zX0oKDAh9Wh2FIgISTNT/4VoldSPyex0G1R46ILkCM%3D', description: 'Joel tänker på sina äventyr' }
        ]
    }
};

// Demo Stories Setup
function setupDemoStories() {
    console.log('📚 Demo stories loaded:', Object.keys(demoStories).length, 'stories');
}

async function readDemoStory(storyId) {
    console.log('📖 Reading demo story:', storyId);
    
    const story = demoStories[storyId];
    if (!story) {
        showError('Demo-saga hittades inte: ' + storyId);
        return;
    }
    
    // Display the demo story with demo flag
    displayStoryResult(story, true);
    
    // Store as current story (though PDF download won't be available)
    window.currentStory = story;
}

// Error handling
function showError(message) {
    alert('❌ ' + message);
    console.error('Error:', message);
}

// Success messages
function showSuccess(message) {
    alert('✅ ' + message);
    console.log('Success:', message);
}

function showLoading(message = 'Laddar...') {
    const loadingElement = document.getElementById('loadingAnimation');
    const loadingText = loadingElement.querySelector('.loading-text');
    
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    loadingElement.style.display = 'flex';
    
    // Hide other sections
    document.getElementById('create').style.display = 'none';
}