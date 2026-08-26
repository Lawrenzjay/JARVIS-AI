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
    delete_conversation
)


load_dotenv()


app = Flask(__name__)

CORS(app)


api_key = os.getenv(
    "GEMINI_API_KEY"
)

if not api_key:

    raise RuntimeError(
        "GEMINI_API_KEY is not set in the .env file"
    )


client = genai.Client(
    api_key=api_key
)


initialize_database()



def detect_memory(message):

    text = message.strip()

    memories = []


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


    # ======================================
    # LIKES
    # ======================================

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


    # ======================================
    # DISLIKES
    # ======================================

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


    # ======================================
    # LOCATION
    # ======================================

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


    # ======================================
    # SCHOOL
    # ======================================

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


# ==========================================
# FORMAT MEMORIES FOR GEMINI
# ==========================================

def build_memory_context():

    memories = get_all_memories()

    if not memories:

        return "No stored memories yet."


    memory_text = ""

    for memory in memories:

        category = memory["category"]
        key = memory["key"]
        value = memory["value"]

        memory_text += (
            f"- {category} | "
            f"{key}: {value}\n"
        )


    return memory_text


# ==========================================
# chat route
# ==========================================

@app.route(
    "/chat",
    methods=["POST"]
)
def chat():

    try:
        data = request.get_json()
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
        if not message:

            return jsonify({
                "error": "Message cannot be empty."
            }), 400
        if not conversation_id:

            return jsonify({
                "error": "Conversation ID is required."
            }), 400

        print()

        print(
            "User:",
            message
        )
        print(
            "Conversation:",
            conversation_id
        )
        create_conversation(
            conversation_id
        )
        save_message(
            conversation_id,
            "user",
            message
        )
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
                f"Memory saved: "
                f"{category} → "
                f"{key} → "
                f"{value}"
            )


        # ==================================
        # GET CONVERSATION HISTORY
        # ==================================

        history = get_recent_messages(
            conversation_id,
            limit=20
        )


        # ==================================
        # BUILD CONVERSATION TEXT
        # ==================================

        conversation_text = ""


        for item in history:

            role = item["role"]

            content = item["content"]


            if role == "user":

                conversation_text += (
                    f"User: {content}\n"
                )


            elif role == "assistant":

                conversation_text += (
                    f"JARVIS: {content}\n"
                )


        # ==================================
        # GET LONG-TERM MEMORY
        # ==================================

        memory_context = (
            build_memory_context()
        )


        # ==================================
        # JARVIS SYSTEM INSTRUCTIONS
        # ==================================

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
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )
        ai_response = response.text


        # ==================================
        # SAVE JARVIS RESPONSE
        # ==================================

        save_message(
            conversation_id,
            "assistant",
            ai_response
        )


        # ==================================
        # RETURN RESPONSE
        # ==================================

        print()

        print(
            "JARVIS:",
            ai_response
        )

        print()


        return jsonify({

            "response": ai_response,

            "conversation_id":
                conversation_id

        })


    except Exception as error:

        print()

        print(
            "Gemini error:",
            error
        )

        print()


        return jsonify({

            "error":
                str(error)

        }), 500


# ==========================================
# CLEAR CONVERSATION
# ==========================================

@app.route(
    "/clear",
    methods=["POST"]
)
def clear_conversation():

    try:

        data = request.get_json()

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


        # ==================================
        # DELETE CONVERSATION ONLY
        # ==================================

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

        print(
            "Clear error:",
            error
        )


        return jsonify({

            "error":
                str(error)

        }), 500


# ==========================================
# RUN FLASK
# ==========================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )
