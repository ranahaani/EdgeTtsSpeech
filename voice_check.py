import asyncio
import edge_tts

async def get_voice_info():
    voices = await edge_tts.list_voices()
    print('First voice sample:')
    print(voices[0])
    print('\nKeys in voice object:')
    print(list(voices[0].keys()))

if __name__ == "__main__":
    asyncio.run(get_voice_info())