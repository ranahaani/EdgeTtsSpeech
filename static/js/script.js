document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const textInput = document.getElementById('text-input');
    const voiceSelect = document.getElementById('voice-select');
    const voiceGroupSelect = document.getElementById('voice-group-select');
    const voiceCardsContainer = document.getElementById('voice-cards-container');
    const speakerCardsContainer = document.getElementById('speaker-cards');
    const loadingSpinner = document.getElementById('loading-spinner');
    const conversionAlert = document.getElementById('conversion-alert');
    const characterCount = document.getElementById('character-count');
    const clearTextBtn = document.getElementById('clear-text-btn');
    const sampleTextBtn = document.getElementById('sample-text-btn');
    const tryDemoBtn = document.querySelector('.try-btn');
    const playBtn = document.getElementById('play-btn');
    const downloadBtn = document.getElementById('download-btn');
    const downloadFlag = document.getElementById('download-flag');
    const audioPlayer = document.getElementById('audio-player');
    const audioPlayerContainer = document.getElementById('audio-player-container');
    const ttsForm = document.getElementById('tts-form');

    // Variables to store state
    let selectedVoice = '';
    let voices = {};
    let audioUrl = null;
    
    // Sample texts for various languages
    const sampleTexts = {
        'en-US': "Welcome to Speech Daddy! This sample demonstrates our text-to-speech capabilities with natural-sounding voices.",
        'es-ES': "¡Bienvenido a Speech Daddy! Esta muestra demuestra nuestras capacidades de texto a voz con voces de sonido natural.",
        'fr-FR': "Bienvenue sur Speech Daddy! Cet exemple démontre nos capacités de synthèse vocale avec des voix naturelles.",
        'de-DE': "Willkommen bei Speech Daddy! Dieses Beispiel demonstriert unsere Text-zu-Sprache-Funktionen mit natürlich klingenden Stimmen.",
        'hi-IN': "स्पीच डैडी में आपका स्वागत है! यह नमूना प्राकृतिक-ध्वनि वाली आवाज़ों के साथ हमारी टेक्स्ट-टू-स्पीच क्षमताओं को प्रदर्शित करता है।",
        'ar-SA': "مرحبًا بكم في Speech Daddy! توضح هذه العينة قدرات تحويل النص إلى كلام لدينا بأصوات تبدو طبيعية.",
        'default': "Welcome to Speech Daddy! This sample demonstrates our text-to-speech capabilities with natural-sounding voices."
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
        voiceGroupSelect.addEventListener('change', function() {
            populateVoiceSelect();
            populateVoiceCards();
        });
        textInput.addEventListener('input', updateCharacterCount);
        clearTextBtn.addEventListener('click', clearText);
        sampleTextBtn.addEventListener('click', insertSampleText);
        
        // Play button
        playBtn.addEventListener('click', function() {
            downloadFlag.value = 'false';
            generateAudio();
        });
        
        // Download button
        downloadBtn.addEventListener('click', function() {
            downloadFlag.value = 'true';
            generateAudio();
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
        const animatedElements = document.querySelectorAll('.feature-card, .api-card, .converter-card, .voice-card');
        
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
                populateVoiceCards();
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
                option.textContent = `${voice.display_name}`;
                voiceSelect.appendChild(option);
            });
            
            // Select first voice by default
            if (voices[selectedGroup].length > 0) {
                selectedVoice = voices[selectedGroup][0].name;
                voiceSelect.value = selectedVoice;
            }
        }
    }

    // Function to populate voice cards for selection
    function populateVoiceCards() {
        const selectedGroup = voiceGroupSelect.value;
        voiceCardsContainer.innerHTML = '';
        
        if (voices[selectedGroup]) {
            voices[selectedGroup].forEach(voice => {
                const card = document.createElement('div');
                card.className = 'voice-selection-card';
                card.setAttribute('data-voice', voice.name);
                
                const shortName = voice.short_name || voice.display_name.split(' ')[0];
                
                card.innerHTML = `
                    <div class="avatar">
                        <img src="${voice.avatar_url}" alt="${shortName}">
                    </div>
                    <h4>${shortName}</h4>
                    <p>${voice.gender}</p>
                `;
                
                card.addEventListener('click', function() {
                    // Remove selected class from all cards
                    document.querySelectorAll('.voice-selection-card').forEach(c => {
                        c.classList.remove('selected');
                    });
                    
                    // Add selected class to this card
                    this.classList.add('selected');
                    
                    // Update the hidden select
                    selectedVoice = this.getAttribute('data-voice');
                    voiceSelect.value = selectedVoice;
                });
                
                voiceCardsContainer.appendChild(card);
                
                // Select first card by default
                if (voice.name === selectedVoice) {
                    card.classList.add('selected');
                }
            });
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
                const shortName = voice.short_name || voice.display_name.split(' ')[0];
                
                const card = document.createElement('div');
                card.className = 'voice-card';
                card.style.animationDelay = `${index * 0.1}s`;
                
                card.innerHTML = `
                    <div class="voice-icon">
                        <img src="${voice.avatar_url}" alt="${shortName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                    </div>
                    <h3>${shortName}</h3>
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
                        populateVoiceCards();
                        voiceSelect.value = voiceName;
                        selectedVoice = voiceName;
                        
                        // Update selected card
                        document.querySelectorAll('.voice-selection-card').forEach(card => {
                            if (card.getAttribute('data-voice') === voiceName) {
                                card.classList.add('selected');
                            } else {
                                card.classList.remove('selected');
                            }
                        });
                        
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
    
    // Function to generate audio
    function generateAudio() {
        const text = textInput.value.trim();
        if (!text) {
            showAlert('Please enter some text to convert', 'warning');
            return;
        }
        
        if (!selectedVoice) {
            showAlert('Please select a voice', 'warning');
            return;
        }
        
        showLoading(true);
        
        // Create form data
        const formData = new FormData(ttsForm);
        
        // If it's for playing instead of downloading
        if (downloadFlag.value === 'false') {
            // Clear previous audio if it exists
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
                audioUrl = null;
            }
            
            fetch('/', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            })
            .then(blob => {
                // Create a URL for the blob
                audioUrl = URL.createObjectURL(blob);
                
                // Set the audio source and show the player
                audioPlayer.src = audioUrl;
                audioPlayerContainer.style.display = 'flex';
                
                // Play the audio
                audioPlayer.play();
                
                showLoading(false);
                showAlert('Audio generated successfully!', 'success');
            })
            .catch(error => {
                console.error('Error:', error);
                showLoading(false);
                showAlert('Error generating audio: ' + error.message, 'danger');
            });
        } else {
            // For download, submit the form directly
            ttsForm.submit();
            
            // Hide loading after a delay (since we're navigating away)
            setTimeout(() => {
                showLoading(false);
            }, 2000);
        }
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
            'en-AU': 'English (Australia)',
            'en-CA': 'English (Canada)',
            'en-IN': 'English (India)',
            'en-IE': 'English (Ireland)',
            'es-ES': 'Spanish',
            'es-MX': 'Spanish (Mexico)',
            'fr-FR': 'French',
            'fr-CA': 'French (Canada)',
            'de-DE': 'German',
            'it-IT': 'Italian',
            'ja-JP': 'Japanese',
            'ko-KR': 'Korean',
            'pt-BR': 'Portuguese (Brazil)',
            'pt-PT': 'Portuguese',
            'ru-RU': 'Russian',
            'zh-CN': 'Chinese (Simplified)',
            'zh-TW': 'Chinese (Taiwan)',
            'zh-HK': 'Chinese (Hong Kong)',
            'nl-NL': 'Dutch',
            'nl-BE': 'Dutch (Belgium)',
            'hi-IN': 'Hindi',
            'ar-SA': 'Arabic',
            'ar-AE': 'Arabic (UAE)',
            'ar-QA': 'Arabic (Qatar)',
            'ar-EG': 'Arabic (Egypt)',
            'da-DK': 'Danish',
            'fi-FI': 'Finnish',
            'pl-PL': 'Polish',
            'sv-SE': 'Swedish',
            'tr-TR': 'Turkish',
            'af-ZA': 'Afrikaans',
            'nb-NO': 'Norwegian',
            'th-TH': 'Thai',
            'el-GR': 'Greek',
            'hu-HU': 'Hungarian',
            'ro-RO': 'Romanian',
            'sk-SK': 'Slovak',
            'ur-PK': 'Urdu'
        };
        
        return languageNames[code] || code;
    }
});