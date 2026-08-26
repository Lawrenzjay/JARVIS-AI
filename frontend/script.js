const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");

const newChatButton = document.getElementById("newChatButton");
const sidebarNewChatButton =
    document.getElementById("sidebarNewChatButton");

const recentChats =
    document.getElementById("recentChats");

const sidebar =
    document.getElementById("sidebar");

const menuButton =
    document.getElementById("menuButton");

const micButton =
    document.getElementById("micButton");

const voiceStatus =
    document.getElementById("voiceStatus");

const statusText =
    document.getElementById("statusText");


// ==========================================
// FLASK BACKEND
// ==========================================

const FLASK_BASE_URL =
    "https://jarvis-ai-g3.vercel.app";

const CHAT_URL = `${FLASK_BASE_URL}/chat`;
const CLEAR_URL = `${FLASK_BASE_URL}/clear`;

// ==========================================
// STORAGE KEYS
// ==========================================

const CONVERSATIONS_KEY =
    "jarvisConversations";

const ACTIVE_CONVERSATION_KEY =
    "jarvisActiveConversation";


// ==========================================
// CONVERSATION DATA
// ==========================================

let conversations =
    loadConversations();

let conversationId =
    localStorage.getItem(
        ACTIVE_CONVERSATION_KEY
    );


// ==========================================
// VOICE VARIABLES
// ==========================================

const WAKE_WORDS = [
    "hey jarvis",
    "hey, jarvis"
];

let recognition = null;

let isListening = false;
let isCommandMode = false;
let isSpeaking = false;
let isSendingMessage = false;

let shouldKeepListening = true;
let recognitionStarting = false;


// ==========================================
// CREATE ID
// ==========================================

function createId() {

    if (
        window.crypto &&
        crypto.randomUUID
    ) {

        return crypto.randomUUID();

    }

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2)
    );

}


// ==========================================
// LOAD CONVERSATIONS
// ==========================================

function loadConversations() {

    try {

        const saved =
            localStorage.getItem(
                CONVERSATIONS_KEY
            );

        if (!saved) {

            return [];

        }

        const parsed =
            JSON.parse(saved);

        if (!Array.isArray(parsed)) {

            return [];

        }

        return parsed;

    } catch (error) {

        console.error(
            "Could not load conversations:",
            error
        );

        return [];

    }

}


// ==========================================
// SAVE CONVERSATIONS
// ==========================================

function saveConversations() {

    try {

        localStorage.setItem(
            CONVERSATIONS_KEY,
            JSON.stringify(conversations)
        );

    } catch (error) {

        console.error(
            "Could not save conversations:",
            error
        );

    }

}


// ==========================================
// GET FIRST USER MESSAGE
// ==========================================

function getFirstUserMessage(
    conversation
) {

    if (
        !conversation ||
        !Array.isArray(
            conversation.messages
        )
    ) {

        return "";

    }

    const firstUserMessage =
        conversation.messages.find(
            function (message) {

                return (
                    message.sender === "user"
                );

            }
        );

    if (!firstUserMessage) {

        return "";

    }

    return (
        firstUserMessage.text || ""
    );

}


// ==========================================
// GENERATE CONVERSATION TITLE
// ==========================================

function generateConversationTitle(
    message
) {

    if (!message) {

        return "New Conversation";

    }

    const cleanMessage =
        message
            .trim()
            .replace(/\s+/g, " ");

    if (!cleanMessage) {

        return "New Conversation";

    }

    const maxLength = 38;

    if (
        cleanMessage.length <= maxLength
    ) {

        return cleanMessage;

    }

    return (
        cleanMessage.substring(
            0,
            maxLength
        ) + "..."
    );

}


// ==========================================
// GET CONVERSATION TITLE
// ALWAYS USE FIRST USER MESSAGE
// ==========================================

function getConversationTitle(
    conversation
) {

    const firstMessage =
        getFirstUserMessage(
            conversation
        );

    if (firstMessage) {

        return generateConversationTitle(
            firstMessage
        );

    }

    return "New Conversation";

}


// ==========================================
// CREATE CONVERSATION
// ==========================================

