// Simple Story Generation Script - No Auth, No Payment
document.addEventListener('DOMContentLoaded', function() {
    initializeSimpleStorybook();
});

function initializeSimpleStorybook() {
    console.log('🌟 Simple AI Storybook Creator initialized');
    
    // Setup form handler
    const storyForm = document.getElementById('storyForm');
    if (storyForm) {
        storyForm.addEventListener('submit', handleSimpleStoryGeneration);
    }
    
    // Setup theme selection
    setupThemeSelection();
    
    // Setup demo stories
    setupDemoStories();
    
    // Test API connection
    testAPIConnection();
}

async function testAPIConnection() {
    try {
        const health = await simpleAPI.healthCheck();
        console.log('✅ API connection successful:', health);
    } catch (error) {
        console.error('❌ API connection failed:', error);
        showError('Kunde inte ansluta till servern. Kontrollera att backend körs på port 3001.');
    }
}

// Handle story generation with payment (with development mode fallback)
async function handleSimpleStoryGeneration(event) {
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
        // Store email for success page
        localStorage.setItem('customerEmail', storyData.parentEmail);
        
        // Show payment processing
        showProgressiveLoading();
        updateLoadingProgress('Förbereder betalning...', 0);
        
        // Try to create payment intent
        const paymentResponse = await simpleAPI.createPaymentIntent(storyData);
        
        if (!paymentResponse.success) {
            throw new Error(paymentResponse.error || 'Failed to create payment');
        }
        
        updateLoadingProgress('Omdirigerar till betalning...', 1);
        
        // Redirect to Stripe Checkout URL
        window.location.href = paymentResponse.url;
        
    } catch (error) {
        hideLoading();
        console.error('❌ Payment setup failed:', error);
        
        // Check if it's a Stripe API key error (development mode)
        if (error.message.includes('You did not provide an API key')) {
            const userChoice = confirm(
                '🚧 UTVECKLINGSLÄGE 🚧\n\n' +
                'Stripe API-nycklarna är inte konfigurerade än.\n\n' +
                'Vill du testa sagogenerering utan betalning?\n\n' +
                'Klicka OK för att skapa saga OCH skicka via email\n' +
                'Klicka Avbryt för att bara visa i webbläsaren\n\n' +
                '(Detta är bara för utveckling och testning)'
            );
            
            if (userChoice !== null) {
                await handleDevelopmentStoryGeneration(storyData, userChoice);
                return;
            }
        }
        
        showError('Det gick inte att förbereda betalningen: ' + error.message);
    }
}

// Development mode story generation (without payment)
async function handleDevelopmentStoryGeneration(storyData, sendEmail = false) {
    try {
        console.log('🚧 Running in development mode - no payment required');
        console.log('📧 Send email:', sendEmail);
        
        // Show story generation progress
        console.log('📱 About to show progressive loading...');
        showProgressiveLoading();
        console.log('📱 Progressive loading function called');
        
        if (sendEmail) {
            updateLoadingProgress('Skapar din berättelse och förbereder email... (utvecklingsläge)', 0);
            
            console.log('🚀 Starting API call for story generation...');
            
            // Generate story with email
            const result = await simpleAPI.generateStoryWithEmail(storyData);
            
            console.log('✅ API call completed, hiding loading...');
            
            // Hide loading immediately after completion
            hideLoading();
            
            // Show story result
            displayStoryResult(result.story);
            
            // Show success message
            setTimeout(() => {
                alert('🚧 UTVECKLINGSLÄGE 🚧\n\n' +
                      '✅ Din saga har skapats och skickats!\n\n' +
                      `📧 Email skickat till: ${storyData.parentEmail}\n\n` +
                      'I produktionsläget skulle detta kosta 50 kr.');
            }, 1000);
            
        } else {
            updateLoadingProgress('Skapar din berättelse... (utvecklingsläge)', 0);
            
            // Generate story for browser only
            const result = await simpleAPI.generateStory(storyData);
            
            // Hide loading immediately after completion
            hideLoading();
            
            // Show story result
            displayStoryResult(result.story);
            
            // Show development notice
            setTimeout(() => {
                alert('🚧 UTVECKLINGSLÄGE 🚧\n\n' +
                      'Din saga har skapats för testning (endast i webbläsaren).\n\n' +
                      'I produktionsläget skulle detta kosta 50 kr och skickas via email.');
            }, 1000);
        }
        
    } catch (error) {
        hideLoading();
        console.error('❌ Development story generation failed:', error);
        
        // Check if it's an email error
        if (error.message.includes('getaddrinfo ENOTFOUND') || error.message.includes('Authentication failed')) {
            showError('Email kunde inte skickas (Gmail inte konfigurerat). Sagan skapades ändå i webbläsaren.');
        } else {
            showError('Det gick inte att skapa sagan i utvecklingsläge: ' + error.message);
        }
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
    
    // Hide other sections
    document.getElementById('create').style.display = 'none';
    
    console.log('🔍 Loading shown with display:', loadingElement.style.display);
}

function hideLoading() {
    const loadingElement = document.getElementById('loadingAnimation');
    
    // Force hide with inline styles
    loadingElement.style.display = 'none';
    loadingElement.classList.remove('show');
    
    // Show form section again
    document.getElementById('create').style.display = 'block';
    
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
    
    // Hide download/share buttons for demo stories
    const storyActions = resultSection.querySelector('.story-actions');
    const downloadBtns = storyActions.querySelectorAll('.download-btn');
    
    if (isDemo) {
        // Hide PDF, EPUB, and Share buttons for demos
        downloadBtns.forEach(btn => {
            if (btn.textContent.includes('Ladda ner') || btn.textContent.includes('Dela')) {
                btn.style.display = 'none';
            }
        });
    } else {
        // Show all buttons for regular stories
        downloadBtns.forEach(btn => {
            btn.style.display = 'inline-block';
        });
    }
    
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
        
        const pdf = await simpleAPI.createPDF(window.currentStory);
        pdf.save(`${window.currentStory.title} - ${window.currentStory.childName}.pdf`);
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('❌ PDF download error:', error);
        showError('Det gick inte att skapa PDF:en: ' + error.message);
    }
}

