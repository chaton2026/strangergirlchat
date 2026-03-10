// --- CONFIGURATION ---
const firebaseConfig = {
    databaseURL: "https://strangerchat-1ae52-default-rtdb.firebaseio.com/" 
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentRoomId = null;
let userId = "user_" + Math.floor(Math.random() * 100000);
let isAI = false;
let chatHistory = []; 

const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const statusText = document.getElementById('statusText');
const girlNameDisplay = document.getElementById('girlName');

// --- MATCHING LOGIC (Real Human + AI Fallback) ---
function findMatch() {
    if (currentRoomId) {
        db.ref('rooms/' + currentRoomId).off(); // Stop listening to old room
    }
    
    chatBox.innerHTML = '';
    chatHistory = [];
    statusText.innerText = "searching for someone...";
    girlNameDisplay.innerText = "Stranger";

    const waitingRef = db.ref('waiting_room');

    waitingRef.once('value', snapshot => {
        const users = snapshot.val();
        if (users) {
            // Found someone waiting! Connect to them
            const peerId = Object.keys(users)[0];
            currentRoomId = peerId + "_" + userId;
            waitingRef.child(peerId).remove(); // Remove them from waiting
            startChat(currentRoomId, "Real Stranger");
        } else {
            // No one waiting? Join waiting room and set AI timer
            waitingRef.child(userId).set(true);
            statusText.innerText = "waiting for a real person...";
            
            // If no human joins in 5 seconds, connect to AI
            setTimeout(() => {
                waitingRef.child(userId).once('value', snap => {
                    if (snap.exists()) {
                        waitingRef.child(userId).remove();
                        isAI = true;
                        const personas = ["Aanya", "Riya", "Zara"];
                        const persona = personas[Math.floor(Math.random() * personas.length)];
                        startChat("ai_" + userId, persona);
                    }
                });
            }, 5000);
        }
    });
}

function startChat(roomId, name) {
    currentRoomId = roomId;
    girlNameDisplay.innerText = name;
    statusText.innerText = "connected";
    
    if (!isAI) {
        // Listen for real-time messages from the other device
        db.ref('rooms/' + currentRoomId).on('child_added', snapshot => {
            const data = snapshot.val();
            if (data.sender !== userId) {
                addMessage(data.text, 'bot');
            }
        });
    } else {
        addMessage("hey..", 'bot');
    }
}

// --- SENDING LOGIC ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || !currentRoomId) return;

    addMessage(text, 'user');
    userInput.value = '';

    if (!isAI) {
        // Send to Firebase for the other real person
        db.ref('rooms/' + currentRoomId).push({
            sender: userId,
            text: text
        });
    } else {
        // Send to Cloudflare for the AI
        chatHistory.push({ role: "user", content: text });
        getAIReply(text);
    }
}

async function getAIReply(text) {
    try {
        const response = await fetch('https://stranger-chat-ai.sujaykumar20192019.workers.dev/', {
            method: 'POST',
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