function createConversation() {

    const id =
        createId();

    const now =
        Date.now();

    const conversation = {

        id: id,

        title:
            "New Conversation",

        messages: [

            {
                sender: "bot",

                text:
                    "Hello! I am JARVIS. How can I help you?",

                timestamp:
                    now
            }

        ],

        createdAt:
            now,

        updatedAt:
            now

    };


    conversations.unshift(
        conversation
    );


    conversationId =
        id;


    localStorage.setItem(
        ACTIVE_CONVERSATION_KEY,
        conversationId
    );


    saveConversations();


    return conversation;

}


// ==========================================
// GET CURRENT CONVERSATION
// ==========================================

function getCurrentConversation() {

    return conversations.find(
        function (conversation) {

            return (
                conversation.id ===
                conversationId
            );

        }
    );

}


// ==========================================
// ENSURE ACTIVE CONVERSATION
// ==========================================

function ensureActiveConversation() {

    if (!conversationId) {

        createConversation();

        return;

    }


    const conversation =
        getCurrentConversation();


    if (!conversation) {

        createConversation();

    }

}


// ==========================================
// UPDATE CONVERSATION TITLE
// ==========================================

function updateConversationTitle() {

    const conversation =
        getCurrentConversation();


    if (!conversation) {

        return;

    }


    conversation.title =
        getConversationTitle(
            conversation
        );


    saveConversations();

}


// ==========================================
// SAVE MESSAGE
// ==========================================

function saveMessageToConversation(
    message,
    sender
) {

    ensureActiveConversation();


    const conversation =
        getCurrentConversation();


    if (!conversation) {

        return;

    }


    conversation.messages.push({

        sender: sender,

        text: message,

        timestamp:
            Date.now()

    });


    conversation.updatedAt =
        Date.now();


    // If this is the first user message,
    // automatically use it as the chat title.

    if (sender === "user") {

        updateConversationTitle();

    }


    saveConversations();

    renderRecentChats();

}


// ==========================================
// SORT CONVERSATIONS
// ==========================================

function getSortedConversations() {

    return [
        ...conversations
    ].sort(
        function (a, b) {

            return (
                b.updatedAt -
                a.updatedAt
            );

        }
    );

}


// ==========================================
// RENDER RECENT CHATS
// ==========================================

function renderRecentChats() {

    if (!recentChats) {

        return;

    }


    recentChats.innerHTML =
        "";


    const sortedConversations =
        getSortedConversations();


    if (
        sortedConversations.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "no-recent-chats";

        empty.textContent =
            "No conversations yet.";

        recentChats.appendChild(
            empty
        );

        return;

    }


    sortedConversations.forEach(
        function (conversation) {

            const chatItem =
                document.createElement(
                    "div"
                );


            chatItem.className =
                "recent-chat-item";


            if (
                conversation.id ===
                conversationId
            ) {

                chatItem.classList.add(
                    "active"
                );

            }


            // ==================================
            // CHAT TITLE
            // ==================================

            const chatTitle =
                document.createElement(
                    "button"
                );


            chatTitle.type =
                "button";


            chatTitle.className =
                "recent-chat-title";


            const title =
                getConversationTitle(
                    conversation
                );


            chatTitle.textContent =
                title;


            chatTitle.title =
                title;


            // ==================================
            // OPEN CONVERSATION
            // ==================================

            chatTitle.addEventListener(
                "click",
                function () {

                    switchConversation(
                        conversation.id
                    );

                }
            );


            // ==================================
            // DELETE BUTTON
            // ==================================

            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.type =
                "button";


            deleteButton.className =
                "delete-chat-button";


            deleteButton.textContent =
                "×";


            deleteButton.title =
                "Delete conversation";


            deleteButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    deleteConversation(
                        conversation.id
                    );

                }
            );


            chatItem.appendChild(
                chatTitle
            );


            chatItem.appendChild(
                deleteButton
            );


            recentChats.appendChild(
                chatItem
            );

        }
    );

}


// ==========================================
// SWITCH CONVERSATION
// ==========================================

function switchConversation(id) {

    const conversation =
        conversations.find(
            function (chat) {

                return chat.id === id;

            }
        );


    if (!conversation) {

        return;

    }


    // Stop speech

    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();

    }


    isSpeaking =
        false;


    // Stop recognition

    shouldKeepListening =
        false;

    isCommandMode =
        false;

    stopRecognition();


    // Set active conversation

    conversationId =
        conversation.id;


    localStorage.setItem(
        ACTIVE_CONVERSATION_KEY,
        conversationId
    );


    // Clear chat UI

    chatMessages.innerHTML =
        "";


    // Restore messages

    conversation.messages.forEach(
        function (message) {

            addMessageToUI(
                message.text,
                message.sender
            );

        }
    );


    renderRecentChats();


    scrollToBottom();


    // Close sidebar on mobile

    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }


    // Restart voice

    setTimeout(
        function () {

            shouldKeepListening =
                true;

            startWakeListening();

        },
        500
    );

}


