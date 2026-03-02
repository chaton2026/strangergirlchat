/**
 * 1. Initialize HTML Elements & Firebase
 */
// Fix for ReferenceError: Define these before calling findMatch()
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

// Initialize Firebase only if not already initialized
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
    // Reset state and listeners to prevent double messages and UI glitches
    isHumanMatch = false;
    selectedGirl = null;
    
    // Clear old chat room listeners
    if (currentRoomId) {
        db.ref('chats/' + currentRoomId).off();
    }
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
            // CASE 1: FOUND A HUMAN ALREADY WAITING
            currentRoomId = waitingData.roomId;
            waitingRef.remove().then(() => {
                connectToHuman();
            });
        } else {
            // CASE 2: NO ONE IN LOBBY - WE BECOME THE WAITER
            currentRoomId = "room_" + Math.random().toString(36).substr(2, 9);
            waitingRef.set({ roomId: currentRoomId, userId: myUserId });

            // Listen if someone else "takes" our room (deletes the entry)
            waitingRef.on('value', (snap) => {
                if (!snap.exists() && !isHumanMatch && !selectedGirl) {
                    connectToHuman();
                }
            });

            // START 10-SECOND TIMER FOR AI FALLBACK
            searchTimer = setTimeout(() => {
                if (!isHumanMatch) {
                    waitingRef.off(); // Stop listening for humans
                    waitingRef.once('value', (finalSnap) => {
                        // Double check we weren't matched in the last millisecond
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
    
    // Ensure fresh listener for messages
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
        const response = await fetch("https://strangerchat-public.sujaykumar201
