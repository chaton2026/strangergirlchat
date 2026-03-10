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

const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const statusText = document.getElementById('statusText');
const girlNameDisplay = document.getElementById('girlName');

// --- MATCHING LOGIC ---
function findMatch() {
    // 1. Cleanup old data
    if (currentRoomId) db.ref('rooms/' + currentRoomId).off();
    db.ref('waiting_room/' + userId).remove();
    
    chatBox.innerHTML = '';
    chatHistory = [];
    isAI = false;
    currentRoomId = null;
    statusText.innerText = "Searching for someone...";
    girlNameDisplay.innerText = "Stranger";

    const waitingRef = db.ref('waiting_room');

    // 2. Check for waiting users
    waitingRef.once('value', snapshot => {
        const users = snapshot.val();
        let peerId = null;

        if (users) {
            // Find a peer that isn't me
            peerId = Object.keys(users).find(id => id !== userId);
        }

        if (peerId) {
            // JOINER: Connect to the person waiting
            currentRoomId = "room_" + peerId; // Use the Peer's ID as room name
            waitingRef.child(peerId).remove(); 
            startChat(currentRoomId, "Real Human");
        } else {
            // HOSTER: Wait for someone to join me
            waitingRef.child(userId).set({ status: "waiting" });
            waitingRef.child(userId).onDisconnect().remove(); // Remove if tab closes
            
            statusText.innerText = "Waiting for a real person...";

            // Listen for someone to "claim" my room
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
    
    // Clear and set listener
    db.ref('rooms/' + roomId).on('child_added', snapshot => {
        const data = snapshot.val();
        if (data.sender !== userId) {
            addMessage(data.text, 'bot');
        }
    });

    if (isAI) addMessage("hey..", 'bot');
}

// --- SENDING LOGIC ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || !currentRoomId) return;

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
        getAIReply(text);
    }
}

async function getAIReply(text) {
    try {
        const response = await fetch('https://stranger-chat-ai.sujaykumar20192019.workers.dev/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                persona: girlNameDisplay.innerText,
                history: chatHistory.slice(-6)
            })
        });
        const data = await response.json();
        addMessage(data.reply, 'bot');
        chatHistory.push({ role: "assistant", content: data.reply });
    } catch (e) {
        addMessage("net slow...", 'bot');
    }
}

function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `msg ${side}`;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
findMatch();
