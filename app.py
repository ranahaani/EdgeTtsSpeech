import os
import asyncio
import logging
import edge_tts
import csv
from io import BytesIO
from flask import Flask, render_template, request, send_file, jsonify

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "edge-tts-secret-key")

# Cache for storing the list of voices
voices_cache = None

# Cache for voice metadata from CSV
voice_metadata = {}

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
    
    # GET request - render the template
    return render_template('index.html')


@app.route('/voices', methods=['GET'])
async def voices():
    """API endpoint to get all available voices"""
    global voices_cache, voice_metadata
    
    if voices_cache is None:
        voices_cache = await get_voices()
    
    # Group voices by language
    voice_groups = {}
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
        
        # Determine avatar color based on gender
        avatar_color = "0ea5e9" if gender == "Female" else "3b82f6" 
        if "Child" in voice["FriendlyName"] or "Kids" in voice["FriendlyName"]:
            avatar_color = "8b5cf6"  # Purple for kids/children
            
        # Create avatar URL using DiceBear avatars
        avatar_url = f"https://api.dicebear.com/7.x/micah/svg?seed={voice_id}&backgroundColor={avatar_color}"
        
        voice_groups[language].append({
            "name": voice_id,
            "gender": gender,
            "display_name": voice["FriendlyName"],
            "short_name": short_name,
            "language": language,
            "avatar_url": avatar_url,
            "personalities": personalities
        })
    
    return jsonify(voice_groups)


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
    app.run(host="0.0.0.0", port=5000, debug=True)
