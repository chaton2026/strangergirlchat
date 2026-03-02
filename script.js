/**
 * 1. Initialize HTML Elements & Firebase
 */
const chatBox = document.getElementById("chatBox");
const girlNameDisplay = document.getElementById("girlName");
const statusText = document.getElementById("statusText");

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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// AI Personas Bank
const personalities = [
    { name: "Aanya", prompt: "You are Aanya, a 21-year-old friendly Indian girl. You are sweet and respectful.", greeting: "Namaste! I'm Aanya. I was waiting to talk to you. 😊", color: "#ff79c6" },
    { name: "Riya", prompt: "You are Riya, a 22-year-old bold and sassy girl. You like to tease.", greeting: "Hey! I'm Riya. Ready for some fun? 😉", color: "#bd93f9" },
    { name: "Zara", prompt: "You are Zara, a 25-year-old mature and intelligent woman.", greeting: "Hello. I am Zara. It's a pleasure to meet you.", color: "#8be9fd" }
];

let selectedGirl = null;
let currentRoomId = null;
let isHumanMatch = false;
let searchTimer = null;
let myUserId = "user_" + Math.random().toString(36).substr(2, 9);

/**
 * 2. Hybrid Matchmaking Logic
 */
function findMatch() {
    // Reset state and listeners to prevent double messages
    isHumanMatch = false;
    selectedGirl = null;
    if (currentRoomId) db.ref('chats/' + currentRoomId).off();
    db.ref('waiting_room').off(); 
    
    currentRoomId = null;
    chatBox.innerHTML = "";
    girlNameDisplay.innerText = "Matching...";
    girlNameDisplay.style.color = "#ffffff";
    statusText.innerText = "Searching for a real person...";
    
    clearTimeout(searchTimer);

    const waitingRef = db.ref('waiting_room');

    waitingRef.once('value', (snapshot) => {
        const waitingData = snapshot.val();

        if (waitingData && waitingData.userId !== myUserId) {
            // CASE 1: FOUND A HUMAN
            currentRoomId = waitingData.roomId;
            waitingRef.remove().then(() => {
                connectToHuman();
            });
        } else {
            // CASE 2: WE BECOME THE WAITER
            currentRoomId = "room_" + Math.random().toString(36).substr(2, 9);
            waitingRef.set({ roomId: currentRoomId, userId: myUserId });

            waitingRef.on('value', (snap) => {
                if (!snap.exists() && !isHumanMatch && !selectedGirl) {
                    connectToHuman();
                }
            });

            // 10-SECOND TIMER FOR AI FALLBACK
            searchTimer = setTimeout(() => {
                if (!isHumanMatch) {
                    waitingRef.off();
                    waitingRef.once('value', (finalSnap) => {
                        if (finalSnap.exists() && finalSnap.val().userId === myUserId) {
                            waitingRef.remove();
                            startAISession();
                        }
                    });
                }
            }, 10000); 
        }
    });
}

/**
 * 3. Human Connection Logic
 */
function connectToHuman() {
    isHumanMatch = true;
    clearTimeout(searchTimer);
    db.ref('waiting_room').off(); 

    girlNameDisplay.innerText = "Stranger (Human)";
    girlNameDisplay.style.color = "#2ea043";
    statusText.innerText = "Connected! Say hello.";
    
    // Kill old listeners before starting new one
    db.ref('chats/' + currentRoomId).off(); 

    db.ref('chats/' + currentRoomId).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg.senderId !== myUserId) {
            addMessage("Stranger: " + msg.text, "bot");
        }
    });
}

/**
 * 4. AI Fallback Logic
 */
function startAISession() {
    isHumanMatch = false;
    const randomIndex = Math.floor(Math.random() * personalities.length);
    selectedGirl = personalities[randomIndex];

    girlNameDisplay.innerText = selectedGirl.name;
    girlNameDisplay.style.color = selectedGirl.color;
    statusText.innerText = "Matched with a stranger";
    
    addMessage(selectedGirl.greeting, "bot");
}

/**
 * 5. Sending Messages
 */
async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();
    if (!message) return;

    addMessage("You: " + message, "user");
    input.value = "";

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
        const response = await fetch("https://strangerchat-public.sujaykumar20192019.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: selectedGirl.prompt + "\nUser: " + userMsg })
        });
        const data = await response.json();
        if (data.reply) addMessage(data.reply, "bot");
    } catch (e) {
        addMessage("System: AI is currently offline.", "bot");
    }
}

function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
}

window.onload = findMatch;

document.getElementById("userInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});
