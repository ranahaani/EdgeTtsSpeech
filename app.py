import os
import asyncio
import logging
import edge_tts
import csv
import uuid
import requests
from io import BytesIO
from collections import OrderedDict
from flask import Flask, render_template, request, send_file, jsonify, session, Response
from flask_session import Session
from flask_session_captcha import FlaskSessionCaptcha

# Configure logging
is_production = os.environ.get("FLASK_ENV") == "production"
log_level = logging.INFO if is_production else logging.DEBUG
logging.basicConfig(level=log_level)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "edge-tts-secret-key")

# Session configuration
session_dir = os.environ.get("SESSION_DIR", "flask_session")
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = session_dir
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_KEY_PREFIX'] = 'tts:'

# Ensure session directory exists
os.makedirs(session_dir, exist_ok=True)

# Captcha configuration
app.config['CAPTCHA_ENABLE'] = True
app.config['CAPTCHA_LENGTH'] = 5
app.config['CAPTCHA_WIDTH'] = 200
app.config['CAPTCHA_HEIGHT'] = 80
app.config['CAPTCHA_INCLUDE_ALPHABET'] = True
app.config['CAPTCHA_INCLUDE_NUMERIC'] = True
app.config['CAPTCHA_INCLUDE_PUNCTUATION'] = False
app.config['CAPTCHA_SESSION_KEY'] = 'captcha_image'

# Initialize session and captcha
Session(app)
captcha = FlaskSessionCaptcha(app)

# Cache for storing the list of voices
voices_cache = None

# Cache for voice metadata from CSV
voice_metadata = {}

# Avatar cache directory
AVATAR_CACHE_DIR = os.path.join('static', 'avatars')

# Ensure avatar cache directory exists
os.makedirs(AVATAR_CACHE_DIR, exist_ok=True)

