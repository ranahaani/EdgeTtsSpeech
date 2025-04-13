import os
import asyncio
import logging
import edge_tts
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
    global voices_cache
    
    if voices_cache is None:
        voices_cache = await get_voices()
    
    # Group voices by language
    voice_groups = {}
    for voice in voices_cache:
        language = voice["Locale"]
        if language not in voice_groups:
            voice_groups[language] = []
        
        # Extract just the first name from the friendly name
        full_name = voice["FriendlyName"]
        # Remove anything in parentheses and split by spaces
        cleaned_name = full_name.split('(')[0].strip()
        # Get just the first name (or something close to it)
        first_name = cleaned_name.split()[-1] if 'Microsoft' in cleaned_name else cleaned_name.split()[0]
        
        # Determine avatar color based on gender
        avatar_color = "0ea5e9" if voice["Gender"] == "Female" else "3b82f6" 
        if "Child" in full_name or "Kids" in full_name:
            avatar_color = "8b5cf6"  # Purple for kids/children
            
        # Create avatar URL using DiceBear avatars
        avatar_url = f"https://api.dicebear.com/7.x/micah/svg?seed={voice['ShortName']}&backgroundColor={avatar_color}"
        
        voice_groups[language].append({
            "name": voice["ShortName"],
            "gender": voice["Gender"],
            "display_name": voice["FriendlyName"],
            "short_name": first_name,
            "language": voice["Locale"],
            "avatar_url": avatar_url
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