// EPUB Download (placeholder)
function downloadEPUB() {
    showError('EPUB-export kommer snart! Använd PDF-nedladdning för tillfället.');
}

// Share Story (placeholder)
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

// Test function for loading modal
function testLoadingModal() {
    console.log('🧪 Testing loading modal...');
    
    // Check if loading element exists
    const loadingElement = document.getElementById('loadingAnimation');
    console.log('🔍 Loading element found:', !!loadingElement);
    
    if (loadingElement) {
        console.log('🔍 Loading element HTML:', loadingElement.outerHTML.substring(0, 200));
        console.log('🔍 Current display:', window.getComputedStyle(loadingElement).display);
        console.log('🔍 Current classes:', loadingElement.className);
        
        // Force show with all methods
        loadingElement.style.display = 'flex';
        loadingElement.style.position = 'fixed';
        loadingElement.style.top = '0';
        loadingElement.style.left = '0';
        loadingElement.style.width = '100vw';
        loadingElement.style.height = '100vh';
        loadingElement.style.background = 'rgba(255, 0, 0, 0.9)';
        loadingElement.style.zIndex = '999999';
        loadingElement.classList.add('show');
        
        console.log('🔍 After forcing show:', window.getComputedStyle(loadingElement).display);
    } else {
        console.error('❌ Loading element not found in DOM!');
    }
    
    setTimeout(() => {
        console.log('🧪 Test completed');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }, 5000);
}

// Make test function available globally
window.testLoadingModal = testLoadingModal;

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
        illustrations: []
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
        illustrations: []
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
        illustrations: []
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
        illustrations: []
    },
    'räven': {
        title: 'Sagan om Räven',
        childName: 'Joel',
        content: `Joel gick genom den tjocka skogen en solig eftermiddag, nyfiken på vad han skulle upptäcka. Träden skapade ett grönt tak över honom, och fåglarnas sång fyllde luften med melodi.

Plötsligt hörde han ett svagt gnäll från en buske. Joel tittade närmare och såg en liten rävunge som satt fast under en gren. Försiktigt lyfte Joel grenen och befriade den lilla räven. "Tack så mycket," sa rävungen med en pip. "Jag heter Rödis."

Joel och Rödis blev snabbt vänner. Rödis visade Joel hemliga stigar genom skogen som endast djuren kände till. De lekte kurragömma bland träden och delade bär som de plockade längs vägen.

En dag, när de utforskade en ny del av skogen, blev de vilse. Joel kände sig orolig, men Rödis sa lugnt, "Oroa dig inte, Joel. Vi kan använda våra sinnen för att hitta vägen hem." Tillsammans använde de ljud, dofter och ledtrådar från naturen för att navigera.

Efter en lång dag av äventyr hittade de till slut tillbaka. Joel insåg hur viktig vänskap var och hur mycket han lärt sig från sin nya vän. Rödis hade lärt honom att lita på naturen och sina egna förmågor.

Från den dagen besökte Joel skogen ofta för att träffa Rödis. Deras vänskap växte starkare för varje äventyr de delade. Joel lärde sig att de bästa vännerna kan komma från de mest oväntade ställen.

Varje gång Joel kände sig ensam eller osäker, tänkte han på Rödis och deras äventyr i skogen. Han förstod att vänskap och mod kan hjälpa en att övervinna alla utmaningar som livet för med sig.`,
        illustrations: []
    },
    'enhörning': {
        title: 'Enhörningen och Regnbågen',
        childName: 'Saga',
        content: `Saga älskade att titta på himlen efter regnet och vänta på regnbågar. En dag, när hon satt i trädgården efter en kraftig regnskur, såg hon något magiskt - en vit enhörning som gick längs regnbågens kant.

Enhörningen, som hette Luna, hade en glänsande mane och ett horn som skimrade i alla regnbågens färger. "Hej, Saga," sa Luna med en mjuk röst. "Jag har sett dig titta på regnbågarna. Vill du lära dig deras hemlighet?"

Luna tog Saga på en resa längs regnbågen. De vandrade över molnen och såg världen från ovan. "Varje färg på regnbågen har sin egen magi," förklarade Luna. "Röd för kärlek, orange för glädje, gul för hopp, grön för naturen, blå för frid, lila för visdom."

De träffade andra magiska varelser som bodde i molnen - fjärilar som målade himlen och fåglar som sjöng melodier som blev till regn. Saga lärde sig att varje regnskur var en förberedelse för något vackert.

När det blev dags att återvända, gav Luna Saga en liten kristall som skimrade i regnbågens färger. "Den här påminner dig om att efter varje mörk stund kommer ljus och skönhet," sa Luna.

Från den dagen, varje gång det regnade, log Saga och väntade ivrigt på regnbågen. Hon visste att Luna var där någonstans och att magi fanns överallt omkring henne, bara hon hade ögon att se det.

Saga lärde sig att även de svåraste dagarna kan leda till något vackert, precis som regnet leder till regnbågar. Och med Lunas kristall i handen kände hon sig alltid trygg och full av hopp om framtiden.`,
        illustrations: []
    }
};

