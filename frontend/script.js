const userInput =
    document.getElementById("userInput");

const sendButton =
    document.getElementById("sendButton");

const chatMessages =
    document.getElementById("chatMessages");

const newChatButton =
    document.getElementById("newChatButton");

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
// JARVIS BACKEND API
// ==========================================

const API_URL =
    "https://jarvis-ai-23.vercel.app";

const CHAT_URL =
    `${API_URL}/api/chat`;

const CLEAR_URL =
    `${API_URL}/api/clear`;

const HEALTH_URL =
    `${API_URL}/api/health`;


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
// CREATE UNIQUE ID
// ==========================================

function createId() {

    if (

        window.crypto &&

        typeof window.crypto.randomUUID ===
        "function"

    ) {

        return window.crypto.randomUUID();

    }

    return (

        Date.now()
            .toString(36)

        +

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

    return firstUserMessage.text || "";

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

        cleanMessage.length <=
        maxLength

    ) {

        return cleanMessage;

    }

    return (

        cleanMessage.substring(
            0,
            maxLength
        )

        +

        "..."

    );

}


// ==========================================
// GET CONVERSATION TITLE
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

                sender:
                    "bot",

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

        return createConversation();

    }

    const conversation =
        getCurrentConversation();

    if (!conversation) {

        return createConversation();

    }

    return conversation;

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
// SAVE MESSAGE TO CONVERSATION
// ==========================================

function saveMessageToConversation(

    message,

    sender

) {

    const conversation =
        ensureActiveConversation();

    if (!conversation) {

        return;

    }

    conversation.messages.push({

        sender:
            sender,

        text:
            message,

        timestamp:
            Date.now()

    });

    conversation.updatedAt =
        Date.now();

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


    // ======================================
    // STOP SPEECH
    // ======================================

    if (

        "speechSynthesis" in window

    ) {

        window.speechSynthesis.cancel();

    }

    isSpeaking =
        false;


    // ======================================
    // STOP RECOGNITION
    // ======================================

    shouldKeepListening =
        false;

    isCommandMode =
        false;

    stopRecognition();


    // ======================================
    // SET ACTIVE CONVERSATION
    // ======================================

    conversationId =
        conversation.id;

    localStorage.setItem(

        ACTIVE_CONVERSATION_KEY,

        conversationId

    );


    // ======================================
    // CLEAR UI
    // ======================================

    if (chatMessages) {

        chatMessages.innerHTML =
            "";

    }


    // ======================================
    // RESTORE MESSAGES
    // ======================================

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


    // ======================================
    // CLOSE MOBILE SIDEBAR
    // ======================================

    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }


    // ======================================
    // RESTART VOICE
    // ======================================

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

