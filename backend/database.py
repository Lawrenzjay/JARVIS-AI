import sqlite3
import os


# ============================================================
# DATABASE PATH
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATABASE = os.path.join(
    BASE_DIR,
    "jarvis.db"
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection():

    connection = sqlite3.connect(
        DATABASE
    )

    connection.row_factory = sqlite3.Row

    return connection


# ============================================================
# INITIALIZE DATABASE
# ============================================================

def initialize_database():

    connection = get_connection()

    cursor = connection.cursor()


    # ========================================================
    # CONVERSATIONS
    # ========================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)


    # ========================================================
    # MESSAGES
    # ========================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (conversation_id)
                REFERENCES conversations(id)
        )
    """)


    # ========================================================
    # MEMORIES
    # ========================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)


    connection.commit()

    connection.close()


# ============================================================
# CONVERSATIONS
# ============================================================

def create_conversation(
    conversation_id
):

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute("""
        INSERT OR IGNORE INTO conversations (
            id
        )
        VALUES (?)
    """, (
        conversation_id,
    ))


    connection.commit()

    connection.close()


# ============================================================
# SAVE MESSAGE
# ============================================================

def save_message(
    conversation_id,
    role,
    content
):

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute("""
        INSERT INTO messages (
            conversation_id,
            role,
            content
        )
        VALUES (?, ?, ?)
    """, (
        conversation_id,
        role,
        content
    ))


    connection.commit()

    connection.close()


# ============================================================
# GET RECENT MESSAGES
# ============================================================

def get_recent_messages(
    conversation_id,
    limit=20
):

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT
            role,
            content
        FROM messages
        WHERE conversation_id = ?
        ORDER BY id DESC
        LIMIT ?
    """, (
        conversation_id,
        limit
    ))


    messages = cursor.fetchall()

    connection.close()


    # Reverse messages so Gemini receives
    # chronological conversation history.

    messages.reverse()


    return [
        {
            "role": message["role"],
            "content": message["content"]
        }
        for message in messages
    ]


# ============================================================
# GET ALL MESSAGES
# ============================================================

def get_messages(
    conversation_id
):

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT
            role,
            content
        FROM messages
        WHERE conversation_id = ?
        ORDER BY id ASC
    """, (
        conversation_id,
    ))


    messages = cursor.fetchall()

    connection.close()


    return [
        {
            "role": message["role"],
            "content": message["content"]
        }
        for message in messages
    ]


# ============================================================
# SAVE MEMORY
# ============================================================

def save_memory(
    category,
    key,
    value
):

    connection = get_connection()

    cursor = connection.cursor()


    # ========================================================
    # CHECK FOR EXISTING MEMORY
    # ========================================================

    cursor.execute("""
        SELECT id
        FROM memories
        WHERE category = ?
        AND key = ?
        AND value = ?
    """, (
        category,
        key,
        value
    ))


    existing = cursor.fetchone()


    # ========================================================
    # INSERT NEW MEMORY
    # ========================================================

    if not existing:

        cursor.execute("""
            INSERT INTO memories (
                category,
                key,
                value
            )
            VALUES (?, ?, ?)
        """, (
            category,
            key,
            value
        ))


    connection.commit()

    connection.close()


# ============================================================
# GET ALL MEMORIES
# ============================================================

def get_all_memories():

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT
            category,
            key,
            value
        FROM memories
        ORDER BY id ASC
    """)


    memories = cursor.fetchall()

    connection.close()


    return [
        {
            "category": memory["category"],
            "key": memory["key"],
            "value": memory["value"]
        }
        for memory in memories
    ]


# ============================================================
# DELETE CONVERSATION
# ============================================================

def delete_conversation(
    conversation_id
):

    connection = get_connection()

    cursor = connection.cursor()


    # ========================================================
    # DELETE MESSAGES
    # ========================================================

    cursor.execute("""
        DELETE FROM messages
        WHERE conversation_id = ?
    """, (
        conversation_id,
    ))


    # ========================================================
    # DELETE CONVERSATION
    # ========================================================

    cursor.execute("""
        DELETE FROM conversations
        WHERE id = ?
    """, (
        conversation_id,
    ))


    connection.commit()

    connection.close()
