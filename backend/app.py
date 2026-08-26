import os
import re

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai

from database import (
    initialize_database,
    create_conversation,
    save_message,
    get_recent_messages,
    save_memory,
    get_all_memories,
    delete_conversation,
)


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

CORS(app)


# ============================================================
# GEMINI
# ============================================================

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured."
    )


client = genai.Client(
    api_key=api_key
)


# ============================================================
# DATABASE
# ============================================================

initialize_database()


# ============================================================
# MEMORY DETECTION
# ============================================================

def detect_memory(message):

    text = message.strip()

    memories = []


    # ========================================================
    # NAME
    # ========================================================

    name_match = re.search(
        r"\bmy name is ([a-zA-Z][a-zA-Z\s'-]{1,40})",
        text,
        re.IGNORECASE
    )

    if name_match:

        name = name_match.group(1).strip()

        name = re.split(
            r"\b(?:and|but|because|i|my)\b",
            name,
            maxsplit=1,
            flags=re.IGNORECASE
        )[0].strip()

        if name:

            memories.append(
                (
                    "personal",
                    "name",
                    name
                )
            )


    # ========================================================
    # AGE
    # ========================================================

    age_match = re.search(
        r"\b(?:i am|i'm)\s+(\d{1,3})\s+years?\s+old\b",
        text,
        re.IGNORECASE
    )

    if age_match:

        age = age_match.group(1)

        memories.append(
            (
                "personal",
                "age",
                age
            )
        )


    # ========================================================
    # FAVORITE COLOR
    # ========================================================

    color_match = re.search(
        r"\bmy favorite color is ([a-zA-Z]+)",
        text,
        re.IGNORECASE
    )

    if color_match:

        color = color_match.group(1).strip()

        memories.append(
            (
                "preferences",
                "favorite_color",
                color
            )
        )


    # ========================================================
    # FAVORITE FOOD
    # ========================================================

    food_match = re.search(
        r"\bmy favorite food is ([^.!?]+)",
        text,
        re.IGNORECASE
    )

    if food_match:

        food = food_match.group(1).strip()

        memories.append(
            (
                "preferences",
                "favorite_food",
                food
            )
        )


    # ========================================================
    # FAVORITE SPORT
    # ========================================================

    sport_match = re.search(
        r"\bmy favorite sport is ([^.!?]+)",
        text,
        re.IGNORECASE
    )

    if sport_match:

        sport = sport_match.group(1).strip()

        memories.append(
            (
                "preferences",
                "favorite_sport",
                sport
            )
        )


    # ========================================================
    # LIKES
    # ========================================================

    likes_match = re.search(
        r"\bi like ([^.!?]+)",
        text,
        re.IGNORECASE
    )

    if likes_match:

        liked_item = likes_match.group(1).strip()

        if liked_item:

            memories.append(
                (
                    "preferences",
                    "likes",
                    liked_item
                )
            )


    # ========================================================
    # DISLIKES
    # ========================================================

    dislikes_match = re.search(
        r"\bi (?:don't like|do not like|hate) ([^.!?]+)",
        text,
        re.IGNORECASE
    )

    if dislikes_match:

        disliked_item = dislikes_match.group(1).strip()

        if disliked_item:

            memories.append(
                (
                    "preferences",
                    "dislikes",
                    disliked_item
                )
            )


    # ========================================================
    # LOCATION
    # ========================================================

    location_match = re.search(
        r"\bi live in ([^.!?]+)",
        text,
        re.IGNORECASE
    )

    if location_match:

        location = location_match.group(1).strip()

        memories.append(
            (
                "personal",
                "location",
                location
            )
        )


    # ========================================================
    # SCHOOL
    # ========================================================

    school_match = re.search(
        r"\bi (?:study|go to) (?:at )?([^.!?]+)",
        text,
        re.IGNORECASE
    )

    if school_match:

        school = school_match.group(1).strip()

        memories.append(
            (
                "personal",
                "school",
                school
            )
        )


    return memories


# ============================================================
# BUILD MEMORY CONTEXT
# ============================================================

def build_memory_context():

    memories = get_all_memories()

    if not memories:

        return "No stored memories yet."


    memory_lines = []


    for memory in memories:

        category = memory["category"]
        key = memory["key"]
        value = memory["value"]

        memory_lines.append(
            f"- {category} | {key}: {value}"
        )


    return "\n".join(memory_lines)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    return jsonify({
        "status": "ok",
        "service": "JARVIS API"
    })


# ============================================================
# CHAT
# ============================================================

@app.route(
    "/api/chat",
    methods=["POST"]
)
def chat():

    try:

        data = request.get_json(
            silent=True
        )


        if not data:

            return jsonify({
                "error": "Request body is required."
            }), 400


        message = data.get(
            "message",
            ""
        ).strip()


        conversation_id = data.get(
            "conversation_id"
        )


        # ====================================================
        # VALIDATION
        # ====================================================

        if not message:

            return jsonify({
                "error": "Message cannot be empty."
            }), 400


        if not conversation_id:

            return jsonify({
                "error": "Conversation ID is required."
            }), 400


        print()
        print("User:", message)
        print("Conversation:", conversation_id)


        # ====================================================
        # CREATE CONVERSATION
        # ====================================================

        create_conversation(
            conversation_id
        )


        # ====================================================
        # SAVE USER MESSAGE
        # ====================================================

        save_message(
            conversation_id,
            "user",
            message
        )


        # ====================================================
        # DETECT MEMORIES
        # ====================================================

        detected_memories = detect_memory(
            message
        )


        for (
            category,
            key,
            value
        ) in detected_memories:

            save_memory(
                category,
                key,
                value
            )


            print(
                "Memory saved:",
                category,
                "→",
                key,
                "→",
                value
            )


        # ====================================================
        # GET CONVERSATION HISTORY
        # ====================================================

        history = get_recent_messages(
            conversation_id,
            limit=20
        )


        # ====================================================
        # BUILD CONVERSATION TEXT
        # ====================================================

        conversation_lines = []


        for item in history:

            role = item["role"]
            content = item["content"]


            if role == "user":

                conversation_lines.append(
                    f"User: {content}"
                )


            elif role == "assistant":

                conversation_lines.append(
                    f"JARVIS: {content}"
                )


        conversation_text = "\n".join(
            conversation_lines
        )


        # ====================================================
        # LONG-TERM MEMORY
        # ====================================================

        memory_context = (
            build_memory_context()
        )


        # ====================================================
        # JARVIS SYSTEM PROMPT
        # ====================================================

        prompt = f"""
You are JARVIS, a personal AI assistant.

You are speaking with the user.

The user's stored long-term memories are:

{memory_context}

Use these memories naturally when relevant.

Important rules:

- Do not claim to remember something that is not
  contained in the memory or conversation.
- If the user asks for their name and a name exists
  in memory, use it.
- Do not unnecessarily mention the memory system.
- Do not repeat memories unless they are relevant.
- Be helpful, intelligent, concise, and natural.
- You may refer to the user by their remembered name
  when appropriate.

Previous conversation:

{conversation_text}

Now respond to the user's latest message.

User:

{message}

JARVIS:
"""


        # ====================================================
        # GEMINI REQUEST
        # ====================================================

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )


        ai_response = response.text


        if not ai_response:

            return jsonify({
                "error": "Gemini returned an empty response."
            }), 500


        # ====================================================
        # SAVE AI RESPONSE
        # ====================================================

        save_message(
            conversation_id,
            "assistant",
            ai_response
        )


        # ====================================================
        # LOG
        # ====================================================

        print()
        print("JARVIS:", ai_response)
        print()


        # ====================================================
        # RESPONSE
        # ====================================================

        return jsonify({

            "response": ai_response,

            "conversation_id":
                conversation_id

        })


    except Exception as error:

        print()
        print(
            "Chat error:",
            error
        )
        print()


        return jsonify({

            "error":
                "An internal server error occurred."

        }), 500


# ============================================================
# CLEAR CONVERSATION
# ============================================================

@app.route(
    "/api/clear",
    methods=["POST"]
)
def clear_conversation():

    try:

        data = request.get_json(
            silent=True
        )


        if not data:

            return jsonify({
                "error": "Request body is required."
            }), 400


        conversation_id = data.get(
            "conversation_id"
        )


        if not conversation_id:

            return jsonify({
                "error": "Conversation ID is required."
            }), 400


        # ====================================================
        # DELETE CONVERSATION
        # ====================================================

        delete_conversation(
            conversation_id
        )


        print()
        print(
            "Conversation cleared:",
            conversation_id
        )
        print()


        return jsonify({
            "success": True
        })


    except Exception as error:

        print()
        print(
            "Clear error:",
            error
        )
        print()


        return jsonify({

            "error":
                "An internal server error occurred."

        }), 500


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )
