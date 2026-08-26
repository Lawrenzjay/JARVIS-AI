import queue
import time
import uuid

import numpy as np
import requests
import sounddevice as sd
import speech_recognition as sr
import pyttsx3

from openwakeword.model import Model


# ==========================================
# SETTINGS
# ==========================================

MICROPHONE = 1

SAMPLE_RATE = 16000

CHUNK_SIZE = 1280

WAKE_WORD = "hey_jarvis"

WAKE_THRESHOLD = 0.5

FLASK_URL = "http://127.0.0.1:5000/chat"


# ==========================================
# VOICE DETECTION SETTINGS
# ==========================================

VOICE_THRESHOLD = 500

# How much silence ends a command.
# Lower = faster response.
SILENCE_DURATION = 0.8

# How long JARVIS waits for you to start speaking.
START_TIMEOUT = 3

# Maximum length of one command.
MAX_COMMAND_DURATION = 8


# ==========================================
# WAKE WORD PROTECTION
# ==========================================

# Prevent JARVIS from immediately hearing
# its own voice after speaking.
WAKE_COOLDOWN = 2.0


# ==========================================
# STOP COMMANDS
# ==========================================

STOP_COMMANDS = [
    "stop jarvis",
    "shutdown jarvis",
    "shut down jarvis",
    "go to sleep",
    "sleep jarvis",
    "goodbye jarvis",
    "goodbye",
    "that's all",
    "thats all",
    "done jarvis",
    "done",
]


# ==========================================
# CONVERSATION
# ==========================================

CONVERSATION_ID = str(uuid.uuid4())


# ==========================================
# TEXT TO SPEECH
# ==========================================

engine = pyttsx3.init()

engine.setProperty(
    "rate",
    175
)

engine.setProperty(
    "volume",
    1.0
)


def speak(text):

    print()
    print("JARVIS:")
    print(text)
    print()

    engine.say(text)
    engine.runAndWait()

    # Give the microphone time to settle after
    # JARVIS finishes speaking.
    time.sleep(WAKE_COOLDOWN)


# ==========================================
# SPEECH RECOGNITION
# ==========================================

recognizer = sr.Recognizer()


def listen_for_command():

    print()
    print("🎤 Listening...")
    print("Speak now.")
    print()

    recorded_audio = []

    speaking = False

    silence_start = None

    start_time = time.time()

    try:

        # ==================================
        # OPEN MICROPHONE
        # ==================================

        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="int16",
            device=MICROPHONE
        ) as stream:

            while True:

                # ==================================
                # READ AUDIO
                # ==================================

                audio, overflowed = stream.read(1024)

                audio = audio[:, 0].copy()

                recorded_audio.append(audio)

                # ==================================
                # CALCULATE VOLUME
                # ==================================

                volume = np.max(
                    np.abs(audio)
                )

                # ==================================
                # SPEECH DETECTED
                # ==================================

                if volume >= VOICE_THRESHOLD:

                    if not speaking:

                        speaking = True

                        print(
                            "🎤 Speech detected..."
                        )

                    silence_start = None

                # ==================================
                # SILENCE DETECTED
                # ==================================

                else:

                    if speaking:

                        if silence_start is None:

                            silence_start = time.time()

                        else:

                            silence_time = (
                                time.time()
                                - silence_start
                            )

                            if silence_time >= SILENCE_DURATION:

                                print(
                                    "🔇 Speech finished."
                                )

                                break

                

                if not speaking:

                    if (
                        time.time()
                        - start_time
                        >= START_TIMEOUT
                    ):

                        print(
                            "No command detected."
                        )

                        return None

                # ==================================
                # MAXIMUM COMMAND DURATION
                # ==================================

                if (
                    time.time()
                    - start_time
                    >= MAX_COMMAND_DURATION
                ):

                    print(
                        "Maximum command duration reached."
                    )

                    break

        # ==================================
        # NOTHING RECORDED
        # ==================================

        if not speaking:

            return None

        # ==================================
        # COMBINE AUDIO
        # ==================================

        audio_data = np.concatenate(
            recorded_audio
        )

        # ==================================
        # CONVERT AUDIO TO BYTES
        # ==================================

        audio_bytes = audio_data.tobytes()

        recognition_audio = sr.AudioData(
            audio_bytes,
            SAMPLE_RATE,
            2
        )

        # ==================================
        # SPEECH → TEXT
        # ==================================

        print(
            "Processing speech..."
        )

        text = recognizer.recognize_google(
            recognition_audio
        )

        print()
        print(
            f"You: {text}"
        )
        print()

        return text

    except sr.UnknownValueError:

        print(
            "I couldn't understand that."
        )

        return None

    except sr.RequestError as error:

        print(
            "Speech recognition error:",
            error
        )

        return None

    except Exception as error:

        print(
            "Microphone error:",
            error
        )

        return None


# ==========================================
# CHECK STOP COMMAND
# ==========================================

def is_stop_command(command):

    command = command.lower().strip()

    for stop_command in STOP_COMMANDS:

        if command == stop_command:

            return True

        if (
            stop_command in command
            and len(command) <= len(stop_command) + 10
        ):

            return True

    return False