// Demo Stories
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
    
    // Create story data in the same format as generated stories
    const paragraphs = story.content.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
    
    // Check if demo images exist, if not generate them
    const imageExists = await checkDemoImageExists(storyId, 0);
    
    if (!imageExists) {
        console.log('🎨 Demo images not found, generating...');
        showLoading('Genererar illustrationer för demo-sagan... 🎨');
        
        try {
            await simpleAPI.generateDemoImages(storyId, story.title, story.content);
            hideLoading();
            console.log('✅ Demo images generated successfully');
        } catch (error) {
            hideLoading();
            console.warn('Could not generate demo images:', error);
            // Continue anyway with placeholder images
        }
    }
    
    // Format story for display
    const storyData = {
        title: story.title,
        childName: story.childName,
        content: story.content,
        images: paragraphs.map((_, index) => ({
            position: index,
            url: `http://localhost:3001/uploads/images/demo_${storyId}_${index}.png`,
            description: `Illustration för ${story.title} - Sida ${index + 1}`
        }))
    };
    
    // Display the demo story (with isDemo = true to hide download buttons)
    displayStoryResult(storyData, true);
    
    // Store as current story for PDF download
    window.currentStory = storyData;
}

// Check if demo image exists
async function checkDemoImageExists(storyId, imageIndex) {
    try {
        const response = await fetch(`http://localhost:3001/uploads/images/demo_${storyId}_${imageIndex}.png`, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
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
    
    // Hide form section  
    document.getElementById('create').style.display = 'none';
    
    console.log('📝 Progressive loading started and made visible');
    console.log('🔍 Loading element display:', loadingElement.style.display);
    console.log('🔍 Loading element position:', loadingElement.style.position);
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
        } else {
            console.warn('❌ Loading text element not found');
        }
        
        const progressMessages = [
            'Skapar din personliga saga...',
            'Genererar illustrationer med AI...',
            'Sätter samman din sagbok...',
            'Nästan klar...'
        ];
        
        const subtextMessages = [
            'AI skriver text baserat på dina önskemål',
            'DALL-E skapar vackra bilder - detta tar 2-3 minuter',
            'Kombinerar text och bilder till din sagbok',
            'Gör de sista justeringarna'
        ];
        
        if (step < progressMessages.length && loadingSubtext) {
            loadingSubtext.textContent = subtextMessages[step];
            console.log(`📝 Updated subtext: ${subtextMessages[step]}`);
        } else if (!loadingSubtext) {
            console.warn('❌ Loading subtext element not found');
        }
    } else {
        console.log('🚫 Loading element not visible, skipping progress update');
    }
}

// Generate story with progress feedback
async function generateStoryWithProgress(storyData) {
    try {
        console.log('🎯 Starting story generation with progress...');
        
        // Update to text generation phase
        updateLoadingProgress('Skapar din personliga saga...', 0);
        
        // Start the API call
        const storyPromise = simpleAPI.generateStory(storyData);
        
        // Show image generation progress after a delay
        setTimeout(() => {
            updateLoadingProgress('Genererar illustrationer med AI...', 1);
        }, 5000);
        
        // Show assembly progress
        setTimeout(() => {
            updateLoadingProgress('Sätter samman din sagbok...', 2);
        }, 30000);
        
        // Show final progress
        setTimeout(() => {
            updateLoadingProgress('Nästan klar...', 3);
        }, 50000);
        
        // Wait for the actual result
        const result = await storyPromise;
        console.log('✅ Story generation completed');
        return result;
        
    } catch (error) {
        console.error('❌ Story generation failed:', error);
        throw error;
    }
}