// ==========================================
// DELETE CONVERSATION
// ==========================================

function deleteConversation(id) {

    const conversation =
        conversations.find(
            function (chat) {

                return chat.id === id;

            }
        );


    if (!conversation) {

        return;

    }


    const title =
        getConversationTitle(
            conversation
        );


    const confirmed =
        confirm(
            `Delete "${title}"?`
        );


    if (!confirmed) {

        return;

    }


    conversations =
        conversations.filter(
            function (chat) {

                return chat.id !== id;

            }
        );


    saveConversations();


    // If current conversation deleted

    if (
        id === conversationId
    ) {

        if (
            conversations.length > 0
        ) {

            const nextConversation =
                getSortedConversations()[0];


            conversationId =
                nextConversation.id;


            localStorage.setItem(
                ACTIVE_CONVERSATION_KEY,
                conversationId
            );


            switchConversation(
                conversationId
            );

        } else {

            createConversation();

            loadCurrentConversation();

        }

    }


    renderRecentChats();

}


// ==========================================
// LOAD CURRENT CONVERSATION
// ==========================================

function loadCurrentConversation() {

    ensureActiveConversation();


    const conversation =
        getCurrentConversation();


    if (!conversation) {

        return;

    }


    chatMessages.innerHTML =
        "";


    conversation.messages.forEach(
        function (message) {

            addMessageToUI(
                message.text,
                message.sender
            );

        }
    );


    scrollToBottom();

}


// ==========================================
// SIDEBAR TOGGLE
// ==========================================

if (menuButton) {

    menuButton.addEventListener(
        "click",
        function () {

            sidebar.classList.toggle(
                "open"
            );

        }
    );

}


// ==========================================
// CLICK OUTSIDE SIDEBAR
// MOBILE ONLY
// ==========================================

document.addEventListener(
    "click",
    function (event) {

        if (
            window.innerWidth > 800
        ) {

            return;

        }


        if (!sidebar) {

            return;

        }


        if (
            !sidebar.classList.contains(
                "open"
            )
        ) {

            return;

        }


        const clickedInsideSidebar =
            sidebar.contains(
                event.target
            );


        const clickedMenu =
            menuButton &&
            menuButton.contains(
                event.target
            );


        if (
            !clickedInsideSidebar &&
            !clickedMenu
        ) {

            sidebar.classList.remove(
                "open"
            );

        }

    }
);


// ==========================================
// SPEECH RECOGNITION
// ==========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.lang =
        "en-US";


    recognition.maxAlternatives =
        1;


    // ======================================
    // START
    // ======================================

    recognition.onstart =
        function () {

            isListening =
                true;

            recognitionStarting =
                false;


            if (micButton) {

                micButton.classList.add(
                    "listening"
                );

            }


            if (isCommandMode) {

                if (micButton) {

                    micButton.textContent =
                        "🔴";

                }


                statusText.textContent =
                    "Listening";


                voiceStatus.textContent =
                    "JARVIS is listening...";

            } else {

                if (micButton) {

                    micButton.textContent =
                        "🎤";

                }


                statusText.textContent =
                    "Ready";


                voiceStatus.textContent =
                    'Waiting for "Hey JARVIS"...';

            }

        };


    // ======================================
    // RESULT
    // ======================================

    recognition.onresult =
        function (event) {

            if (
                !event.results ||
                !event.results[0] ||
                !event.results[0][0]
            ) {

                return;

            }


            const transcript =
                event.results[0][0]
                    .transcript
                    .trim();


            const lowerTranscript =
                transcript.toLowerCase();


            console.log(
                "Heard:",
                transcript
            );


            // Wake mode

            if (!isCommandMode) {

                const detectedWakeWord =
                    WAKE_WORDS.some(
                        function (wakeWord) {

                            return lowerTranscript.includes(
                                wakeWord
                            );

                        }
                    );


                if (
                    detectedWakeWord
                ) {

                    activateCommandMode(
                        transcript
                    );

                }


                return;

            }


            // Command mode

            let command =
                removeWakeWords(
                    transcript
                );


            if (!command) {

                voiceStatus.textContent =
                    "I am listening...";

                return;

            }


            userInput.value =
                command;


            isCommandMode =
                false;


            stopRecognition();


            sendMessage(true);

        };


    // ======================================
    // ERROR
    // ======================================

    recognition.onerror =
        function (event) {

            console.error(
                "Speech recognition error:",
                event.error
            );


            recognitionStarting =
                false;


            if (
                event.error ===
                "not-allowed"
            ) {

                isListening =
                    false;

                shouldKeepListening =
                    false;


                statusText.textContent =
                    "Microphone blocked";


                voiceStatus.textContent =
                    "Allow microphone permission.";


                if (micButton) {

                    micButton.classList.remove(
                        "listening"
                    );

                    micButton.textContent =
                        "🎤";

                }

            }

        };


    // ======================================
    // END
    // ======================================

    recognition.onend =
        function () {

            isListening =
                false;

            recognitionStarting =
                false;


            if (micButton) {

                micButton.classList.remove(
                    "listening"
                );

            }


            if (isSpeaking) {

                return;

            }


            if (isCommandMode) {

                setTimeout(
                    function () {

                        if (
                            !isListening &&
                            isCommandMode &&
                            !isSpeaking
                        ) {

                            startCommandListening();

                        }

                    },
                    400
                );

                return;

            }


            if (
                shouldKeepListening &&
                !isSendingMessage &&
                !isSpeaking
            ) {

                setTimeout(
                    function () {

                        startWakeListening();

                    },
                    500
                );

            }

        };

} else {

    console.warn(
        "Speech Recognition is not supported."
    );

}


// ==========================================
// REMOVE WAKE WORD
// ==========================================

function removeWakeWords(text) {

    let command =
        text;


    WAKE_WORDS.forEach(
        function (wakeWord) {

            const escapedWakeWord =
                wakeWord.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );


            command =
                command.replace(
                    new RegExp(
                        escapedWakeWord,
                        "ig"
                    ),
                    ""
                );

        }
    );


    return command
        .replace(
            /^[,.\s]+/,
            ""
        )
        .trim();

}


// ==========================================
// START WAKE LISTENING
// ==========================================

function startWakeListening() {

    if (!recognition) {

        return;

    }


    if (
        isListening ||
        recognitionStarting ||
        isCommandMode ||
        isSpeaking ||
        isSendingMessage ||
        !shouldKeepListening
    ) {

        return;

    }


    recognitionStarting =
        true;


    try {

        recognition.start();

    } catch (error) {

        recognitionStarting =
            false;

    }

}


// ==========================================
// START COMMAND LISTENING
// ==========================================

function startCommandListening() {

    if (!recognition) {

        return;

    }


    if (
        isListening ||
        recognitionStarting ||
        !isCommandMode ||
        isSpeaking
    ) {

        return;

    }


    recognitionStarting =
        true;


    try {

        recognition.start();

    } catch (error) {

        recognitionStarting =
            false;

    }

}


// ==========================================
// ACTIVATE COMMAND MODE
// ==========================================

function activateCommandMode(
    transcript = ""
) {

    isCommandMode =
        true;


    statusText.textContent =
        "Activated";


    voiceStatus.textContent =
        "JARVIS activated. Listening...";


    if (micButton) {

        micButton.textContent =
            "🔴";

        micButton.classList.add(
            "listening"
        );

    }


    const command =
        removeWakeWords(
            transcript
        );


    // Example:
    // "Hey Jarvis what time is it"
    // sends immediately

    if (command) {

        userInput.value =
            command;


        isCommandMode =
            false;


        stopRecognition();


        setTimeout(
            function () {

                sendMessage(true);

            },
            250
        );

        return;

    }


    setTimeout(
        function () {

            startCommandListening();

        },
        400
    );

}


// ==========================================
// STOP RECOGNITION
// ==========================================

function stopRecognition() {

    if (!recognition) {

        return;

    }


    recognitionStarting =
        false;


    try {

        if (isListening) {

            recognition.stop();

        }

    } catch (error) {

        console.warn(
            "Recognition stop error:",
            error
        );

    }

}


// ==========================================
// MICROPHONE BUTTON
// ==========================================

if (micButton) {

    micButton.addEventListener(
        "click",
        function () {

            if (!recognition) {

                alert(
                    "Speech recognition is not supported in this browser."
                );

                return;

            }


            if (isListening) {

                shouldKeepListening =
                    false;

                isCommandMode =
                    false;

                stopRecognition();


                statusText.textContent =
                    "Online";


                voiceStatus.textContent =
                    'Say "Hey JARVIS"';


                micButton.textContent =
                    "🎤";

                return;

            }


            shouldKeepListening =
                true;


            isCommandMode =
                false;


            startWakeListening();

        }
    );

}


// ==========================================
// TEXT TO SPEECH
// ==========================================

function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        return;

    }


    window.speechSynthesis.cancel();


    isSpeaking =
        true;


    shouldKeepListening =
        false;


    isCommandMode =
        false;


    stopRecognition();


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.lang =
        "en-US";


    speech.rate =
        1;


    speech.pitch =
        1;


    speech.volume =
        1;


    speech.onstart =
        function () {

            statusText.textContent =
                "Speaking";


            voiceStatus.textContent =
                "JARVIS is speaking...";


            if (micButton) {

                micButton.textContent =
                    "🔊";

            }

        };


    speech.onend =
        function () {

            isSpeaking =
                false;


            statusText.textContent =
                "Ready";


            voiceStatus.textContent =
                'Waiting for "Hey JARVIS"...';


            if (micButton) {

                micButton.textContent =
                    "🎤";

            }


            setTimeout(
                function () {

                    shouldKeepListening =
                        true;

                    startWakeListening();

                },
                700
            );

        };


    speech.onerror =
        function () {

            isSpeaking =
                false;


            shouldKeepListening =
                true;


            startWakeListening();

        };


    window.speechSynthesis.speak(
        speech
    );

}


// ==========================================
// ADD MESSAGE TO UI
// ==========================================

function addMessageToUI(
    message,
    sender
) {

    const messageElement =
        document.createElement(
            "div"
        );


    messageElement.classList.add(
        "message"
    );


    if (
        sender === "user"
    ) {

        messageElement.classList.add(
            "user-message"
        );

    } else {

        messageElement.classList.add(
            "bot-message"
        );

    }


    messageElement.textContent =
        message;


    chatMessages.appendChild(
        messageElement
    );


    scrollToBottom();

}


// ==========================================
// ADD MESSAGE
// UI + STORAGE
// ==========================================

function addMessage(
    message,
    sender
) {

    addMessageToUI(
        message,
        sender
    );


    saveMessageToConversation(
        message,
        sender
    );

}


// ==========================================
// SCROLL TO BOTTOM
// ==========================================

function scrollToBottom() {

    if (!chatMessages) {

        return;

    }


    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


// ==========================================
// TYPING INDICATOR
// ==========================================

function showTypingIndicator() {

    removeTypingIndicator();


    const typingElement =
        document.createElement(
            "div"
        );


    typingElement.id =
        "typingIndicator";


    typingElement.classList.add(
        "message",
        "bot-message"
    );


    typingElement.textContent =
        "JARVIS is thinking...";


    chatMessages.appendChild(
        typingElement
    );


    scrollToBottom();

}


// ==========================================
// REMOVE TYPING INDICATOR
// ==========================================

function removeTypingIndicator() {

    const typingIndicator =
        document.getElementById(
            "typingIndicator"
        );


    if (typingIndicator) {

        typingIndicator.remove();

    }

}


// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage(
    speakResponse = false
) {
    const message =
        userInput.value.trim();
    if (!message) {
        return;
    }
    if (isSendingMessage) {

        return;
    }
    ensureActiveConversation();
    addMessage(
        message,
        "user"
    );
    userInput.value =
        "";
    isSendingMessage =
        true;
    userInput.disabled =
        true;
    if (sendButton) {

        sendButton.disabled =
            true;
    }
    if (micButton) {

        micButton.disabled =
            true;
    }
    shouldKeepListening =
        false;
    isCommandMode =
        false;
    stopRecognition();
    showTypingIndicator();
    statusText.textContent =
        "Thinking";
    voiceStatus.textContent =
        "JARVIS is thinking...";
    try {
        const response =
            await fetch(
                CHAT_URL,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            message:
                                message,

                            conversation_id:
                                conversationId

                        })

                }
            );


        const data =
            await response.json();


        removeTypingIndicator();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "The server returned an error."
            );

        }


        if (!data.response) {

            throw new Error(
                "JARVIS returned an empty response."
            );

        }


        // Add AI response

        addMessage(
            data.response,
            "bot"
        );


        if (speakResponse) {

            speak(
                data.response
            );

        } else {

            statusText.textContent =
                "Ready";


            voiceStatus.textContent =
                'Waiting for "Hey JARVIS"...';


            setTimeout(
                function () {

                    shouldKeepListening =
                        true;

                    startWakeListening();

                },
                500
            );

        }

    } catch (error) {

        console.error(
            "Chat error:",
            error
        );


        removeTypingIndicator();


        addMessage(
            "Sorry, I couldn't connect to JARVIS. Make sure the Flask server is running.",
            "bot"
        );


        statusText.textContent =
            "Connection Error";


        voiceStatus.textContent =
            "Check the Flask server.";

    } finally {

        isSendingMessage =
            false;


        userInput.disabled =
            false;


        if (sendButton) {

            sendButton.disabled =
                false;

        }


        if (micButton) {

            micButton.disabled =
                false;

        }


        userInput.focus();

    }

}


