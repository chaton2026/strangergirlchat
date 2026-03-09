// 1. DEFINE ELEMENTS
const chatBox = document.getElementById("chatBox");
const girlNameDisplay = document.getElementById("girlName");
const statusText = document.getElementById("statusText");
const userInput = document.getElementById("userInput");

// 2. FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyB5vVD-CBhUz1J6uapnpbw4wJ8BL5MGF1I",
  authDomain: "strangerchat-1ae52.firebaseapp.com",
  databaseURL: "https://strangerchat-1ae52-default-rtdb.firebaseio.com",
  projectId: "strangerchat-1ae52",
  storageBucket: "strangerchat-1ae52.firebasestorage.app",
  messagingSenderId: "1070881075346",
  appId: "1:1070881075346:web:7d30960674893553aa764b",
  measurementId: "G-WHR7GL9JE0"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

// 3. APP STATE
const personalities = [
    { id: "Aanya", name: "Aanya", greeting: "Namaste! I'm Aanya. 😊", color: "#ff79c6" },
    { id: "Riya", name: "Riya", greeting: "Hey! I'm Riya. 😉", color: "#bd93f9" },
    { id: "Zara", name: "Zara", greeting: "Hey there! I'm Zara. ✨", color: "#ffb86c" }
];

let selectedGirl = null;
let currentRoomId = null;
let isHumanMatch = false;
let searchTimer = null;
let myUserId = "user_" + Math.random().toString(36).substr(2, 9);

// 4. MATCHMAKING LOGIC
function findMatch() {
    // Reset State
    isHumanMatch = false;
    selectedGirl = null;
    if (currentRoomId) db.ref('chats/' + currentRoomId).off();
    db.ref('waiting_room').off();
    
    chatBox.innerHTML = "";
    girlNameDisplay.innerText = "Matching...";
    girlNameDisplay.style.color = "#ffffff";
    statusText.innerText = "Searching for a real person...";
    clearTimeout(searchTimer);

    const waitingRef = db.ref('waiting_room');

    waitingRef.once('value', (snapshot) => {
        const waitingData = snapshot.val();

        // If someone else is waiting, connect to them
        if (waitingData && waitingData.userId !== myUserId) {
            currentRoomId = waitingData.roomId;
            waitingRef.remove().then(() => connectToHuman());
        } 
        else {
            // Otherwise, I become the waiter
            currentRoomId = "room_" + Math.random().toString(36).substr(2, 9);
            waitingRef.set({ roomId: currentRoomId, userId: myUserId });

            // Listen for someone to "claim" the room (by deleting the waiting record)
            waitingRef.on('value', (snap) => {
                if (!snap.exists() && !isHumanMatch && !selectedGirl) {
                    connectToHuman();
                }
            });

            // 10 Second Fallback to AI
            searchTimer = setTimeout(() => {
                waitingRef.off();
                waitingRef.once('value', (finalSnap) => {
                    if (finalSnap.exists() && finalSnap.val().userId === myUserId) {
                        waitingRef.remove();
                        startAISession();
                    }
                });
            }, 10000);
        }
    });
}

function connectToHuman() {
    isHumanMatch = true;
    clearTimeout(searchTimer);
    girlNameDisplay.innerText = "Stranger (Human)";
    girlNameDisplay.style.color = "#2ea043";
    statusText.innerText = "Connected! Say hello.";
    
    const roomRef = db.ref('chats/' + currentRoomId);
    roomRef.off(); 
    roomRef.on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg.senderId !== myUserId) {
            addMessage("Stranger: " + msg.text, "bot");
        }
    });
}

// 5. AI SESSION LOGIC
function startAISession() {
    isHumanMatch = false;
    selectedGirl = personalities[Math.floor(Math.random() * personalities.length)];
    girlNameDisplay.innerText = selectedGirl.name;
    girlNameDisplay.style.color = selectedGirl.color;
    statusText.innerText = "Matched with a stranger (AI)";
    addMessage(selectedGirl.greeting, "bot");
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage("You: " + message, "user");
    userInput.value = "";

    if (isHumanMatch) {
        db.ref('chats/' + currentRoomId).push({
            senderId: myUserId,
            text: message,
            timestamp: Date.now()
        });
    } else if (selectedGirl) {
        sendToAI(message);
    }
}

async function sendToAI(userMsg) {
    try {
        // Replace with your actual Cloudflare Worker URL
        const response = await fetch("https://strangerchat-public.sujaykumar20192019.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: userMsg, 
                persona: selectedGirl.id 
            })
        });
        const data = await response.json();
        if (data.reply) {
            addMessage(data.reply, "bot");
        }
    } catch (e) {
        addMessage("System: Connection lost. Try again later.", "bot");
    }
}

// 6. UI HELPERS
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 7. EVENT LISTENERS
window.onload = findMatch;
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// "Next" button logic (if you have one)
function nextChat() {
    findMatch();
}