# Read voice data from CSV
def load_voice_metadata():
    global voice_metadata
    try:
        with open('tts-samples.csv', mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                short_name = row['Name']
                voice_id = os.path.basename(row['Sample']).replace('.mp3', '')
                
                voice_metadata[voice_id] = {
                    'short_name': short_name,
                    'gender': row['Gender'],
                    'language': row['Language'],
                    'country': row['Country'],
                    'personalities': row['Personalities']
                }
        logger.info(f"Loaded metadata for {len(voice_metadata)} voices")
    except Exception as e:
        logger.error(f"Error loading voice metadata: {e}")

# Load the voice metadata on startup
load_voice_metadata()


def download_avatar(voice_id, gender):
    """Download avatar SVG from DiceBear API and save locally"""
    try:
        # Determine avatar color based on gender
        avatar_color = "0ea5e9" if gender == "Female" else "3b82f6"
        
        # Create DiceBear URL
        url = f"https://api.dicebear.com/7.x/micah/svg?seed={voice_id}&backgroundColor={avatar_color}"
        
        # Download the SVG
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Save to local file
        avatar_path = os.path.join(AVATAR_CACHE_DIR, f"{voice_id}.svg")
        with open(avatar_path, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        logger.info(f"Downloaded avatar for {voice_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error downloading avatar for {voice_id}: {e}")
        return False


def get_cached_avatar_path(voice_id):
    """Get the local file path for a cached avatar"""
    return os.path.join(AVATAR_CACHE_DIR, f"{voice_id}.svg")


def ensure_avatar_cached(voice_id, gender):
    """Ensure avatar is cached locally, download if not"""
    avatar_path = get_cached_avatar_path(voice_id)
    
    if not os.path.exists(avatar_path):
        return download_avatar(voice_id, gender)
    
    return True


def clear_avatar_cache():
    """Clear all cached avatars"""
    try:
        import shutil
        if os.path.exists(AVATAR_CACHE_DIR):
            shutil.rmtree(AVATAR_CACHE_DIR)
            os.makedirs(AVATAR_CACHE_DIR, exist_ok=True)
            logger.info("Avatar cache cleared")
            return True
    except Exception as e:
        logger.error(f"Error clearing avatar cache: {e}")
        return False


def get_cache_stats():
    """Get statistics about the avatar cache"""
    try:
        if not os.path.exists(AVATAR_CACHE_DIR):
            return {"cached_avatars": 0, "cache_size": "0 MB"}
        
        files = os.listdir(AVATAR_CACHE_DIR)
        cached_count = len([f for f in files if f.endswith('.svg')])
        
        # Calculate total size
        total_size = 0
        for f in files:
            if f.endswith('.svg'):
                total_size += os.path.getsize(os.path.join(AVATAR_CACHE_DIR, f))
        
        size_mb = round(total_size / (1024 * 1024), 2)
        
        return {
            "cached_avatars": cached_count,
            "cache_size": f"{size_mb} MB"
        }
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return {"cached_avatars": 0, "cache_size": "0 MB"}


def should_show_captcha():
    """Determine if captcha should be shown based on request count"""
    if 'request_count' not in session:
        session['request_count'] = 0
    
    # Show captcha after 3 requests
    return session['request_count'] >= 3


def increment_request_count():
    """Increment the session request counter"""
    if 'request_count' not in session:
        session['request_count'] = 0
    session['request_count'] += 1


def reset_request_count():
    """Reset the session request counter after successful captcha validation"""
    session['request_count'] = 0


async def get_voices():
    """Fetch all available voices from edge-tts"""
    try:
        return await edge_tts.list_voices()
    except Exception as e:
        logger.error(f"Error fetching voices: {e}")
        return []


async def text_to_speech(text, voice="en-US-AriaNeural"):
    """Convert text to speech using edge-tts"""
    try:
        communicate = edge_tts.Communicate(text, voice)
        byte_stream = BytesIO()

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                byte_stream.write(chunk["data"])

        byte_stream.seek(0)  # Go to start of BytesIO stream
        return byte_stream
    except Exception as e:
        logger.error(f"Error in text-to-speech conversion: {e}")
        raise e


@app.route('/', methods=['GET', 'POST'])
def index():
    """Render the main page of the application or process TTS request"""
    if request.method == 'POST':
        try:
            text = request.form.get('text', '')
            voice = request.form.get('voice', 'en-US-AriaNeural')
            download = request.form.get('download', 'false')
            
            if not text:
                return jsonify({"error": "Text is required"}), 400
            
            # Check if captcha is required and validate it
            if should_show_captcha():
                if not captcha.validate():
                    return jsonify({
                        "error": "Invalid captcha. Please try again.",
                        "show_captcha": True
                    }), 400
                else:
                    # Reset request count after successful captcha validation
                    reset_request_count()
            
            # Increment request count for this session
            increment_request_count()
            
            # Convert text to speech
            mp3_data = asyncio.run(text_to_speech(text, voice))
            
            # Return audio file - for download or playback
            return send_file(
                mp3_data,
                mimetype="audio/mpeg",
                as_attachment=download.lower() == 'true',
                download_name="speech.mp3"
            )
        except Exception as e:
            logger.error(f"Error processing text-to-speech request: {e}")
            return jsonify({"error": str(e)}), 500
    
    # GET request - render the template with captcha requirement info
    captcha_required = should_show_captcha()
    return render_template('index.html', show_captcha=captcha_required, captcha_required_json=captcha_required)


@app.route('/avatar/<voice_id>')
def serve_avatar(voice_id):
    """Serve cached avatar SVG file"""
    try:
        avatar_path = get_cached_avatar_path(voice_id)
        
        if os.path.exists(avatar_path):
            with open(avatar_path, 'r', encoding='utf-8') as f:
                svg_content = f.read()
            return Response(svg_content, mimetype='image/svg+xml')
        else:
            # Return a simple fallback SVG if avatar not found
            fallback_svg = f'''<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="25" r="25" fill="#6b7280"/>
                <text x="25" y="30" text-anchor="middle" fill="white" font-family="Arial" font-size="16">
                    {voice_id[:2].upper()}
                </text>
            </svg>'''
            return Response(fallback_svg, mimetype='image/svg+xml')
            
    except Exception as e:
        logger.error(f"Error serving avatar for {voice_id}: {e}")
        # Return error fallback
        error_svg = '''<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="25" fill="#ef4444"/>
            <text x="25" y="30" text-anchor="middle" fill="white" font-family="Arial" font-size="12">?</text>
        </svg>'''
        return Response(error_svg, mimetype='image/svg+xml')


@app.route('/cache-stats')
def cache_stats():
    """Get avatar cache statistics"""
    stats = get_cache_stats()
    return jsonify(stats)


@app.route('/voices', methods=['GET'])
async def voices():
    """API endpoint to get all available voices"""
    global voices_cache, voice_metadata
    
    if voices_cache is None:
        voices_cache = await get_voices()
    
    # Group voices by language
    voice_groups = OrderedDict()
    multilingual_voices = []  # Special category for multilingual voices
    
    for voice in voices_cache:
        language = voice["Locale"]
        voice_id = voice["ShortName"]
        
        if language not in voice_groups:
            voice_groups[language] = []
        
        # Check if we have metadata for this voice
        metadata = voice_metadata.get(voice_id, {})
        
        if metadata:
            short_name = metadata.get('short_name', '')
            gender = metadata.get('gender', voice["Gender"])
            personalities = metadata.get('personalities', '')
        else:
            # Fallback to extracting from friendly name
            full_name = voice["FriendlyName"]
            # Remove anything in parentheses and split by spaces
            cleaned_name = full_name.split('(')[0].strip()
            # Get just the first name (or something close to it)
            short_name = cleaned_name.split()[-1] if 'Microsoft' in cleaned_name else cleaned_name.split()[0]
            gender = voice["Gender"]
            personalities = ""
        
        # Format multilingual voices with em dash
        if 'Multilingual' in short_name:
            short_name = short_name.replace('Multilingual', '').strip() + ' – Multilingual'
        
        # Determine avatar color based on gender
        avatar_color = "0ea5e9" if gender == "Female" else "3b82f6" 
        if "Child" in voice["FriendlyName"] or "Kids" in voice["FriendlyName"]:
            avatar_color = "8b5cf6"  # Purple for kids/children
            
        # Ensure avatar is cached locally
        ensure_avatar_cached(voice_id, gender)
        
        # Use local avatar URL instead of DiceBear API
        avatar_url = f"/avatar/{voice_id}"
        
        voice_data = {
            "name": voice_id,
            "gender": gender,
            "display_name": voice["FriendlyName"],
            "short_name": short_name,
            "language": language,
            "avatar_url": avatar_url,
            "personalities": personalities
        }
        
        # Add to regular language group
        voice_groups[language].append(voice_data)
        
        # If it's a multilingual voice, also add to multilingual category
        if 'Multilingual' in voice_id or 'Multilingual' in short_name:
            multilingual_voices.append(voice_data)
    
    # Add multilingual category at the beginning
    if multilingual_voices:
        # Create a new ordered dictionary with multilingual first
        ordered_voice_groups = OrderedDict({"multilingual": multilingual_voices})
        ordered_voice_groups.update(voice_groups)
        voice_groups = ordered_voice_groups
    
    return jsonify(voice_groups)


@app.route('/captcha')
def captcha_image():
    """Generate and serve captcha image"""
    # Get the HTML response from captcha.generate()
    html_response = captcha.generate()
    
    # Extract the base64 image data from the HTML
    import re
    from base64 import b64decode
    
    # Find the base64 image data in the HTML
    match = re.search(r'data:image/png;base64,\s*([A-Za-z0-9+/=]+)', html_response)
    if match:
        base64_data = match.group(1)
        image_data = b64decode(base64_data)
        return Response(image_data, mimetype='image/png')
    
    # Fallback: return the HTML as is (this shouldn't happen)
    return html_response


@app.route('/health')
def health_check():
    """Health check endpoint for Render.com"""
    return jsonify({
        "status": "healthy",
        "service": "speechdaddy",
        "version": "1.0.0"
    }), 200


@app.route('/test_design.html')
def test_design():
    """Serve the test design page"""
    return send_file('test_design.html')


# Helper function to run async routes
def async_route(route_function):
    """Decorator to run async functions in Flask routes"""
    def wrapper(*args, **kwargs):
        return asyncio.run(route_function(*args, **kwargs))
    wrapper.__name__ = route_function.__name__
    return wrapper


# Apply async decorator to routes that need it
app.view_functions['voices'] = async_route(app.view_functions['voices'])

if __name__ == "__main__":
    debug_mode = not is_production
    app.run(host="0.0.0.0", port=5000, debug=debug_mode)
