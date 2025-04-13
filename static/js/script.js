document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const textInput = document.getElementById('text-input');
    const voiceSelect = document.getElementById('voice-select');
    const convertBtn = document.getElementById('convert-btn');
    const speakerCardsContainer = document.getElementById('speaker-cards');
    const voiceGroupSelect = document.getElementById('voice-group-select');
    const loadingSpinner = document.getElementById('loading-spinner');
    const conversionAlert = document.getElementById('conversion-alert');
    const characterCount = document.getElementById('character-count');
    const durationEstimate = document.getElementById('duration');
    const clearTextBtn = document.getElementById('clear-text-btn');
    const sampleTextBtn = document.getElementById('sample-text-btn');
    const hiddenForm = document.getElementById('tts-form');
    const formText = document.getElementById('form-text');
    const formVoice = document.getElementById('form-voice');
    const faqQuestions = document.querySelectorAll('.faq-question');
    const menuButton = document.getElementById('menu-button');

    // Variables to store state
    let selectedVoice = '';
    let voices = {};
    
    // Sample texts for various languages
    const sampleTexts = {
        'en-US': "Welcome to VoiceSync! This is a sample text to demonstrate the text-to-speech capabilities.",
        'es-ES': "¡Bienvenido a VoiceSync! Este es un texto de muestra para demostrar las capacidades de texto a voz.",
        'fr-FR': "Bienvenue sur VoiceSync! Ceci est un exemple de texte pour démontrer les capacités de synthèse vocale.",
        'de-DE': "Willkommen bei VoiceSync! Dies ist ein Beispieltext, um die Text-to-Speech-Funktionen zu demonstrieren.",
        'hi-IN': "वॉइसिंक में आपका स्वागत है! यह टेक्स्ट-टू-स्पीच क्षमताओं को प्रदर्शित करने के लिए एक नमूना पाठ है।",
        'ar-SA': "مرحبًا بك في فويس سينك! هذا نص عينة لإظهار إمكانيات تحويل النص إلى كلام.",
        'default': "Welcome to VoiceSync! This is a sample text to demonstrate the text-to-speech capabilities."
    };

    // Initialize
    initializeApp();

    // Setup event listeners
    setupEventListeners();

    // Main initialization function
    function initializeApp() {
        // Fetch voices from the server
        fetchVoices();
        
        // Initialize character count
        updateCharacterCount();
        
        // Set up smooth scrolling for anchor links
        setupSmoothScrolling();
        
        // Set up FAQ accordions
        setupFaqAccordions();
    }

    // Set up event listeners
    function setupEventListeners() {
        // Form controls
        voiceGroupSelect.addEventListener('change', populateVoiceSelect);
        textInput.addEventListener('input', updateCharacterCount);
        clearTextBtn.addEventListener('click', clearText);
        sampleTextBtn.addEventListener('click', insertSampleText);
        convertBtn.addEventListener('click', handleConvert);
        
        // Mobile menu
        if (menuButton) {
            menuButton.addEventListener('click', toggleMobileMenu);
        }
    }

    // Handle mobile menu toggle
    function toggleMobileMenu() {
        const nav = document.querySelector('nav');
        if (nav.classList.contains('hidden')) {
            nav.classList.remove('hidden');
            nav.classList.add('flex', 'flex-col', 'absolute', 'top-16', 'left-0', 'right-0', 'bg-white', 'shadow-md', 'p-4', 'z-50');
        } else {
            nav.classList.add('hidden');
            nav.classList.remove('flex', 'flex-col', 'absolute', 'top-16', 'left-0', 'right-0', 'bg-white', 'shadow-md', 'p-4', 'z-50');
        }
    }

    // Set up smooth scrolling for anchor links
    function setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // Set up FAQ accordions
    function setupFaqAccordions() {
        faqQuestions.forEach(question => {
            question.addEventListener('click', function() {
                const answer = this.nextElementSibling;
                const icon = this.querySelector('i');
                
                if (answer.classList.contains('hidden')) {
                    answer.classList.remove('hidden');
                    icon.setAttribute('data-lucide', 'chevron-up');
                } else {
                    answer.classList.add('hidden');
                    icon.setAttribute('data-lucide', 'chevron-down');
                }
                
                // Re-render the icon
                lucide.createIcons({
                    icons: {
                        'chevron-up': icon.dataset.lucide === 'chevron-up',
                        'chevron-down': icon.dataset.lucide === 'chevron-down'
                    },
                    element: icon.parentElement
                });
            });
        });
    }

    // Handle convert button click
    function handleConvert() {
        const text = textInput.value.trim();
        selectedVoice = voiceSelect.value;
        
        if (!text) {
            showAlert('Please enter some text to convert.', 'error');
            return;
        }
        
        // Set form values
        formText.value = text;
        formVoice.value = selectedVoice;
        
        // Show loading spinner
        showLoading(true);
        
        // Submit the form
        hiddenForm.submit();
    }

    // Function to fetch voices from the server
    function fetchVoices() {
        showLoading(true);
        fetch('/voices')
            .then(response => response.json())
            .then(data => {
                voices = data;
                populateVoiceGroups(data);
                populateVoiceSelect();
                createSpeakerCards();
                showLoading(false);
            })
            .catch(error => {
                console.error('Error fetching voices:', error);
                showAlert('Error fetching voices. Please try again.', 'error');
                showLoading(false);
            });
    }

    // Function to populate voice groups dropdown
    function populateVoiceGroups(voiceGroups) {
        voiceGroupSelect.innerHTML = '';
        
        Object.keys(voiceGroups).sort().forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = getLanguageName(group);
            voiceGroupSelect.appendChild(option);
        });
    }

    // Function to populate voice select dropdown based on selected group
    function populateVoiceSelect() {
        const selectedGroup = voiceGroupSelect.value;
        voiceSelect.innerHTML = '';
        
        if (voices[selectedGroup]) {
            voices[selectedGroup].forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.display_name} (${voice.gender})`;
                voiceSelect.appendChild(option);
            });
            
            // Select first voice by default
            if (voices[selectedGroup].length > 0) {
                selectedVoice = voices[selectedGroup][0].name;
                voiceSelect.value = selectedVoice;
            }
        }
    }

    // Function to create speaker cards for featured voices
    function createSpeakerCards() {
        speakerCardsContainer.innerHTML = '';
        
        // Select a few featured languages with better coverage
        const featuredLanguages = [
            'en-US', 'es-ES', 'fr-FR', 'de-DE', 'hi-IN', 'ar-SA'
        ];
        
        // Add cards with staggered animation
        featuredLanguages.forEach((lang, index) => {
            if (voices[lang] && voices[lang].length > 0) {
                // Pick the first voice of each featured language
                const voice = voices[lang][0];
                
                const card = document.createElement('div');
                card.className = 'voice-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition';
                card.dataset.voiceId = voice.name;
                card.dataset.language = lang;
                
                // Generate a random avatar using initials from the voice name
                const initials = voice.display_name.split(' ').map(word => word[0]).join('').toUpperCase();
                const genderClass = voice.gender === 'Female' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600';
                
                const traits = ['Natural', voice.gender, getLanguageName(lang)];
                const traitHtml = traits.map(trait => 
                    `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${trait}</span>`
                ).join('');
                
                card.innerHTML = `
                    <div class="flex items-center mb-4">
                        <div class="w-14 h-14 rounded-full flex items-center justify-center ${genderClass} font-bold text-xl mr-4">
                            ${initials}
                        </div>
                        <div>
                            <h3 class="font-semibold text-lg">${voice.display_name}</h3>
                            <p class="text-gray-600">${getLanguageName(lang)} | ${voice.gender}</p>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-1 mt-2">
                        ${traitHtml}
                    </div>
                `;
                
                // Add click event listener to select this voice
                card.addEventListener('click', function() {
                    // Set the voice group and voice select values
                    voiceGroupSelect.value = lang;
                    populateVoiceSelect();
                    voiceSelect.value = voice.name;
                    selectedVoice = voice.name;
                    
                    // Highlight selected card
                    document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                    
                    // Scroll to converter section
                    document.getElementById('converter').scrollIntoView({ behavior: 'smooth' });
                });
                
                speakerCardsContainer.appendChild(card);
            }
        });
    }

    // Helper function to show loading spinner
    function showLoading(show) {
        if (show) {
            loadingSpinner.classList.remove('hidden');
        } else {
            loadingSpinner.classList.add('hidden');
        }
    }

    // Helper function to show alerts
    function showAlert(message, type) {
        // Map type to Tailwind classes
        const alertClasses = {
            'success': 'bg-green-50 border-green-500 text-green-700',
            'error': 'bg-red-50 border-red-500 text-red-700',
            'warning': 'bg-yellow-50 border-yellow-500 text-yellow-700',
            'info': 'bg-blue-50 border-blue-500 text-blue-700'
        };
        
        conversionAlert.className = `mt-6 p-4 rounded-lg border border-l-4 ${alertClasses[type] || alertClasses.info}`;
        conversionAlert.textContent = message;
        conversionAlert.classList.remove('hidden');
        
        // Hide alert after 5 seconds
        setTimeout(() => {
            conversionAlert.classList.add('hidden');
        }, 5000);
    }

    // Function to update character count display
    function updateCharacterCount() {
        const text = textInput.value;
        const count = text.length;
        characterCount.textContent = `${count}/5000 characters`;
        
        // Estimate duration (approximately 15 characters per second)
        const seconds = Math.ceil(count / 15);
        durationEstimate.textContent = `Estimated duration: ${seconds}s`;
        
        // Enable/disable convert button based on text length
        if (count > 0 && count <= 5000) {
            convertBtn.disabled = false;
            convertBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            convertBtn.disabled = true;
            convertBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Function to clear the text input
    function clearText() {
        textInput.value = '';
        updateCharacterCount();
    }
    
    // Function to insert sample text
    function insertSampleText() {
        const selectedGroup = voiceGroupSelect.value;
        let textToInsert = sampleTexts['default'];
        
        // Get sample text for selected language if available
        if (selectedGroup && sampleTexts[selectedGroup]) {
            textToInsert = sampleTexts[selectedGroup];
        }
        
        textInput.value = textToInsert;
        updateCharacterCount();
        
        // Flash effect
        textInput.classList.add('ring-2', 'ring-blue-300');
        setTimeout(() => {
            textInput.classList.remove('ring-2', 'ring-blue-300');
        }, 500);
    }

    // Helper function to get language name from code
    function getLanguageName(code) {
        const languageNames = {
            'en-US': 'English (US)',
            'en-GB': 'English (UK)',
            'es-ES': 'Spanish',
            'fr-FR': 'French',
            'de-DE': 'German',
            'it-IT': 'Italian',
            'ja-JP': 'Japanese',
            'ko-KR': 'Korean',
            'pt-BR': 'Portuguese (Brazil)',
            'ru-RU': 'Russian',
            'zh-CN': 'Chinese (Simplified)',
            'hi-IN': 'Hindi',
            'ar-SA': 'Arabic',
            'ur-PK': 'Urdu'
        };
        
        return languageNames[code] || code;
    }
});
