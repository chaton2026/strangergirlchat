// --- CONFIGURATION ---
const firebaseConfig = {
    databaseURL: "https://strangerchat-1ae52-default-rtdb.firebaseio.com/" 
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentRoomId = null;
let userId = "user_" + Math.floor(Math.random() * 1000000);
let isAI = false;
let chatHistory = []; 
let replyInProgress = false;

const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const statusText = document.getElementById('statusText');
const girlNameDisplay = document.getElementById('girlName');

// --- MATCHING LOGIC ---
function findMatch() {
    // Cleanup old room data before finding new match
    if (currentRoomId && !isAI) {
        db.ref('rooms/' + currentRoomId).remove(); 
        db.ref('rooms/' + currentRoomId).off();
    }
    db.ref('waiting_room/' + userId).remove();
    
    chatBox.innerHTML = '';
    chatHistory = [];
    isAI = false;
    currentRoomId = null;
    statusText.innerText = "Searching for someone...";
    girlNameDisplay.innerText = "Stranger";

    const waitingRef = db.ref('waiting_room');

    waitingRef.once('value', snapshot => {
        const users = snapshot.val();
        let peerId = null;

        if (users) {
            peerId = Object.keys(users).find(id => id !== userId);
        }

        if (peerId) {
            // JOINER MODE
            currentRoomId = "room_" + peerId;
            waitingRef.child(peerId).remove(); 
            startChat(currentRoomId, "Real Human");
        } else {
            // HOSTER MODE
            waitingRef.child(userId).set({ status: "waiting" });
            waitingRef.child(userId).onDisconnect().remove();
            
            statusText.innerText = "Waiting for a real person...";

            db.ref('rooms/room_' + userId).on('child_added', snap => {
                if (!currentRoomId) {
                    currentRoomId = "room_" + userId;
                    startChat(currentRoomId, "Real Human");
                }
            });

            // AI Fallback after 8 seconds
            setTimeout(() => {
                if (!currentRoomId) {
                    waitingRef.child(userId).remove();
                    db.ref('rooms/room_' + userId).off();
                    isAI = true;
                    const personas = ["Aanya", "Riya", "Zara"];
                    startChat("ai_" + userId, personas[Math.floor(Math.random() * 3)]);
                }
            }, 8000);
        }
    });
}

function startChat(roomId, name) {
    currentRoomId = roomId;
    girlNameDisplay.innerText = name;
    statusText.innerText = "Connected!";
    
    // Listen for new messages
    db.ref('rooms/' + roomId).on('child_added', snapshot => {
        const data = snapshot.val();
        if (data.sender !== userId) {
            addMessage(data.text, 'bot');
        }
    });

    // Listen for the other person leaving
    db.ref('rooms/' + roomId).on('value', snapshot => {
        if (snapshot.val() === null && currentRoomId === roomId && !isAI) {
            addMessage("Stranger has left the chat.", 'bot');
            statusText.innerText = "Disconnected";
            currentRoomId = null;
        }
    });

    if (isAI) addMessage("hey..", 'bot');
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || !currentRoomId || (isAI && replyInProgress)) return;

    addMessage(text, 'user');
    userInput.value = '';

    if (!isAI) {
        db.ref('rooms/' + currentRoomId).push({
            sender: userId,
            text: text,
            timestamp: Date.now()
        });
    } else {
        chatHistory.push({ role: "user", content: text });
        await getAIReply(text);
    }
}

