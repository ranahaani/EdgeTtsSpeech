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
    const clearTextBtn = document.getElementById('clear-text-btn');
    const sampleTextBtn = document.getElementById('sample-text-btn');
    const tryDemoBtn = document.querySelector('.try-btn');

    // Variables to store state
    let selectedVoice = '';
    let voices = {};
    let audioBlob = null;
    
    // Sample texts for various languages
    const sampleTexts = {
        'en-US': "Welcome to Edge Voice! This sample demonstrates our text-to-speech capabilities with natural-sounding voices.",
        'es-ES': "¡Bienvenido a Edge Voice! Esta muestra demuestra nuestras capacidades de texto a voz con voces de sonido natural.",
        'fr-FR': "Bienvenue sur Edge Voice! Cet exemple démontre nos capacités de synthèse vocale avec des voix naturelles.",
        'de-DE': "Willkommen bei Edge Voice! Dieses Beispiel demonstriert unsere Text-zu-Sprache-Funktionen mit natürlich klingenden Stimmen.",
        'hi-IN': "एज वॉइस में आपका स्वागत है! यह नमूना प्राकृतिक-ध्वनि वाली आवाज़ों के साथ हमारी टेक्स्ट-टू-स्पीच क्षमताओं को प्रदर्शित करता है।",
        'ar-SA': "مرحبًا بكم في Edge Voice! توضح هذه العينة قدرات تحويل النص إلى كلام لدينا بأصوات تبدو طبيعية.",
        'default': "Welcome to Edge Voice! This sample demonstrates our text-to-speech capabilities with natural-sounding voices."
    };

    // Initialize
    init();
    
    function init() {
        // Fetch voices
        fetchVoices();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize character count
        updateCharacterCount();
        
        // Add scroll animations
        setupScrollAnimations();
        
        // Add waveform animation
        initWaveformAnimation();
    }
    
    function setupEventListeners() {
        // Form controls
        voiceGroupSelect.addEventListener('change', populateVoiceSelect);
        textInput.addEventListener('input', updateCharacterCount);
        clearTextBtn.addEventListener('click', clearText);
        sampleTextBtn.addEventListener('click', insertSampleText);
        
        // Form submission
        document.getElementById('tts-form').addEventListener('submit', function(e) {
            if (!validateForm()) {
                e.preventDefault();
            }
        });
        
        // Try demo button scrolls to converter section
        if (tryDemoBtn) {
            tryDemoBtn.addEventListener('click', function() {
                document.getElementById('converter').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            });
        }
        
        // Add smooth scrolling to all anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
    
    function setupScrollAnimations() {
        // Elements to animate on scroll
        const animatedElements = document.querySelectorAll('.feature-card, .api-card, .converter-card');
        
        // Initial check for elements in viewport
        checkElementsInViewport(animatedElements);
        
        // Check on scroll
        window.addEventListener('scroll', function() {
            checkElementsInViewport(animatedElements);
        });
    }
    
    function checkElementsInViewport(elements) {
        elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const isInViewport = (
                rect.top <= (window.innerHeight * 0.8) && 
                rect.bottom >= 0
            );
            
            if (isInViewport) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }
    
    function initWaveformAnimation() {
        // Random animation for waveform bars on hero section
        const waveformBars = document.querySelectorAll('.waveform-bar');
        waveformBars.forEach(bar => {
            // Add random height for more natural look
            const randomHeight = 30 + Math.random() * 50;
            bar.style.height = `${randomHeight}px`;
        });
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
                showAlert('Error fetching voices. Please try again.', 'danger');
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
                
                // Get a gender-appropriate icon
                let genderIcon = 'user';
                if (voice.gender === 'Female') {
                    genderIcon = 'female';
                } else if (voice.gender === 'Male') {
                    genderIcon = 'male';
                }
                
                const card = document.createElement('div');
                card.className = 'voice-card';
                card.style.animationDelay = `${index * 0.1}s`;
                
                card.innerHTML = `
                    <div class="voice-icon">
                        <i class="fas fa-${genderIcon}"></i>
                    </div>
                    <h3>${voice.display_name}</h3>
                    <p>${getLanguageName(lang)}</p>
                    <div class="voice-badge">${voice.gender}</div>
                    <button class="voice-btn select-voice-btn" data-voice="${voice.name}">
                        <i class="fas fa-headphones"></i> Select Voice
                    </button>
                `;
                
                speakerCardsContainer.appendChild(card);
            }
        });
        
        // Add event listeners to speaker cards
        document.querySelectorAll('.select-voice-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const voiceName = this.getAttribute('data-voice');
                
                // Find the language of this voice
                let voiceLanguage = '';
                Object.keys(voices).forEach(lang => {
                    voices[lang].forEach(voice => {
                        if (voice.name === voiceName) {
                            voiceLanguage = lang;
                        }
                    });
                });
                
                // Set the voice group and voice select values
                if (voiceLanguage) {
                    // Scroll to converter section
                    document.getElementById('converter').scrollIntoView({ 
                        behavior: 'smooth' 
                    });
                    
                    // After scrolling, set the values with a small delay
                    setTimeout(() => {
                        voiceGroupSelect.value = voiceLanguage;
                        populateVoiceSelect();
                        voiceSelect.value = voiceName;
                        selectedVoice = voiceName;
                        
                        // Add highlight animation to form
                        const converterCard = document.querySelector('.converter-card');
                        converterCard.classList.add('pulse');
                        setTimeout(() => {
                            converterCard.classList.remove('pulse');
                        }, 500);
                    }, 600);
                }
            });
        });
    }

    // Function to validate form before submission
    function validateForm() {
        const text = textInput.value.trim();
        selectedVoice = voiceSelect.value;
        
        if (!text) {
            showAlert('Please enter some text to convert.', 'warning');
            return false;
        }

        // The form will handle the submission directly to the server
        showLoading(true);
        return true;
    }

    // Helper function to show loading spinner
    function showLoading(show) {
        if (show) {
            loadingSpinner.style.display = 'flex';
            loadingSpinner.style.opacity = '0';
            setTimeout(() => {
                loadingSpinner.style.opacity = '1';
            }, 10);
        } else {
            loadingSpinner.style.opacity = '0';
            setTimeout(() => {
                loadingSpinner.style.display = 'none';
            }, 300);
        }
    }

    // Helper function to show alerts
    function showAlert(message, type) {
        conversionAlert.textContent = message;
        conversionAlert.className = `status-alert alert-${type}`;
        conversionAlert.style.display = 'block';
        
        // Add show-alert class for animation
        setTimeout(() => {
            conversionAlert.classList.add('show-alert');
        }, 10);
        
        // Hide alert after 5 seconds
        setTimeout(() => {
            conversionAlert.classList.remove('show-alert');
            setTimeout(() => {
                conversionAlert.style.display = 'none';
            }, 400);
        }, 5000);
    }

    // Function to update character count display
    function updateCharacterCount() {
        const text = textInput.value;
        const count = text.length;
        characterCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
        
        // Change color based on length
        if (count > 1000) {
            characterCount.style.color = '#ef4444';
        } else if (count > 500) {
            characterCount.style.color = '#f59e0b';
        } else {
            characterCount.style.color = '';
        }
    }
    
    // Function to clear the text input
    function clearText() {
        textInput.value = '';
        updateCharacterCount();
        
        // Add a small animation to the button
        clearTextBtn.classList.add('active');
        setTimeout(() => {
            clearTextBtn.classList.remove('active');
        }, 200);
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
        
        // Animate the text area
        textInput.classList.add('pulse');
        setTimeout(() => {
            textInput.classList.remove('pulse');
        }, 500);
        
        // Show a brief message
        showAlert('Sample text inserted for ' + getLanguageName(selectedGroup), 'info');
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
