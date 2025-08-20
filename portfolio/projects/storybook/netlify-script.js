// Netlify Functions Script - AI Storybook Creator
document.addEventListener('DOMContentLoaded', function() {
    initializeNetlifyStorybook();
});

function initializeNetlifyStorybook() {
    console.log('🌟 Netlify AI Storybook Creator initialized');
    
    // Setup form handler
    const storyForm = document.getElementById('storyForm');
    if (storyForm) {
        storyForm.addEventListener('submit', handleNetlifyStoryGeneration);
    }
    
    // Setup theme selection
    setupThemeSelection();
    
    // Setup demo stories (static for now)
    setupDemoStories();
    
    // Test API connection (not needed for Netlify Functions)
    console.log('✅ Using Netlify Functions - no health check needed');
}

// Handle story generation with Stripe Checkout
async function handleNetlifyStoryGeneration(event) {
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
    
    try {
        // Store email and story data for success page
        localStorage.setItem('customerEmail', storyData.parentEmail);
        localStorage.setItem('pendingStoryData', JSON.stringify(storyData));
        
        // Show payment processing
        showProgressiveLoading();
        updateLoadingProgress('Förbereder betalning...', 0);
        
        // Try to create payment intent
        const paymentResponse = await netlifyAPI.createPaymentIntent(storyData);
        
        if (!paymentResponse.success) {
            throw new Error(paymentResponse.error || 'Failed to create payment');
        }
        
        updateLoadingProgress('Omdirigerar till betalning...', 1);
        
        // Redirect to Stripe Checkout URL
        window.location.href = paymentResponse.url;
        
    } catch (error) {
        hideLoading();
        console.error('❌ Payment setup failed:', error);
        
        // Check if it's a Stripe API key error or 404 error (development mode)
        if (error.message.includes('You did not provide an API key') || 
            error.message.includes('Failed to execute') || 
            error.message.includes('404')) {
            const userChoice = confirm(
                '🚧 UTVECKLINGSLÄGE 🚧\\n\\n' +
                'Stripe API-nycklarna är inte konfigurerade än.\\n\\n' +
                'Vill du testa sagogenerering utan betalning?\\n\\n' +
                'Klicka OK för att skapa saga direkt\\n' +
                'Klicka Avbryt för att avbryta\\n\\n' +
                '(Detta är bara för utveckling och testning)'
            );
            
            if (userChoice) {
                await handleDevelopmentStoryGeneration(storyData);
                return;
            }
        }
        
        showError('Det gick inte att förbereda betalningen: ' + error.message);
    }
}