async function getAIReply(text) {
    replyInProgress = true;
    userInput.disabled = true;
    const typing = addMessage("typing…", 'bot typing');

    try {
        // Primary: external worker that's publicly reachable. Falls back locally if reply is unhelpful.
        const API_URL = 'https://stranger-chat-ai.sujaykumar20192019.workers.dev/';

        // Use a short timeout and one retry to avoid long hangs on mobile.
        const fetchWithTimeout = (url, opts = {}, timeout = 8000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
        };

        let response;
        try {
            response = await fetchWithTimeout(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                persona: girlNameDisplay.innerText,
                history: chatHistory.slice(-12),
                instruction: "Reply like a warm, emotionally intelligent real friend. Remember details from the conversation, answer the user's actual question, ask one natural follow-up when appropriate, and avoid generic phrases, repetition, roleplay disclaimers, and one-word replies. Keep it to 1-3 short paragraphs."
            })
            }, 8000);
        } catch (err) {
            // Retry once quickly before giving up
            try {
                response = await fetchWithTimeout(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: text,
                        persona: girlNameDisplay.innerText,
                        history: chatHistory.slice(-12),
                        instruction: "Reply naturally and meaningfully like a real friend. Use the conversation context and ask one relevant follow-up."
                    })
                }, 8000);
            } catch (err2) {
                throw err2;
            }
        }
        if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
        const data = await response.json();
        // If worker returns the known bad placeholder, produce a nicer fallback reply
        const rawReply = (data && data.reply) ? String(data.reply) : '';
        if (/phone|hang/i.test(rawReply) || rawReply.trim().length < 3) {
            const fallback = buildLocalReply(text, girlNameDisplay.innerText, chatHistory);
            await naturalPause(text, fallback);
            typing.remove();
            addMessage(fallback, 'bot');
            chatHistory.push({ role: "assistant", content: fallback });
        } else {
            await naturalPause(text, rawReply);
            typing.remove();
            addMessage(rawReply, 'bot');
            chatHistory.push({ role: "assistant", content: rawReply });
        }
    } catch (e) {
        // Local fallback to avoid showing 'phone hanging'
        const fallback = buildLocalReply(text, girlNameDisplay.innerText, chatHistory);
        await naturalPause(text, fallback);
        typing.remove();
        addMessage(fallback, 'bot');
        chatHistory.push({ role: "assistant", content: fallback });
    } finally {
        replyInProgress = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

function naturalPause(userText, reply) {
    // Prevent instant robotic replies without making the chat feel slow.
    const delay = Math.min(1800, Math.max(650, 350 + (String(reply).length * 12) + (userText.length * 4)));
    return new Promise(resolve => setTimeout(resolve, delay));
}

function buildLocalReply(message, persona, history = []) {
    const m = (message || '').toLowerCase();
    if (!m) return `Hey, I'm here — what do you want to talk about?`;

    if (/^(hi|hello|hey|hiya)\b/.test(m)) {
        return `Hey! I'm ${persona} 🙂 I'm glad you came by. What has your day been like?`;
    }

    if (/how are you|how's it going|what are you doing/.test(m)) {
        return `I'm doing well — a little curious about you, honestly. What are you in the mood to talk about?`;
    }

    if (/sad|lonely|upset|bad day|stressed|tired/.test(m)) {
        return `I'm sorry you're feeling that way. You don't have to pretend here — do you want to tell me what happened, or would you rather take your mind off it?`;
    }

    if (/thank|thanks/.test(m)) {
        return `Anytime 🙂 I like talking with you. What else is on your mind?`;
    }

    if (/hobby|music|movie|game|book|travel/.test(m)) {
        return `That sounds interesting. I like conversations that reveal the little things about someone — what part of that do you enjoy most?`;
    }

    if (/\?$/.test(m)) {
        return `That's a thoughtful question. My first instinct is to say yes, but it depends on the details — what made you ask?`;
    }

    const previousTopic = history
        .filter(item => item.role === 'user' && item.content !== message)
        .slice(-1)[0]?.content;
    if (previousTopic) {
        return `I get what you mean about “${message}”. Earlier you mentioned “${previousTopic}” too — are those connected?`;
    }

    return `I hear you. “${message}” sounds like it matters to you — tell me the part you haven't said yet.`;
}

function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `msg ${side}`;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
findMatch();