// ==========================================
// START NEW CHAT
// ==========================================

async function startNewChat() {

    if (newChatButton) {

        newChatButton.disabled =
            true;

    }


    if (sidebarNewChatButton) {

        sidebarNewChatButton.disabled =
            true;

    }


    try {

        // Stop speech

        if (
            "speechSynthesis" in window
        ) {

            window.speechSynthesis.cancel();

        }


        isSpeaking =
            false;


        shouldKeepListening =
            false;


        isCommandMode =
            false;


        stopRecognition();


        // Clear backend context

        if (conversationId) {

            try {

                await fetch(
                    CLEAR_URL,
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                conversation_id:
                                    conversationId

                            })

                    }
                );

            } catch (error) {

                console.warn(
                    "Could not clear backend conversation."
                );

            }

        }


        // Create new conversation

        createConversation();


        // Clear UI

        chatMessages.innerHTML =
            "";


        const conversation =
            getCurrentConversation();


        conversation.messages.forEach(
            function (message) {

                addMessageToUI(
                    message.text,
                    message.sender
                );

            }
        );


        renderRecentChats();


        userInput.value =
            "";


        userInput.focus();


        statusText.textContent =
            "Ready";


        voiceStatus.textContent =
            'Waiting for "Hey JARVIS"...';


        // Close sidebar mobile

        if (sidebar) {

            sidebar.classList.remove(
                "open"
            );

        }


        setTimeout(
            function () {

                shouldKeepListening =
                    true;

                startWakeListening();

            },
            700
        );

    } catch (error) {

        console.error(
            "New chat error:",
            error
        );

    } finally {

        if (newChatButton) {

            newChatButton.disabled =
                false;

        }


        if (sidebarNewChatButton) {

            sidebarNewChatButton.disabled =
                false;

        }

    }

}


// ==========================================
// SEND BUTTON
// ==========================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        function () {

            sendMessage(false);

        }
    );

}


// ==========================================
// ENTER KEY
// ==========================================

if (userInput) {

    userInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage(false);

            }

        }
    );

}


// ==========================================
// HEADER NEW CHAT
// ==========================================

if (newChatButton) {

    newChatButton.addEventListener(
        "click",
        startNewChat
    );

}


// ==========================================
// SIDEBAR NEW CHAT
// ==========================================

if (sidebarNewChatButton) {

    sidebarNewChatButton.addEventListener(
        "click",
        startNewChat
    );

}


// ==========================================
// INITIAL STARTUP
// ==========================================

window.addEventListener(
    "load",
    function () {

        console.log(
            "================================"
        );

        console.log(
            "JARVIS FRONTEND STARTED"
        );

        console.log(
            "================================"
        );


        // Ensure conversation

        ensureActiveConversation();


        // Load active chat

        loadCurrentConversation();


        // Render recent chats

        renderRecentChats();


        console.log(
            "Conversation ID:",
            conversationId
        );

        console.log(
            "Flask API:",
            CHAT_URL
        );


        statusText.textContent =
            "Online";


        voiceStatus.textContent =
            'Waiting for "Hey JARVIS"...';


        // Start voice system

        setTimeout(
            function () {

                shouldKeepListening =
                    true;

                startWakeListening();

            },
            1000
        );

    }
);