async function deleteConversation(id) {

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


    // ======================================
    // CLEAR BACKEND CONVERSATION
    // ======================================

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
                            id

                    })

            }

        );

    } catch (error) {

        console.warn(

            "Could not clear backend conversation:",

            error

        );

    }


    // ======================================
    // REMOVE LOCAL CONVERSATION
    // ======================================

    conversations =
        conversations.filter(

            function (chat) {

                return chat.id !== id;

            }

        );

    saveConversations();


    // ======================================
    // ACTIVE CONVERSATION DELETED
    // ======================================

    if (id === conversationId) {

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

    if (chatMessages) {

        chatMessages.innerHTML =
            "";

    }

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
// BACKEND HEALTH CHECK
// ==========================================

async function checkBackend() {

    try {

        console.log(
            "Checking backend:",
            HEALTH_URL
        );

        const response =
            await fetch(
                HEALTH_URL
            );

        if (!response.ok) {

            throw new Error(

                `Backend returned ${response.status}`

            );

        }

        const data =
            await response.json();

        console.log(

            "JARVIS backend connected:",

            data

        );

        if (statusText) {

            statusText.textContent =
                "Online";

        }

        return true;

    } catch (error) {

        console.error(

            "Backend connection failed:",

            error

        );

        if (statusText) {

            statusText.textContent =
                "Backend Offline";

        }

        if (voiceStatus) {

            voiceStatus.textContent =
                "Cannot connect to JARVIS server.";

        }

        return false;

    }

}


// ==========================================
// SIDEBAR TOGGLE
// ==========================================

if (menuButton) {

    menuButton.addEventListener(

        "click",

        function (event) {

            event.stopPropagation();

            if (sidebar) {

                sidebar.classList.toggle(
                    "open"
                );

            }

        }

    );

}


// ==========================================
// CLICK OUTSIDE SIDEBAR
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

                if (statusText) {

                    statusText.textContent =
                        "Listening";

                }

                if (voiceStatus) {

                    voiceStatus.textContent =
                        "JARVIS is listening...";

                }

            } else {

                if (micButton) {

                    micButton.textContent =
                        "🎤";

                }

                if (statusText) {

                    statusText.textContent =
                        "Ready";

                }

                if (voiceStatus) {

                    voiceStatus.textContent =
                        'Waiting for "Hey JARVIS"...';

                }

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


            // ==================================
            // WAKE MODE
            // ==================================

            if (!isCommandMode) {

                const detectedWakeWord =
                    WAKE_WORDS.some(

                        function (wakeWord) {

                            return lowerTranscript.includes(
                                wakeWord
                            );

                        }

                    );

                if (detectedWakeWord) {

                    activateCommandMode(
                        transcript
                    );

                }

                return;

            }


            // ==================================
            // COMMAND MODE
            // ==================================

            const command =
                removeWakeWords(
                    transcript
                );

            if (!command) {

                if (voiceStatus) {

                    voiceStatus.textContent =
                        "I am listening...";

                }

                return;

            }

            if (userInput) {

                userInput.value =
                    command;

            }

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

                if (statusText) {

                    statusText.textContent =
                        "Microphone blocked";

                }

                if (voiceStatus) {

                    voiceStatus.textContent =
                        "Allow microphone permission.";

                }

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


            // ==================================
            // COMMAND MODE
            // ==================================

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


            // ==================================
            // WAKE MODE
            // ==================================

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

    if (micButton) {

        micButton.disabled =
            true;

        micButton.title =
            "Speech recognition is not supported in this browser.";

    }

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

        console.warn(

            "Could not start wake listening:",

            error

        );

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

        console.warn(

            "Could not start command listening:",

            error

        );

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

    if (statusText) {

        statusText.textContent =
            "Activated";

    }

    if (voiceStatus) {

        voiceStatus.textContent =
            "JARVIS activated. Listening...";

    }

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

    if (command) {

        if (userInput) {

            userInput.value =
                command;

        }

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


            // ==================================
            // STOP LISTENING
            // ==================================

            if (isListening) {

                shouldKeepListening =
                    false;

                isCommandMode =
                    false;

                stopRecognition();

                if (statusText) {

                    statusText.textContent =
                        "Online";

                }

                if (voiceStatus) {

                    voiceStatus.textContent =
                        'Say "Hey JARVIS"';

                }

                micButton.textContent =
                    "🎤";

                return;

            }


            // ==================================
            // START LISTENING
            // ==================================

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

            if (statusText) {

                statusText.textContent =
                    "Speaking";

            }

            if (voiceStatus) {

                voiceStatus.textContent =
                    "JARVIS is speaking...";

            }

            if (micButton) {

                micButton.textContent =
                    "🔊";

            }

        };


    speech.onend =
        function () {

            isSpeaking =
                false;

            if (statusText) {

                statusText.textContent =
                    "Ready";

            }

            if (voiceStatus) {

                voiceStatus.textContent =
                    'Waiting for "Hey JARVIS"...';

            }

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
        function (error) {

            console.error(

                "Speech synthesis error:",

                error

            );

            isSpeaking =
                false;

            shouldKeepListening =
                true;

            if (micButton) {

                micButton.textContent =
                    "🎤";

            }

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

    if (!chatMessages) {

        return;

    }

    const messageElement =
        document.createElement(
            "div"
        );

    messageElement.classList.add(
        "message"
    );

    if (sender === "user") {

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
// SHOW TYPING INDICATOR
// ==========================================

function showTypingIndicator() {

    removeTypingIndicator();

    if (!chatMessages) {

        return;

    }

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

    if (!userInput) {

        return;

    }

    const message =
        userInput.value.trim();

    if (!message) {

        return;

    }

    if (isSendingMessage) {

        return;

    }


    // ======================================
    // ENSURE CONVERSATION
    // ======================================

    ensureActiveConversation();


    // ======================================
    // SAVE USER MESSAGE
    // ======================================

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

    if (statusText) {

        statusText.textContent =
            "Thinking";

    }

    if (voiceStatus) {

        voiceStatus.textContent =
            "JARVIS is thinking...";

    }


    try {

        console.log(
            "Sending request to:",
            CHAT_URL
        );

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


        let data;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(

                `Server returned invalid JSON. Status: ${response.status}`

            );

        }


        removeTypingIndicator();


        if (!response.ok) {

            throw new Error(

                data.error ||

                `Server error: ${response.status}`

            );

        }


        if (!data.response) {

            throw new Error(

                "JARVIS returned an empty response."

            );

        }


        // ==================================
        // ADD AI RESPONSE
        // ==================================

        addMessage(

            data.response,

            "bot"

        );


        // ==================================
        // VOICE RESPONSE
        // ==================================

        if (speakResponse) {

            speak(
                data.response
            );

        } else {

            if (statusText) {

                statusText.textContent =
                    "Ready";

            }

            if (voiceStatus) {

                voiceStatus.textContent =
                    'Waiting for "Hey JARVIS"...';

            }

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


        let errorMessage =
            "Sorry, I couldn't connect to JARVIS.";

        if (

            error.message.includes(
                "404"
            )

        ) {

            errorMessage =
                "JARVIS API route was not found. Check the Vercel deployment.";

        } else if (

            error.message.includes(
                "500"
            )

        ) {

            errorMessage =
                "JARVIS server encountered an internal error.";

        }


        addMessage(

            errorMessage,

            "bot"

        );


        if (statusText) {

            statusText.textContent =
                "Connection Error";

        }

        if (voiceStatus) {

            voiceStatus.textContent =
                "Check the JARVIS server.";

        }

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


        // ==================================
        // STOP SPEECH
        // ==================================

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


        // ==================================
        // CLEAR BACKEND CONVERSATION
        // ==================================

        if (conversationId) {

            try {

                const clearResponse =
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

                if (!clearResponse.ok) {

                    console.warn(

                        "Backend clear returned:",

                        clearResponse.status

                    );

                }

            } catch (error) {

                console.warn(

                    "Could not clear backend conversation:",

                    error

                );

            }

        }


        // ==================================
        // CREATE NEW CONVERSATION
        // ==================================

        createConversation();


        // ==================================
        // CLEAR UI
        // ==================================

        if (chatMessages) {

            chatMessages.innerHTML =
                "";

        }

        const conversation =
            getCurrentConversation();

        if (conversation) {

            conversation.messages.forEach(

                function (message) {

                    addMessageToUI(

                        message.text,

                        message.sender

                    );

                }

            );

        }


        renderRecentChats();


        if (userInput) {

            userInput.value =
                "";

            userInput.focus();

        }


        if (statusText) {

            statusText.textContent =
                "Ready";

        }

        if (voiceStatus) {

            voiceStatus.textContent =
                'Waiting for "Hey JARVIS"...';

        }


        // ==================================
        // CLOSE MOBILE SIDEBAR
        // ==================================

        if (sidebar) {

            sidebar.classList.remove(
                "open"
            );

        }


        // ==================================
        // RESTART VOICE
        // ==================================

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

    async function () {

        console.log(

            "================================"

        );

        console.log(

            "JARVIS FRONTEND STARTED"

        );

        console.log(

            "================================"

        );


        // ==================================
        // LOG API URLs
        // ==================================

        console.log(

            "API URL:",

            API_URL

        );

        console.log(

            "Health URL:",

            HEALTH_URL

        );

        console.log(

            "Chat URL:",

            CHAT_URL

        );

        console.log(

            "Clear URL:",

            CLEAR_URL

        );


        // ==================================
        // CHECK BACKEND
        // ==================================

        await checkBackend();


        // ==================================
        // ENSURE CONVERSATION
        // ==================================

        ensureActiveConversation();


        // ==================================
        // LOAD ACTIVE CHAT
        // ==================================

        loadCurrentConversation();


        // ==================================
        // RENDER RECENT CHATS
        // ==================================

        renderRecentChats();


        console.log(

            "Conversation ID:",

            conversationId

        );


        // ==================================
        // VOICE STATUS
        // ==================================

        if (voiceStatus) {

            voiceStatus.textContent =
                'Waiting for "Hey JARVIS"...';

        }


        // ==================================
        // START VOICE SYSTEM
        // ==================================

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