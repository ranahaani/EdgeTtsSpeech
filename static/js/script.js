document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const textInput = document.getElementById('text-input');
    const charCount = document.getElementById('char-count');
    const languageSelect = document.getElementById('language-select');
    const voiceSearch = document.getElementById('voice-search');
    const voiceCardsContainer = document.getElementById('voice-cards-container');
    const featuredVoicesContainer = document.getElementById('featured-voices-container');
    const previewVoicesContainer = document.getElementById('preview-voices-container');
    const audioPlayerContainer = document.getElementById('audio-player-container');
    const audioPlayer = document.getElementById('audio-player');
    const playBtn = document.getElementById('play-btn');
    const downloadBtn = document.getElementById('download-btn');
    const sampleTextBtn = document.getElementById('sample-text-btn');
    const clearBtn = document.getElementById('clear-btn');
    const pasteBtn = document.getElementById('paste-btn');
    const downloadFlag = document.getElementById('download-flag');
    const loadingSpinner = document.getElementById('loading-spinner');
    const conversionAlert = document.getElementById('conversion-alert');
    const durationEstimate = document.getElementById('duration');
    
    // Captcha elements
    const captchaContainer = document.getElementById('captcha-container');
    const captchaInput = document.getElementById('captcha-input');
    const refreshCaptchaBtn = document.getElementById('refresh-captcha');
    
    // Scroll buttons
    const scrollLeftBtn = document.querySelector('.scroll-left');
    const scrollRightBtn = document.querySelector('.scroll-right');
    
    // State
    let allVoices = [];
    let selectedVoice = 'en-US-AriaNeural';
    let languageMap = {};
    let voicesByLanguage = {};
    
    // Language code to name mapping - Enhanced with comprehensive language names
    const languageCodeMap = {
        'af': 'Afrikaans',
        'am': 'Amharic',
        'ar': 'Arabic',
        'az': 'Azerbaijani',
        'bg': 'Bulgarian',
        'bn': 'Bengali',
        'bs': 'Bosnian',
        'ca': 'Catalan',
        'cs': 'Czech',
        'cy': 'Welsh',
        'da': 'Danish',
        'de': 'German',
        'el': 'Greek',
        'en': 'English',
        'es': 'Spanish',
        'et': 'Estonian',
        'eu': 'Basque',
        'fa': 'Persian',
        'fi': 'Finnish',
        'fil': 'Filipino',
        'fr': 'French',
        'ga': 'Irish',
        'gl': 'Galician',
        'gu': 'Gujarati',
        'he': 'Hebrew',
        'hi': 'Hindi',
        'hr': 'Croatian',
        'hu': 'Hungarian',
        'hy': 'Armenian',
        'id': 'Indonesian',
        'is': 'Icelandic',
        'it': 'Italian',
        'ja': 'Japanese',
        'jv': 'Javanese',
        'ka': 'Georgian',
        'kk': 'Kazakh',
        'km': 'Khmer',
        'kn': 'Kannada',
        'ko': 'Korean',
        'lo': 'Lao',
        'lt': 'Lithuanian',
        'lv': 'Latvian',
        'mk': 'Macedonian',
        'ml': 'Malayalam',
        'mn': 'Mongolian',
        'mr': 'Marathi',
        'ms': 'Malay',
        'mt': 'Maltese',
        'my': 'Burmese',
        'nb': 'Norwegian',
        'ne': 'Nepali',
        'nl': 'Dutch',
        'nn': 'Norwegian Nynorsk',
        'no': 'Norwegian',
        'pa': 'Punjabi',
        'pl': 'Polish',
        'ps': 'Pashto',
        'pt': 'Portuguese',
        'ro': 'Romanian',
        'ru': 'Russian',
        'si': 'Sinhala',
        'sk': 'Slovak',
        'sl': 'Slovenian',
        'so': 'Somali',
        'sq': 'Albanian',
        'sr': 'Serbian',
        'su': 'Sundanese',
        'sv': 'Swedish',
        'sw': 'Swahili',
        'ta': 'Tamil',
        'te': 'Telugu',
        'th': 'Thai',
        'tr': 'Turkish',
        'uk': 'Ukrainian',
        'ur': 'Urdu',
        'uz': 'Uzbek',
        'vi': 'Vietnamese',
        'zh': 'Chinese'
    };

    // Get language name from locale code
    function getLanguageName(locale) {
        if (!locale) return 'Unknown';
        
        // Handle both full locale codes (en-US) and base language codes (en)
        const langCode = locale.split('-')[0].toLowerCase();
        return languageCodeMap[langCode] || locale;
    }
    
    // Simplify voice name (e.g., "Microsoft David Online (Natural) - English (United States)" -> "David")
    function simplifyVoiceName(friendlyName) {
        // Extract just the name part
        let name = friendlyName;
        
        if (friendlyName.includes('Microsoft')) {
            // Remove "Microsoft" and anything after hyphen
            name = friendlyName.replace('Microsoft ', '').split(' - ')[0];
            
            // Remove "Online (Natural)" or similar suffixes
            name = name.replace(' Online', '').replace(/\s*\([^)]*\)/g, '');
        }
        
        // For multilingual voices, handle differently
        if (name.includes('Multilingual')) {
            // Handle both "RemyMultilingual" and "Remy Multilingual" patterns
            name = name.replace(/Multilingual/g, '').trim();
            name = name + ' – Multilingual';
        }
        
        return name;
    }
    
    // Generate avatar URL for voice
    function getAvatarUrl(voiceId, gender) {
        const backgroundColor = gender === 'Female' ? '0ea5e9' : '3b82f6';
        return `https://api.dicebear.com/7.x/micah/svg?seed=${voiceId}&backgroundColor=${backgroundColor}`;
    }

    // Setup event listeners
    function setupEventListeners() {
        // Character counter
        textInput.addEventListener('input', function() {
            updateCharCount();
            updateDurationEstimate();
        });
        
        // Clear text button
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                textInput.value = '';
                updateCharCount();
                updateDurationEstimate();
            });
        }
        
        // Paste button
        if (pasteBtn) {
            pasteBtn.addEventListener('click', async function() {
                try {
                    const text = await navigator.clipboard.readText();
                    textInput.value = text;
                    updateCharCount();
                    updateDurationEstimate();
                } catch (err) {
                    console.error('Failed to read clipboard contents: ', err);
                }
            });
        }
        
        // Language filter
        languageSelect.addEventListener('change', function() {
            filterVoicesByLanguage(this.value);
        });
        
        // Voice search
        voiceSearch.addEventListener('input', function() {
            filterVoicesBySearch(this.value);
        });
        
        // Play button
        playBtn.addEventListener('click', function() {
            convertTextToSpeech(false);
        });
        
        // Download button
        downloadBtn.addEventListener('click', function() {
            convertTextToSpeech(true);
        });
        
        // Sample text button
        sampleTextBtn.addEventListener('click', function() {
            textInput.value = getSampleText();
            updateCharCount();
            updateDurationEstimate();
        });
        
        // Scroll buttons
        if (scrollLeftBtn) {
            scrollLeftBtn.addEventListener('click', function() {
                voiceCardsContainer.scrollBy({ left: -600, behavior: 'smooth' });
            });
        }
        
        if (scrollRightBtn) {
            scrollRightBtn.addEventListener('click', function() {
                voiceCardsContainer.scrollBy({ left: 600, behavior: 'smooth' });
            });
        }
        
        // Captcha refresh button
        if (refreshCaptchaBtn) {
            refreshCaptchaBtn.addEventListener('click', function() {
                refreshCaptcha();
            });
        }
        
        // Custom Audio Player Controls
        setupAudioPlayerControls();
    }
    
    // Setup custom audio player controls
    function setupAudioPlayerControls() {
        const audioPlayer = document.getElementById('audio-player');
        const playPauseBtn = document.getElementById('audio-play-pause');
        const playPauseIcon = document.getElementById('play-pause-icon');
        const progressBar = document.getElementById('progress-bar');
        const progressFill = document.getElementById('progress-fill');
        const currentTimeSpan = document.getElementById('current-time');
        const totalTimeSpan = document.getElementById('total-time');
        const volumeSlider = document.getElementById('volume-slider');
        
        if (!audioPlayer || !playPauseBtn) return;
        
        // Play/Pause functionality
        playPauseBtn.addEventListener('click', function() {
            if (audioPlayer.paused) {
                audioPlayer.play();
            } else {
                audioPlayer.pause();
            }
        });
        
        // Update play/pause icon
        audioPlayer.addEventListener('play', function() {
            playPauseIcon.setAttribute('data-lucide', 'pause');
            if (window.lucide) window.lucide.createIcons();
        });
        
        audioPlayer.addEventListener('pause', function() {
            playPauseIcon.setAttribute('data-lucide', 'play');
            if (window.lucide) window.lucide.createIcons();
        });
        
        // Progress bar functionality
        audioPlayer.addEventListener('timeupdate', function() {
            if (audioPlayer.duration) {
                const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                progressFill.style.width = progress + '%';
                
                currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
                totalTimeSpan.textContent = formatTime(audioPlayer.duration);
            }
        });
        
        // Click to seek
        progressBar.addEventListener('click', function(e) {
            if (audioPlayer.duration) {
                const rect = progressBar.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                const seekTime = (clickX / width) * audioPlayer.duration;
                audioPlayer.currentTime = seekTime;
            }
        });
        
        // Volume control
        volumeSlider.addEventListener('input', function() {
            audioPlayer.volume = this.value / 100;
        });
        
        // Reset when audio ends
        audioPlayer.addEventListener('ended', function() {
            progressFill.style.width = '0%';
            currentTimeSpan.textContent = '0:00';
            playPauseIcon.setAttribute('data-lucide', 'play');
            if (window.lucide) window.lucide.createIcons();
        });
    }
    
    // Format time in MM:SS format
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // Update character count
    function updateCharCount() {
        const count = textInput.value.length;
        charCount.textContent = `${count}/5000 characters`;
    }
    
    // Update duration estimate (rough calculation)
    function updateDurationEstimate() {
        const wordCount = textInput.value.split(/\s+/).filter(Boolean).length;
        const seconds = Math.round(wordCount / 3); // Average 3 words per second
        durationEstimate.textContent = `Estimated duration: ${seconds}s`;
    }
    
    // Filter voices by language
    function filterVoicesByLanguage(language) {
        const languageHeaders = voiceCardsContainer.querySelectorAll('.language-header');
        const rows = voiceCardsContainer.querySelectorAll('.voice-cards-row');
        
        // Special handling for multilingual category
        if (language === 'multilingual') {
            languageHeaders.forEach((header, index) => {
                const headerLangCode = Object.keys(voicesByLanguage).sort()[index];
                const shouldShow = headerLangCode === 'multilingual';
                header.style.display = shouldShow ? 'block' : 'none';
            });
            
            rows.forEach((row, index) => {
                // Only show rows that belong to multilingual category
                const isMultilingualRow = row.querySelector('.voice-selection-card[data-name*="Multilingual"]');
                row.style.display = isMultilingualRow ? 'grid' : 'none';
            });
            return;
        }
        
        languageHeaders.forEach((header, index) => {
            const headerLangCode = Object.keys(voicesByLanguage).sort()[index];
            const shouldShow = language === 'all' || headerLangCode === language;
            
            header.style.display = shouldShow ? 'block' : 'none';
            
            // Find all rows for this language and show/hide them
            let rowIndex = 0;
            for (let i = 0; i <= index; i++) {
                if (i < index) {
                    const prevLangVoices = voicesByLanguage[Object.keys(voicesByLanguage).sort()[i]];
                    rowIndex += Math.ceil(prevLangVoices.length / 6);
                }
            }
            
            const currentLangVoices = voicesByLanguage[headerLangCode];
            const numRows = Math.ceil(currentLangVoices.length / 6);
            
            for (let i = 0; i < numRows; i++) {
                if (rows[rowIndex + i]) {
                    rows[rowIndex + i].style.display = shouldShow ? 'grid' : 'none';
                }
            }
        });
    }
    
    // Filter voices by search term
    function filterVoicesBySearch(searchTerm) {
        const cards = voiceCardsContainer.querySelectorAll('.voice-selection-card');
        const rows = voiceCardsContainer.querySelectorAll('.voice-cards-row');
        const languageHeaders = voiceCardsContainer.querySelectorAll('.language-header');
        
        searchTerm = searchTerm.toLowerCase();
        
        // If no search term, show all
        if (!searchTerm.trim()) {
            cards.forEach(card => card.style.display = 'block');
            rows.forEach(row => row.style.display = 'grid');
            languageHeaders.forEach(header => header.style.display = 'block');
            return;
        }
        
        // Track which rows have visible cards
        const visibleRows = new Set();
        const visibleLanguages = new Set();
        
        cards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            const language = getLanguageName(card.dataset.language).toLowerCase();
            const langCode = card.dataset.language.split('-')[0];
            
            if (name.includes(searchTerm) || language.includes(searchTerm)) {
                card.style.display = 'block';
                visibleRows.add(card.closest('.voice-cards-row'));
                visibleLanguages.add(langCode);
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show/hide rows based on whether they have visible cards
        rows.forEach(row => {
            const hasVisibleCards = Array.from(row.querySelectorAll('.voice-selection-card'))
                .some(card => card.style.display !== 'none');
            row.style.display = hasVisibleCards ? 'grid' : 'none';
        });
        
        // Show/hide language headers based on whether they have visible cards
        languageHeaders.forEach((header, index) => {
            const headerLangCode = Object.keys(voicesByLanguage).sort()[index];
            header.style.display = visibleLanguages.has(headerLangCode) ? 'block' : 'none';
        });
    }
    
    // Fetch all available voices
    async function fetchVoices() {
        try {
            showLoading(true);
            
            const response = await fetch('/voices');
            const voiceGroups = await response.json();
            
            // Process voices
            allVoices = [];
            let featuredVoices = [];
            
            // Populate language select with deduplication
            languageSelect.innerHTML = '';
            
            // Add Multilingual as the first option and set as default
            const multilingualOption = document.createElement('option');
            multilingualOption.value = 'multilingual';
            multilingualOption.textContent = 'Multilingual';
            multilingualOption.selected = true;
            languageSelect.appendChild(multilingualOption);
            
            // Add All Languages option
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Languages';
            languageSelect.appendChild(allOption);
            
            // Use Set to collect unique base language codes
            const uniqueLanguages = new Set();
            
            Object.keys(voiceGroups).forEach(language => {
                const voices = voiceGroups[language];
                
                // Skip the multilingual category for regular language processing
                if (language === 'multilingual') {
                    return;
                }
                
                allVoices = [...allVoices, ...voices];
                
                // Get base language code (e.g., 'en' from 'en-US')
                const baseLangCode = language.split('-')[0];
                uniqueLanguages.add(baseLangCode);
                
                // Add some interesting voices to featured
                if (featuredVoices.length < 12 && voices.length > 0) {
                    // Get a random voice from this language
                    const randomVoice = voices[Math.floor(Math.random() * voices.length)];
                    featuredVoices.push(randomVoice);
                }
            });
            
            // Add multilingual voices to allVoices if they exist
            if (voiceGroups.multilingual) {
                allVoices = [...voiceGroups.multilingual, ...allVoices];
            }
            
            // Sort languages alphabetically and add to select
            const sortedLanguages = Array.from(uniqueLanguages).sort();
            sortedLanguages.forEach(langCode => {
                const langName = getLanguageName(langCode);
                const option = document.createElement('option');
                option.value = langCode;
                option.textContent = langName;
                languageSelect.appendChild(option);
            });
            
            // Select a few voices for preview
            const previewVoices = allVoices
                .filter(voice => voice.language.startsWith('en')) // English voices
                .sort(() => 0.5 - Math.random()) // Shuffle
                .slice(0, 4); // Take first 4
            
            renderVoiceCards(voiceGroups);
            renderFeaturedVoices(featuredVoices);
            renderPreviewVoices(previewVoices);
            
            // Set default filter to multilingual
            filterVoicesByLanguage('multilingual');
            
            showLoading(false);
        } catch (error) {
            console.error('Error fetching voices:', error);
            showError('Failed to load voices. Please refresh the page and try again.');
            showLoading(false);
        }
    }
    
    // Render voice cards in the selection container
    function renderVoiceCards(voiceGroups) {
        voiceCardsContainer.innerHTML = '';
        
        // Reset voicesByLanguage for filtering
        voicesByLanguage = {};
        
        // Handle multilingual category first if it exists
        if (voiceGroups.multilingual) {
            voicesByLanguage['multilingual'] = voiceGroups.multilingual;
            
            // Create multilingual header
            const multilingualHeader = document.createElement('div');
            multilingualHeader.className = 'language-header';
            multilingualHeader.innerHTML = `
                <h3 class="text-sm font-semibold text-gray-700 mb-2 px-2">Multilingual (${voiceGroups.multilingual.length})</h3>
            `;
            voiceCardsContainer.appendChild(multilingualHeader);
            
            // Create rows for multilingual voices
            const cardsPerRow = 6;
            for (let i = 0; i < voiceGroups.multilingual.length; i += cardsPerRow) {
                const rowVoices = voiceGroups.multilingual.slice(i, i + cardsPerRow);
                
                const row = document.createElement('div');
                row.className = 'voice-cards-row';
                
                rowVoices.forEach((voice, index) => {
                    const card = createVoiceCard(voice, i + index);
                    row.appendChild(card);
                });
                
                voiceCardsContainer.appendChild(row);
            }
        }
        
        // Group other voices by language
        Object.keys(voiceGroups).forEach(language => {
            if (language === 'multilingual') return; // Skip, already handled
            
            const voices = voiceGroups[language];
            const langCode = language.split('-')[0];
            
            if (!voicesByLanguage[langCode]) {
                voicesByLanguage[langCode] = [];
            }
            voicesByLanguage[langCode] = [...voicesByLanguage[langCode], ...voices];
        });
        
        // Create rows for each regular language group
        Object.keys(voicesByLanguage).sort().forEach(langCode => {
            if (langCode === 'multilingual') return; // Skip, already handled
            
            const languageVoices = voicesByLanguage[langCode];
            const languageName = getLanguageName(langCode);
            
            // Create language header
            const languageHeader = document.createElement('div');
            languageHeader.className = 'language-header';
            languageHeader.innerHTML = `
                <h3 class="text-sm font-semibold text-gray-700 mb-2 px-2">${languageName} (${languageVoices.length})</h3>
            `;
            voiceCardsContainer.appendChild(languageHeader);
            
            // Split voices into rows of 6 cards each
            const cardsPerRow = 6;
            for (let i = 0; i < languageVoices.length; i += cardsPerRow) {
                const rowVoices = languageVoices.slice(i, i + cardsPerRow);
                
                // Create row container
                const row = document.createElement('div');
                row.className = 'voice-cards-row';
                
                // Add voices to this row
                rowVoices.forEach((voice, index) => {
                    const card = createVoiceCard(voice, i + index);
                    row.appendChild(card);
                });
                
                voiceCardsContainer.appendChild(row);
            }
        });
    }
    
    // Create individual voice card
    function createVoiceCard(voice, globalIndex) {
        // Simplify voice name
        const simpleName = voice.short_name || simplifyVoiceName(voice.display_name);
        const languageName = getLanguageName(voice.language);
        
        const card = document.createElement('div');
        card.className = 'voice-selection-card';
        card.dataset.voiceId = voice.name;
        card.dataset.name = simpleName;
        card.dataset.language = voice.language;
        card.dataset.gender = voice.gender;
        
        // Add staggered animation delay
        card.style.animationDelay = `${Math.min(globalIndex * 0.02, 1)}s`;
        
        // Select this card if it matches the default voice
        if (voice.name === selectedVoice) {
            card.classList.add('selected');
        }
        
        // Create personality tags with limit of 2 for compact design
        const personalityTags = voice.personalities ? 
            voice.personalities.split(',').slice(0, 2).map(trait => 
                `<span class="personality-tag">${trait.trim()}</span>`
            ).join('') : 
            `<span class="personality-tag">${voice.gender}</span>`;
        
        card.innerHTML = `
            <div class="avatar">
                <img src="${voice.avatar_url}" alt="${simpleName}" loading="lazy">
            </div>
            <h4>${simpleName}</h4>
            <p>${languageName}</p>
            <div class="voice-personalities">
                ${personalityTags}
            </div>
        `;
        
        card.addEventListener('click', function() {
            // Deselect all cards
            document.querySelectorAll('.voice-selection-card').forEach(c => c.classList.remove('selected'));
            
            // Select this card with smooth transition
            this.classList.add('selected');
            
            // Set selected voice
            selectedVoice = this.dataset.voiceId;
            
            // Optional: Scroll card into view if needed
            this.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        
        return card;
    }
    
    // Render featured voices in the gallery section
    function renderFeaturedVoices(voices) {
        if (!featuredVoicesContainer) return;
        
        featuredVoicesContainer.innerHTML = '';
        
        voices.forEach(voice => {
            // Simplify voice name
            const simpleName = voice.short_name || simplifyVoiceName(voice.display_name);
            const languageName = getLanguageName(voice.language);
            
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-lg shadow transition-all duration-300 hover:shadow-md';
            
            card.innerHTML = `
                <div class="flex items-center space-x-3 mb-4">
                    <img src="${voice.avatar_url}" alt="${simpleName}" class="w-12 h-12 rounded-full">
                    <div>
                        <h3 class="text-xl font-medium">${simpleName}</h3>
                        <p class="text-sm text-gray-500">${languageName}</p>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mb-4">
                    ${voice.personalities ? 
                        voice.personalities.split(',').map(trait => 
                            `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${trait.trim()}</span>`
                        ).join('') : 
                        '<span class="text-xs bg-gray-100 px-2 py-1 rounded">' + voice.gender + '</span>'
                    }
                </div>
                <button class="play-sample w-full text-center py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" data-voice="${voice.name}">
                    <i data-lucide="play" class="w-4 h-4 inline-block mr-2"></i>
                    Listen to Sample
                </button>
            `;
            
            featuredVoicesContainer.appendChild(card);
        });
        
        // Initialize Lucide icons for the newly added elements
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Add event listeners to play sample buttons
        document.querySelectorAll('.play-sample').forEach(button => {
            button.addEventListener('click', function() {
                const voiceId = this.dataset.voice;
                const sampleText = 'Hello, I am a text-to-speech voice. How do I sound to you?';
                
                convertTextToSpeechWithVoice(sampleText, voiceId, false);
            });
        });
    }
    
    // Render preview voices in the hero section
    function renderPreviewVoices(voices) {
        if (!previewVoicesContainer) return;
        
        previewVoicesContainer.innerHTML = '';
        
        voices.forEach((voice, index) => {
            // Simplify voice name
            const simpleName = voice.short_name || simplifyVoiceName(voice.display_name);
            const languageName = getLanguageName(voice.language);
            
            const card = document.createElement('div');
            card.className = 'voice-preview-card bg-white rounded-lg p-4 shadow-lg transform transition-all duration-500 hover:scale-105';
            
            card.innerHTML = `
                <div class="flex items-center space-x-3">
                    <img src="${voice.avatar_url}" alt="${simpleName}" class="w-12 h-12 rounded-full">
                    <div>
                        <h3 class="font-medium">${simpleName}</h3>
                        <p class="text-sm text-gray-500">${languageName}</p>
                    </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                    ${voice.personalities ? 
                        voice.personalities.split(',').slice(0, 2).map(trait => 
                            `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${trait.trim()}</span>`
                        ).join('') : 
                        '<span class="text-xs bg-gray-100 px-2 py-1 rounded">' + voice.gender + '</span>'
                    }
                </div>
            `;
            
            previewVoicesContainer.appendChild(card);
        });
    }
    
    // Refresh captcha image
    function refreshCaptcha() {
        // Find the captcha image and reload it by changing its src
        const captchaImg = document.getElementById('captcha-image');
        if (captchaImg) {
            captchaImg.src = '/captcha?t=' + Date.now();
        }
        
        // Clear the captcha input
        if (captchaInput) {
            captchaInput.value = '';
        }
    }
    
    // Show/hide captcha container
    function showCaptcha(show) {
        if (captchaContainer) {
            captchaContainer.style.display = show ? 'block' : 'none';
        }
    }
    
    // Convert text to speech
    async function convertTextToSpeech(download) {
        const text = textInput.value.trim();
        
        if (!text) {
            showError('Please enter some text to convert');
            return;
        }
        
        try {
            showLoading(true);
            downloadFlag.value = download;
            
            // Create form data
            const formData = new FormData();
            formData.append('text', text);
            formData.append('voice', selectedVoice);
            formData.append('download', download);
            
            // Add captcha if visible
            if (captchaContainer && captchaContainer.style.display !== 'none' && captchaInput) {
                formData.append('captcha', captchaInput.value);
            }
            
            // Send request
            const response = await fetch('/', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                // Try to parse error response
                const errorData = await response.json().catch(() => null);
                
                if (errorData && errorData.show_captcha) {
                    // Show captcha if required
                    showCaptcha(true);
                    refreshCaptcha();
                    showCaptchaError(errorData.error || 'Captcha verification required. Please enter the characters shown in the image.');
                } else {
                    throw new Error(errorData?.error || 'Conversion failed');
                }
                
                showLoading(false);
                return;
            }
            
            // Get the audio blob
            const blob = await response.blob();
            
            if (download) {
                // Download the file
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'speech.mp3';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showSuccess('Audio downloaded successfully');
            } else {
                // Play the audio
                const url = URL.createObjectURL(blob);
                audioPlayer.src = url;
                audioPlayerContainer.style.display = 'block';
                audioPlayer.play();
                
                showSuccess('Audio generated successfully');
            }
            
            // Clear captcha input after successful conversion
            if (captchaInput) {
                captchaInput.value = '';
            }
            
            showLoading(false);
        } catch (error) {
            console.error('Error converting text to speech:', error);
            showError('Failed to convert text to speech. Please try again.');
            showLoading(false);
        }
    }
    
    // Convert with specific voice (for samples)
    async function convertTextToSpeechWithVoice(text, voice, download) {
        if (!text) return;
        
        try {
            showLoading(true);
            
            // Create form data
            const formData = new FormData();
            formData.append('text', text);
            formData.append('voice', voice);
            formData.append('download', download);
            
            // Add captcha if visible
            if (captchaContainer && captchaContainer.style.display !== 'none' && captchaInput) {
                formData.append('captcha', captchaInput.value);
            }
            
            // Send request
            const response = await fetch('/', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                // Try to parse error response
                const errorData = await response.json().catch(() => null);
                
                if (errorData && errorData.show_captcha) {
                    // Show captcha if required
                    showCaptcha(true);
                    refreshCaptcha();
                    showCaptchaError(errorData.error || 'Captcha verification required. Please enter the characters shown in the image.');
                } else {
                    throw new Error(errorData?.error || 'Conversion failed');
                }
                
                showLoading(false);
                return;
            }
            
            // Get the audio blob
            const blob = await response.blob();
            
            if (download) {
                // Download the file
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'speech.mp3';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // Play the audio
                const url = URL.createObjectURL(blob);
                audioPlayer.src = url;
                audioPlayerContainer.style.display = 'block';
                audioPlayer.play();
            }
            
            // Clear captcha input after successful conversion
            if (captchaInput) {
                captchaInput.value = '';
            }
            
            showLoading(false);
        } catch (error) {
            console.error('Error playing sample:', error);
            showError('Failed to play sample. Please try again.');
            showLoading(false);
        }
    }
    
    // Get a sample text based on the selected language
    function getSampleText() {
        const language = selectedVoice.split('-')[0];
        
        const samples = {
            'en': 'Welcome to Speech Daddy! This is a sample text to demonstrate our text-to-speech capabilities. Our voices sound natural and expressive.',
            'es': '¡Bienvenido a Speech Daddy! Este es un texto de muestra para demostrar nuestras capacidades de texto a voz. Nuestras voces suenan naturales y expresivas.',
            'fr': 'Bienvenue à Speech Daddy! Ceci est un exemple de texte pour démontrer nos capacités de synthèse vocale. Nos voix sonnent naturelles et expressives.',
            'de': 'Willkommen bei Speech Daddy! Dies ist ein Beispieltext, um unsere Text-to-Speech-Fähigkeiten zu demonstrieren. Unsere Stimmen klingen natürlich und ausdrucksstark.',
            'it': 'Benvenuto a Speech Daddy! Questo è un testo di esempio per dimostrare le nostre capacità di text-to-speech. Le nostre voci suonano naturali ed espressive.',
            'pt': 'Bem-vindo ao Speech Daddy! Este é um texto de exemplo para demonstrar nossas capacidades de texto para fala. Nossas vozes soam naturais e expressivas.',
            'default': 'Hello, this is a text-to-speech sample from Speech Daddy. Our voices support multiple languages and sound natural.'
        };
        
        return samples[language] || samples['default'];
    }
    
    // Show/hide loading spinner
    function showLoading(show) {
        if (show) {
            loadingSpinner.classList.remove('hidden');
            playBtn.disabled = true;
            downloadBtn.disabled = true;
        } else {
            loadingSpinner.classList.add('hidden');
            playBtn.disabled = false;
            downloadBtn.disabled = false;
        }
    }
    
    // Show success message
    function showSuccess(message) {
        conversionAlert.textContent = message;
        conversionAlert.className = 'status-alert success';
        conversionAlert.classList.remove('hidden');
        
        // Hide after 5 seconds
        setTimeout(() => {
            conversionAlert.classList.add('hidden');
        }, 5000);
    }
    
    // Show error message
    function showError(message) {
        conversionAlert.textContent = message;
        conversionAlert.className = 'status-alert error';
        conversionAlert.classList.remove('hidden');
        
        // Hide after 5 seconds
        setTimeout(() => {
            conversionAlert.classList.add('hidden');
        }, 5000);
    }
    
    // Show captcha error message
    function showCaptchaError(message) {
        conversionAlert.textContent = message;
        conversionAlert.className = 'status-alert error captcha-error';
        conversionAlert.classList.remove('hidden');
        
        // Highlight captcha input
        if (captchaInput) {
            captchaInput.style.borderColor = '#ef4444';
            captchaInput.focus();
        }
        
        // Hide after 7 seconds (longer for captcha errors)
        setTimeout(() => {
            conversionAlert.classList.add('hidden');
            if (captchaInput) {
                captchaInput.style.borderColor = '';
            }
        }, 7000);
    }
    
    // Initialize
    function init() {
        setupEventListeners();
        fetchVoices();
        updateCharCount();
        updateDurationEstimate();
        
        // Check if captcha should be shown on page load
        if (window.captchaRequired) {
            showCaptcha(true);
        }
    }
    
    // Start app
    init();
});