# ==========================================
# SEND MESSAGE TO FLASK / GEMINI
# ==========================================

def ask_jarvis(message):

    try:

        response = requests.post(

            FLASK_URL,

            json={
                "message": message,
                "conversation_id": CONVERSATION_ID
            },

            timeout=60
        )

        data = response.json()

        if not response.ok:

            print()
            print(
                "Server error:",
                data
            )

            return None

        return data.get(
            "response"
        )

    except requests.exceptions.ConnectionError:

        print()
        print(
            "Could not connect to Flask."
        )

        print(
            "Make sure app.py is running."
        )

        return None

    except requests.exceptions.Timeout:

        print()
        print(
            "Gemini request timed out."
        )

        return None

    except Exception as error:

        print()
        print(
            "Gemini request error:",
            error
        )

        return None


# ==========================================
# WAKE WORD AUDIO QUEUE
# ==========================================

audio_queue = queue.Queue()


def audio_callback(
    indata,
    frames,
    time_info,
    status
):

    if status:

        print(
            "Audio status:",
            status
        )

    audio_queue.put(
        indata[:, 0].copy()
    )


# ==========================================
# LOAD WAKE WORD MODEL
# ==========================================

print()

print(
    "================================"
)

print(
    "       JARVIS VOICE MODE"
)

print(
    "================================"
)

print()

print(
    "Loading wake-word model..."
)


wake_model = Model(
    wakeword_models=[
        WAKE_WORD
    ],
    inference_framework="onnx"
)


print(
    "Wake-word model loaded."
)

print()


# ==========================================
# STARTUP
# ==========================================

speak(
    "Voice mode activated."
)

print(
    'Say "Hey JARVIS" to wake me.'
)

print(
    "Press Ctrl+C to stop."
)

print()


# ==========================================
# RESET WAKE MODEL
# ==========================================

def reset_wake_model():

    try:

        wake_model.reset()

    except Exception:

        # Some versions of openWakeWord
        # may not expose reset().
        pass


# ==========================================
# CLEAR AUDIO QUEUE
# ==========================================

def clear_audio_queue():

    global audio_queue

    audio_queue = queue.Queue()


# ==========================================
# WAIT FOR WAKE WORD
# ==========================================

def wait_for_wake_word():

    global audio_queue

    # ======================================
    # RESET EVERYTHING
    # ======================================

    clear_audio_queue()

    reset_wake_model()

    print(
        '🎤 Waiting for "Hey JARVIS"...'
    )

    # ======================================
    # LISTEN
    # ======================================

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

            prediction = wake_model.predict(
                audio
            )

            score = prediction.get(
                WAKE_WORD,
                0
            )

            # ==================================
            # WAKE WORD DETECTED
            # ==================================

            if score >= WAKE_THRESHOLD:

                print()

                print(
                    "================================"
                )

                print(
                    "🔥 JARVIS ACTIVATED"
                )

                print(
                    f"Wake score: {score:.3f}"
                )

                print(
                    "================================"
                )

                print()

                # Reset model immediately so
                # old audio cannot trigger it again.
                reset_wake_model()

                return


# ==========================================
# CONVERSATION MODE
# ==========================================

def conversation_mode():

    # ======================================
    # WAKE RESPONSE
    # ======================================

    speak(
        "Yes?"
    )

    # ======================================
    # CONTINUOUS CONVERSATION
    # ======================================

    while True:

        # ==================================
        # LISTEN
        # ==================================

        command = listen_for_command()

        # ==================================
        # NOTHING HEARD
        # ==================================

        if not command:

            print(
                "🎤 No valid command."
            )

            print(
                "Returning to standby."
            )

            return

        # ==================================
        # CHECK STOP COMMAND
        # ==================================

        if is_stop_command(command):

            print(
                "🛑 Stop command detected."
            )

            speak(
                "Understood. Returning to standby."
            )

            return

        # ==================================
        # SEND TO GEMINI
        # ==================================

        response = ask_jarvis(
            command
        )

        # ==================================
        # SERVER ERROR
        # ==================================

        if not response:

            speak(
                "I'm sorry. I couldn't connect to my AI system."
            )

            return

        # ==================================
        # SPEAK RESPONSE
        # ==================================

        speak(
            response
        )

        # ==================================
        # CONTINUE
        # ==================================

        print(
            "🎤 Continuing conversation..."
        )

        print(
            "Say another command."
        )

        print()


# ==========================================
# MAIN LOOP
# ==========================================

try:

    while True:

        # ==================================
        # WAIT FOR WAKE WORD
        # ==================================

        wait_for_wake_word()

        # ==================================
        # ENTER CONVERSATION
        # ==================================

        conversation_mode()

        # ==================================
        # RETURN TO STANDBY
        # ==================================

        print()

        print(
            "Returning to wake-word mode..."
        )

        print()

        # Extra protection against the
        # microphone hearing JARVIS itself.
        time.sleep(1.0)

        clear_audio_queue()

        reset_wake_model()


except KeyboardInterrupt:

    print()

    print(
        "JARVIS voice mode stopped."
    )

    print()


finally:

    try:

        engine.stop()

    except Exception:

        pass
