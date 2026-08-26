import sqlite3

from pathlib import Path


# ==========================================
# DATABASE LOCATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

DATABASE_PATH = BASE_DIR / "jarvis.db"


# ==========================================
# DATABASE CONNECTION
# ==========================================

def get_connection():

    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = sqlite3.Row

    return connection


# ==========================================
# CHECK COLUMN
# ==========================================

def column_exists(
    cursor,
    table_name,
    column_name
):

    cursor.execute(
        f"PRAGMA table_info({table_name})"
    )

    columns = cursor.fetchall()

    return any(
        column["name"] == column_name
        for column in columns
    )


# ==========================================
# CREATE TABLES
# ==========================================

def initialize_database():

    connection = get_connection()

    cursor = connection.cursor()


    # ======================================
    # CONVERSATIONS
    # ======================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS conversations (

            id TEXT PRIMARY KEY,

            title TEXT,

            created_at
                DATETIME
                DEFAULT CURRENT_TIMESTAMP,

            updated_at
                DATETIME
                DEFAULT CURRENT_TIMESTAMP

        )
        """
    )


    # ======================================
    # DATABASE MIGRATION
    # ======================================
    # Older versions of JARVIS may already
    # have the conversations table without
    # the title column.
    #
    # Add it automatically if necessary.

    if not column_exists(
        cursor,
        "conversations",
        "title"
    ):

        cursor.execute(
            """
            ALTER TABLE conversations
            ADD COLUMN title TEXT
            """
        )


    # ======================================
    # MESSAGES
    # ======================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (

            id INTEGER
                PRIMARY KEY AUTOINCREMENT,

            conversation_id
                TEXT NOT NULL,

            role
                TEXT NOT NULL,

            content
                TEXT NOT NULL,

            created_at
                DATETIME
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (
                conversation_id
            )
            REFERENCES conversations(id)

        )
        """
    )


    # ======================================
    # LONG-TERM MEMORY
    # ======================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS memories (

            id INTEGER
                PRIMARY KEY AUTOINCREMENT,

            category
                TEXT NOT NULL,

            key
                TEXT NOT NULL,

            value
                TEXT NOT NULL,

            created_at
                DATETIME
                DEFAULT CURRENT_TIMESTAMP,

            updated_at
                DATETIME
                DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (
                category,
                key
            )

        )
        """
    )


    # ======================================
    # INDEXES
    # ======================================

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS
        idx_messages_conversation
        ON messages(conversation_id)
        """
    )


    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS
        idx_memories_category
        ON memories(category)
        """
    )


    connection.commit()

    connection.close()


# ==========================================
# CREATE CONVERSATION
# ==========================================

def create_conversation(
    conversation_id,
    title="JARVIS Conversation"
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT OR IGNORE INTO conversations (
            id,
            title
        )
        VALUES (?, ?)
        """,
        (
            conversation_id,
            title
        )
    )

    connection.commit()

    connection.close()


# ==========================================
# SAVE MESSAGE
# ==========================================

def save_message(
    conversation_id,
    role,
    content
):

    connection = get_connection()

    cursor = connection.cursor()


    # ======================================
    # MAKE SURE CONVERSATION EXISTS
    # ======================================

    cursor.execute(
        """
        INSERT OR IGNORE INTO conversations (
            id,
            title
        )
        VALUES (?, ?)
        """,
        (
            conversation_id,
            "JARVIS Conversation"
        )
    )


    # ======================================
    # SAVE MESSAGE
    # ======================================

    cursor.execute(
        """
        INSERT INTO messages (
            conversation_id,
            role,
            content
        )
        VALUES (?, ?, ?)
        """,
        (
            conversation_id,
            role,
            content
        )
    )


    # ======================================
    # UPDATE CONVERSATION
    # ======================================

    cursor.execute(
        """
        UPDATE conversations

        SET updated_at = CURRENT_TIMESTAMP

        WHERE id = ?
        """,
        (
            conversation_id,
        )
    )


    connection.commit()

    connection.close()


# ==========================================
# GET CONVERSATION HISTORY
# ==========================================

def get_messages(
    conversation_id
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            role,
            content,
            created_at

        FROM messages

        WHERE conversation_id = ?

        ORDER BY id ASC
        """,
        (
            conversation_id,
        )
    )

    messages = cursor.fetchall()

    connection.close()

    return messages


# ==========================================
# GET RECENT MESSAGES
# ==========================================

def get_recent_messages(
    conversation_id,
    limit=20
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            role,
            content,
            created_at

        FROM messages

        WHERE conversation_id = ?

        ORDER BY id DESC

        LIMIT ?
        """,
        (
            conversation_id,
            limit
        )
    )

    messages = cursor.fetchall()

    connection.close()

    return list(
        reversed(messages)
    )


# ==========================================
# SAVE MEMORY
# ==========================================

def save_memory(
    category,
    key,
    value
):

    connection = get_connection()

    cursor = connection.cursor()


    # ======================================
    # INSERT OR UPDATE MEMORY
    # ======================================

    cursor.execute(
        """
        INSERT INTO memories (
            category,
            key,
            value
        )

        VALUES (?, ?, ?)

        ON CONFLICT(category, key)

        DO UPDATE SET

            value = excluded.value,

            updated_at = CURRENT_TIMESTAMP
        """,
        (
            category,
            key,
            value
        )
    )


    connection.commit()

    connection.close()


# ==========================================
# GET MEMORY
# ==========================================

def get_memory(
    category,
    key
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            value

        FROM memories

        WHERE category = ?

        AND key = ?

        LIMIT 1
        """,
        (
            category,
            key
        )
    )

    memory = cursor.fetchone()

    connection.close()


    if memory:

        return memory["value"]

    return None


# ==========================================
# GET ALL MEMORIES
# ==========================================

def get_all_memories():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            category,
            key,
            value,
            created_at,
            updated_at

        FROM memories

        ORDER BY updated_at DESC
        """
    )

    memories = cursor.fetchall()

    connection.close()

    return memories


# ==========================================
# GET MEMORIES BY CATEGORY
# ==========================================

def get_memories_by_category(
    category
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            category,
            key,
            value,
            created_at,
            updated_at

        FROM memories

        WHERE category = ?

        ORDER BY updated_at DESC
        """,
        (
            category,
        )
    )

    memories = cursor.fetchall()

    connection.close()

    return memories


# ==========================================
# DELETE MEMORY
# ==========================================

def delete_memory(
    category,
    key
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM memories

        WHERE category = ?

        AND key = ?
        """,
        (
            category,
            key
        )
    )

    connection.commit()

    connection.close()


# ==========================================
# CLEAR ALL MEMORIES
# ==========================================

def clear_memories():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM memories
        """
    )

    connection.commit()

    connection.close()


# ==========================================
# DELETE CONVERSATION
# ==========================================

def delete_conversation(
    conversation_id
):

    connection = get_connection()

    cursor = connection.cursor()


    # ======================================
    # DELETE MESSAGES
    # ======================================

    cursor.execute(
        """
        DELETE FROM messages

        WHERE conversation_id = ?
        """,
        (
            conversation_id,
        )
    )


    # ======================================
    # DELETE CONVERSATION
    # ======================================

    cursor.execute(
        """
        DELETE FROM conversations

        WHERE id = ?
        """,
        (
            conversation_id,
        )
    )


    connection.commit()

    connection.close()


# ==========================================
# INITIALIZE DATABASE
# ==========================================

if __name__ == "__main__":

    initialize_database()

    print()

    print(
        "================================"
    )

    print(
        "       JARVIS DATABASE"
    )

    print(
        "================================"
    )

    print()

    print(
        "Database initialized at:"
    )

    print(
        DATABASE_PATH
    )

    print()

    print(
        "Tables:"
    )

    print(
        "  ✓ conversations"
    )

    print(
        "  ✓ messages"
    )

    print(
        "  ✓ memories"
    )

    print()

    print(
        "JARVIS memory system ready."
    )

    print()