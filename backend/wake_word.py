import queue
import time

import numpy as np
import sounddevice as sd
from openwakeword.model import Model


# ==========================================
# SETTINGS
# ==========================================

MICROPHONE = 1
SAMPLE_RATE = 16000

# openWakeWord works best with 80 ms audio chunks.
CHUNK_SIZE = 1280

# Built-in JARVIS wake-word model.
WAKE_WORD = "hey_jarvis"

# Detection threshold.
THRESHOLD = 0.5


# ==========================================
# AUDIO QUEUE
# ==========================================

audio_queue = queue.Queue()


def audio_callback(indata, frames, time_info, status):

    if status:
        print("Audio status:", status)

    audio_queue.put(
        indata[:, 0].copy()
    )


# ==========================================
# LOAD WAKE-WORD MODEL
# ==========================================

print()
print("================================")
print("JARVIS WAKE-WORD ENGINE")
print("================================")
print()

print("Loading wake-word model...")

model = Model(
    wakeword_models=[
        WAKE_WORD
    ],
    inference_framework="onnx"
)

print("Model loaded.")
print()
print('Say "Hey JARVIS"...')
print("Press Ctrl+C to stop.")
print()


# ==========================================
# MICROPHONE
# ==========================================

with sd.InputStream(
    samplerate=SAMPLE_RATE,
    blocksize=CHUNK_SIZE,
    channels=1,
    dtype="int16",
    device=MICROPHONE,
    callback=audio_callback
):

    while True:

        audio = audio_queue.get()

        audio = np.asarray(
            audio,
            dtype=np.int16
        )

        prediction = model.predict(
            audio
        )

        score = prediction.get(
            WAKE_WORD,
            0
        )

        if score >= THRESHOLD:

            print()
            print("================================")
            print("🔥 JARVIS ACTIVATED!")
            print("================================")
            print(
                f"Wake-word score: {score:.3f}"
            )
            print()

            # Prevent repeated detections.
            time.sleep(2)

            model.reset()