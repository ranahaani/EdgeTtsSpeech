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


@app.route('/')
def index():
    """Render the main page of the application"""
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
        voice_groups[language].append({
            "name": voice["ShortName"],
            "gender": voice["Gender"],
            "display_name": voice["DisplayName"],
            "language": voice["Locale"]
        })
    
    return jsonify(voice_groups)


@app.route('/convert', methods=['POST'])
async def convert():
    """API endpoint to convert text to speech"""
    try:
        text = request.form.get('text', '')
        voice = request.form.get('voice', 'en-US-ChristopherNeural')
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Create a BytesIO object to store the audio data
        audio_data = BytesIO()
        
        # Initialize edge-tts
        communicate = edge_tts.Communicate(text, voice)
        
        # Write audio data to the BytesIO object
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
        
        # Reset the position to the start of the BytesIO object
        audio_data.seek(0)
        
        # Send the audio file directly to the user
        return send_file(
            audio_data,
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name="speech.mp3"
        )
    
    except Exception as e:
        logger.error(f"Error in text-to-speech conversion: {e}")
        return jsonify({"error": str(e)}), 500


# Helper function to run async routes
def async_route(route_function):
    """Decorator to run async functions in Flask routes"""
    def wrapper(*args, **kwargs):
        return asyncio.run(route_function(*args, **kwargs))
    wrapper.__name__ = route_function.__name__
    return wrapper


# Apply async decorator to routes that need it
app.view_functions['voices'] = async_route(app.view_functions['voices'])
app.view_functions['convert'] = async_route(app.view_functions['convert'])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