// Development mode story generation (without payment)
async function handleDevelopmentStoryGeneration(storyData) {
    try {
        console.log('🚧 Running in development mode - no payment required');
        
        // Show story generation progress
        showProgressiveLoading();
        updateLoadingProgress('Skapar din berättelse... (utvecklingsläge)', 0);
        
        // Create a mock story for testing until functions are fixed
        const mockStory = {
            title: storyData.title,
            childName: storyData.childName,
            content: `${storyData.childName} började sitt äventyr i ${storyData.theme} världen. Detta var början på en magisk resa som skulle förändra allt.

När ${storyData.childName} gick djupare in i äventyret, upptäckte hen saker som aldrig tidigare skådats. Varje steg framåt var fyllt med spänning och nyfikenhet.

Plötsligt träffade ${storyData.childName} en vänlig karaktär som skulle bli hens guide genom resten av resan. Tillsammans skulle de lösa mysterier och övervinna utmaningar.

Äventyret tog en oväntat vändning när ${storyData.childName} upptäckte en hemlig kraft inom sig själv. Denna kraft skulle bli nyckeln till att lösa det stora mysteriet.

Med mod och klokhet lyckades ${storyData.childName} övervinna alla hinder. Hen lärde sig viktiga lektioner om vänskap, mod och att tro på sig själv.

Till slut återvände ${storyData.childName} hem, förändrad av äventyret och fylld med visdom att dela med andra. Resan var över, men minnena skulle leva för evigt.`,
            images: [
                { position: 0, url: 'images/demo_prinsessan_0.png', description: 'Äventyrets början' },
                { position: 1, url: 'images/demo_prinsessan_1.png', description: 'Upptäckt av nya världar' },
                { position: 2, url: 'images/demo_prinsessan_2.png', description: 'Träffar en guide' },
                { position: 3, url: 'images/demo_prinsessan_3.png', description: 'Upptäcker inre kraft' },
                { position: 4, url: 'images/demo_prinsessan_4.png', description: 'Övervinner utmaningar' },
                { position: 5, url: 'images/demo_prinsessan_5.png', description: 'Hemkomst med visdom' }
            ]
        };
        
        // Simulate AI processing time
        setTimeout(() => {
            updateLoadingProgress('AI genererar text...', 1);
        }, 2000);
        
        setTimeout(() => {
            updateLoadingProgress('Skapar illustrationer...', 2);
        }, 4000);
        
        setTimeout(() => {
            // Hide loading
            hideLoading();
            
            // Show story result
            displayStoryResult(mockStory);
            
            // Show development notice
            setTimeout(() => {
                alert('🚧 UTVECKLINGSLÄGE - MOCK SAGA 🚧\\n\\n' +
                      'Detta är en test-saga medan Netlify Functions konfigureras.\\n\\n' +
                      'I produktionsläget skapas en riktig personlig saga med AI\\n' +
                      'och skickas via email för 50 kr.');
            }, 1000);
        }, 6000);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Development story generation failed:', error);
        showError('Det gick inte att skapa sagan i utvecklingsläge: ' + error.message);
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

function showLoading(message = 'Laddar...') {
    const loadingElement = document.getElementById('loadingAnimation');
    const loadingText = loadingElement.querySelector('.loading-text');
    
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    // Force show with inline styles
    loadingElement.style.display = 'flex';
    loadingElement.style.position = 'fixed';
    loadingElement.style.top = '0';
    loadingElement.style.left = '0';
    loadingElement.style.width = '100vw';
    loadingElement.style.height = '100vh';
    loadingElement.style.background = 'rgba(0, 0, 0, 0.8)';
    loadingElement.style.zIndex = '999999';
    loadingElement.style.justifyContent = 'center';
    loadingElement.style.alignItems = 'center';
    loadingElement.style.flexDirection = 'column';
    
    console.log('🔍 Loading shown with display:', loadingElement.style.display);
}

function hideLoading() {
    const loadingElement = document.getElementById('loadingAnimation');
    
    // Force hide with inline styles
    loadingElement.style.display = 'none';
    
    // Clear any pending progress updates
    window.storyGenerationComplete = true;
    
    console.log('📝 Loading hidden - display set to:', loadingElement.style.display);
}

function displayStoryResult(story, isDemo = false) {
    const resultSection = document.getElementById('storyResult');
    const titleElement = document.getElementById('generatedTitle');
    const subtitleElement = document.getElementById('generatedSubtitle');
    const contentElement = document.getElementById('storyContent');
    
    // Set title and subtitle
    titleElement.textContent = story.title;
    subtitleElement.textContent = `En personlig saga för ${story.childName}`;
    
    // Display story content with images
    displayStoryWithImages(story, contentElement);
    
    // Show result section
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
    
    // Store story for PDF generation
    window.currentStory = story;
}

function displayStoryWithImages(story, container) {
    container.innerHTML = '';
    
    const paragraphs = story.content.split('\n\n').filter(p => p.trim());
    
    paragraphs.forEach((paragraph, index) => {
        // Create page container
        const pageDiv = document.createElement('div');
        pageDiv.className = 'story-page';
        
        // Add image for this page
        const storyImage = story.images.find(img => img.position === index);
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
        
        const pdf = await netlifyAPI.createPDF(window.currentStory);
        pdf.save(`${window.currentStory.title} - ${window.currentStory.childName}.pdf`);
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('❌ PDF download error:', error);
        showError('Det gick inte att skapa PDF:en: ' + error.message);
    }
}

// Share Story
function shareStory() {
    if (navigator.share && window.currentStory) {
        navigator.share({
            title: window.currentStory.title,
            text: `Kolla in den här AI-skapade sagan: ${window.currentStory.title}`,
            url: window.location.href
        });
    } else {
        // Fallback
        const text = `Kolla in den här AI-skapade sagan: ${window.currentStory.title}`;
        navigator.clipboard.writeText(text).then(() => {
            alert('Länk kopierad till urklipp!');
        });
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

// Demo Stories Data
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
        images: [
            { position: 0, url: 'images/demo_jättefisken_0.png', description: 'Mia vid havets kant med simfötter och mask' },
            { position: 1, url: 'images/demo_jättefisken_1.png', description: 'Färgglada fiskar i korallriket' },
            { position: 2, url: 'images/demo_jättefisken_2.png', description: 'Den enorma jättefisken träffar Mia' },
            { position: 3, url: 'images/demo_jättefisken_3.png', description: 'Jättefisken visar Mia havets underverk' },
            { position: 4, url: 'images/demo_jättefisken_4.png', description: 'Avsked vid solnedgången' },
            { position: 5, url: 'images/demo_jättefisken_5.png', description: 'Mia på stranden i skymningen' }
        ]
    },
    'prinsessan': {
        title: 'Prinsessan och Stjärnan',
        childName: 'Livia',
        content: `Det var en gång en modig liten prinsessa vid namn Livia. Hon älskade att springa runt i det kungliga slottets stora trädgård och drömma om äventyr. Men mest av allt älskade hon att titta på stjärnhimlen när mörkret hade lagt sig och allt var tyst.

En kväll, när Livia låg i gräset och betraktade stjärnorna, såg hon en som blinkade särskilt klart. Plötsligt, med ett svagt ljud, föll den blinkande stjärnan från himlen och landade alldeles intill henne. Livia blev först lite rädd, men hennes nyfikenhet vann över rädslan och hon gick närmare för att undersöka.

Vid foten av ett gammalt äppelträd låg en liten ljusglimt, det var den fallna stjärnan. Livia sträckte försiktigt ut handen och till hennes förvåning började stjärnan vibrera och blev till en liten flicka, lika vacker och skimrande som en stjärna. Flickan presenterade sig som Stella och berättade att hon var en stjärna som hade fallit ner på jorden.

Stella var ledsen för hon visste inte hur hon skulle komma tillbaka till stjärnhimlen. Livia lovade att hon skulle hjälpa henne. Trots att hon var osäker på hur, visste hon att vänliga handlingar alltid leder till lösningar. Tillsammans begav de sig ut på ett äventyr för att hitta ett sätt att föra Stella tillbaka till himlen.

Under deras äventyr stötte de på många utmaningar, men Livia var alltid där för att hjälpa Stella. Hon använde sin klokhet och sitt mod för att lösa problemen de stötte på. Hon visade att man inte behöver vara stor för att göra stora saker, och att mod inte handlar om att vara orädd, utan om att göra det rätta trots att man är rädd.

Till slut, efter många äventyr, fann de en gammal trollkarl som visste hur man kunde skicka Stella tillbaka till stjärnhimlen. Livia kände sig ledsen över att behöva säga hejdå till sin nya vän, men hon visste att det var det rätta att göra. När Stella återvände till himlen, blev hon den klaraste stjärnan på natthimlen, alltid påminnande Livia om deras äventyr tillsammans.`,
        images: [
            { position: 0, url: 'images/demo_prinsessan_0.png', description: 'Prinsessan Livia i slottsträdgården' },
            { position: 1, url: 'images/demo_prinsessan_1.png', description: 'Stjärnan faller från himlen' },
            { position: 2, url: 'images/demo_prinsessan_2.png', description: 'Livia träffar Stella vid äppelträdet' },
            { position: 3, url: 'images/demo_prinsessan_3.png', description: 'Livia lovar att hjälpa Stella' },
            { position: 4, url: 'images/demo_prinsessan_4.png', description: 'Äventyr och utmaningar tillsammans' },
            { position: 5, url: 'images/demo_prinsessan_5.png', description: 'Stella återvänder till stjärnhimlen' }
        ]
    },
    'räven': {
        title: 'Sagan om Räven',
        childName: 'Joel',
        content: `Joel gick genom den tjocka skogen en solig eftermiddag, nyfiken på vad han skulle upptäcka. Träden skapade ett grönt tak över honom, och fåglarnas sång fyllde luften med melodi.

Plötsligt hörde han ett svagt gnäll från en buske. Joel tittade närmare och såg en liten rävunge som satt fast under en gren. Försiktigt lyfte Joel grenen och befriade den lilla räven. "Tack så mycket," sa rävungen med en pip. "Jag heter Rödis."

Joel och Rödis blev snabbt vänner. Rödis visade Joel hemliga stigar genom skogen som endast djuren kände till. De lekte kurragömma bland träden och delade bär som de plockade längs vägen.

En dag, när de utforskade en ny del av skogen, blev de vilse. Joel kände sig orolig, men Rödis sa lugnt, "Oroa dig inte, Joel. Vi kan använda våra sinnen för att hitta vägen hem." Tillsammans använde de ljud, dofter och ledtrådar från naturen för att navigera.

Efter en lång dag av äventyr hittade de till slut tillbaka. Joel insåg hur viktig vänskap var och hur mycket han lärt sig från sin nya vän. Rödis hade lärt honom att lita på naturen och sina egna förmågor.

Från den dagen besökte Joel skogen ofta för att träffa Rödis. Deras vänskap växte starkare för varje äventyr de delade, och Joel förstod att vänskap och mod kan hjälpa en att övervinna alla utmaningar som livet för med sig.`,
        images: [
            { position: 0, url: 'images/demo_r�ven_0.png', description: 'Joel går genom den tjocka skogen' },
            { position: 1, url: 'images/demo_r�ven_1.png', description: 'Joel räddar rävungen Rödis' },
            { position: 2, url: 'images/demo_r�ven_2.png', description: 'Joel och Rödis leker i skogen' },
            { position: 3, url: 'images/demo_r�ven_3.png', description: 'De blir vilse i skogen' },
            { position: 4, url: 'images/demo_r�ven_4.png', description: 'Joel och Rödis hittar hem tillsammans' },
            { position: 5, url: 'images/demo_r�ven_5.png', description: 'Vänskap som varar för evigt' }
        ]
    }
};

// Demo Stories
function setupDemoStories() {
    console.log('📚 Demo stories loaded');
}

async function readDemoStory(storyId) {
    console.log('📖 Reading demo story:', storyId);
    
    const story = demoStories[storyId];
    if (!story) {
        showError('Demo-saga hittades inte: ' + storyId);
        return;
    }
    
    // Display the demo story
    displayStoryResult(story, true);
}

// Progressive loading with status updates
function showProgressiveLoading() {
    // Reset completion flag
    window.storyGenerationComplete = false;
    
    const loadingElement = document.getElementById('loadingAnimation');
    const loadingText = loadingElement.querySelector('.loading-text');
    const loadingSubtext = loadingElement.querySelector('.loading-subtext');
    
    if (!loadingElement) {
        console.error('❌ Loading element not found!');
        return;
    }
    
    if (loadingText) {
        loadingText.textContent = 'Skriver din berättelse... ✨';
    }
    
    if (loadingSubtext) {
        loadingSubtext.textContent = 'Detta tar några minuter - AI skapar din personliga saga';
    }
    
    // Force show with all inline styles
    loadingElement.style.display = 'flex';
    loadingElement.style.position = 'fixed';
    loadingElement.style.top = '0';
    loadingElement.style.left = '0';
    loadingElement.style.width = '100vw';
    loadingElement.style.height = '100vh';
    loadingElement.style.background = 'rgba(0, 0, 0, 0.8)';
    loadingElement.style.zIndex = '999999';
    loadingElement.style.justifyContent = 'center';
    loadingElement.style.alignItems = 'center';
    loadingElement.style.flexDirection = 'column';
    
    console.log('📝 Progressive loading started and made visible');
    console.log('🔍 Loading element display:', loadingElement.style.display);
}

function updateLoadingProgress(message, step) {
    // Don't update progress if story generation is complete
    if (window.storyGenerationComplete) {
        console.log('🚫 Skipping progress update - story complete');
        return;
    }
    
    const loadingText = document.querySelector('#loadingAnimation .loading-text');
    const loadingSubtext = document.querySelector('#loadingAnimation .loading-subtext');
    const loadingElement = document.getElementById('loadingAnimation');
    
    // Only update if loading element should be visible
    if (loadingElement && loadingElement.style.display === 'flex') {
        console.log(`📊 Updating progress: ${message} (step ${step})`);
        
        if (loadingText) {
            loadingText.textContent = message;
            console.log(`📝 Updated text: ${message}`);
        }
        
        const subtextMessages = [
            'AI skriver text baserat på dina önskemål',
            'DALL-E skapar vackra bilder - detta tar 2-3 minuter',
            'Kombinerar text och bilder till din sagbok',
            'Gör de sista justeringarna'
        ];
        
        if (step < subtextMessages.length && loadingSubtext) {
            loadingSubtext.textContent = subtextMessages[step];
            console.log(`📝 Updated subtext: ${subtextMessages[step]}`);
        }
    } else {
        console.log('🚫 Loading element not visible, skipping progress update');
    }
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