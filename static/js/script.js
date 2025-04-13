document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const textInput = document.getElementById('text-input');
    const voiceSelect = document.getElementById('voice-select');
    const convertBtn = document.getElementById('convert-btn');
    const downloadBtn = document.getElementById('download-btn');
    const speakerCardsContainer = document.getElementById('speaker-cards');
    const voiceGroupSelect = document.getElementById('voice-group-select');
    const loadingSpinner = document.getElementById('loading-spinner');
    const conversionAlert = document.getElementById('conversion-alert');

    // Variables to store state
    let selectedVoice = '';
    let voices = {};
    let audioBlob = null;

    // Add fade-in animation to the entire body
    document.body.classList.add('fade-in');

    // Animate elements with delay
    setTimeout(() => {
        // Animate hero section
        animateHero();
    }, 100);

    // Fetch voices
    fetchVoices();

    // Event listeners
    convertBtn.addEventListener('click', convertText);
    downloadBtn.addEventListener('click', downloadAudio);
    voiceGroupSelect.addEventListener('change', populateVoiceSelect);
    
    // Add animation on scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Initially trigger scroll animation
    setTimeout(animateOnScroll, 500);
    
    // Function to animate elements on scroll
    function animateOnScroll() {
        const animatedElements = document.querySelectorAll('.card');
        
        animatedElements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Function to animate hero section
    function animateHero() {
        const hero = document.querySelector('.hero');
        hero.classList.add('animate');
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
        
        // Select a few featured languages
        const featuredLanguages = [
            'en-US', 'es-ES', 'fr-FR', 'de-DE', 'hi-IN'
        ];
        
        featuredLanguages.forEach(lang => {
            if (voices[lang] && voices[lang].length > 0) {
                // Pick the first voice of each featured language
                const voice = voices[lang][0];
                
                const card = document.createElement('div');
                card.className = 'col-md-4 mb-4';
                card.innerHTML = `
                    <div class="card h-100 speaker-card" data-voice="${voice.name}">
                        <div class="card-body text-center">
                            <h5 class="card-title">${getLanguageName(lang)}</h5>
                            <p class="card-text">${voice.display_name}</p>
                            <p class="small text-muted">${voice.gender}</p>
                            <button class="btn btn-outline-primary btn-sm select-voice-btn">Select Voice</button>
                        </div>
                    </div>
                `;
                
                speakerCardsContainer.appendChild(card);
            }
        });
        
        // Add event listeners to speaker cards
        document.querySelectorAll('.select-voice-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const card = this.closest('.speaker-card');
                const voiceName = card.dataset.voice;
                
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
                    voiceGroupSelect.value = voiceLanguage;
                    populateVoiceSelect();
                    voiceSelect.value = voiceName;
                    selectedVoice = voiceName;
                }
            });
        });
    }

    // Function to convert text to speech
    function convertText() {
        const text = textInput.value.trim();
        selectedVoice = voiceSelect.value;
        
        if (!text) {
            showAlert('Please enter some text to convert.', 'warning');
            return;
        }
        
        showLoading(true);
        
        // Prepare form data
        const formData = new FormData();
        formData.append('text', text);
        formData.append('voice', selectedVoice);
        
        // Send request to server
        fetch('/convert', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server error: ' + response.statusText);
            }
            return response.blob();
        })
        .then(blob => {
            audioBlob = blob;
            showLoading(false);
            downloadBtn.disabled = false;
            showAlert('Text converted successfully! Click Download to save the audio.', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showLoading(false);
            showAlert('Error converting text to speech. Please try again.', 'danger');
        });
    }

    // Function to download the audio
    function downloadAudio() {
        if (!audioBlob) {
            showAlert('No audio available. Please convert text first.', 'warning');
            return;
        }
        
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'speech.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Helper function to show loading spinner
    function showLoading(show) {
        loadingSpinner.style.display = show ? 'block' : 'none';
    }

    // Helper function to show alerts
    function showAlert(message, type) {
        conversionAlert.textContent = message;
        conversionAlert.className = `alert alert-${type} mt-3`;
        conversionAlert.style.display = 'block';
        
        // Hide alert after 5 seconds
        setTimeout(() => {
            conversionAlert.style.display = 'none';
        }, 5000);
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
