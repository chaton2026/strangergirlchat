// 1. ELEMENTS
const chatBox = document.getElementById("chatBox");
const girlNameDisplay = document.getElementById("girlName");
const statusText = document.getElementById("statusText");
const userInput = document.getElementById("userInput");

// 2. FIREBASE CONFIG 
// IMPORTANT: Ensure this databaseURL matches your Firebase screenshot exactly!
const firebaseConfig = {
  apiKey: "AIzaSyB5vVD-CBhUz1J6uapnpbw4wJ8BL5MGF1I",
  authDomain: "strangerchat-1ae52.firebaseapp.com",
  databaseURL: "https://strangerchat-1ae52-default-rtdb.firebaseio.com",
  projectId: "strangerchat-1ae52",
  storageBucket: "strangerchat-1ae52.firebasestorage.app",
  messagingSenderId: "1070881075346",
  appId: "1:1070881075346:web:7d30960674893553aa764b"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

// 3. APP STATE
const personalities = [
    { id: "Aanya", name: "Aanya", greeting: "namaste... i'm aanya 😊", color: "#ff79c6" },
    { id: "Riya", name: "Riya", greeting: "yo! riya here 🎮🔥", color: "#bd93f9" },
    { id: "Zara", name: "Zara", greeting: "heyy, i'm zara! ✨", color: "#ffb86c" }
];

let selectedGirl = null;
let currentRoomId = null;
let isHumanMatch = false;
let searchTimer = null;
let myUserId = "u_" + Math.random().toString(36).substr(2, 5);

// 4. MATCHMAKING (The "Transaction" Method)
function findMatch() {
    isHumanMatch = false;
    selectedGirl = null;
    if (currentRoomId) db.ref('chats/' + currentRoomId).off();
    db.ref('waiting_room').off();
    
    chatBox.innerHTML = "";
    girlNameDisplay.innerText = "matching...";
    statusText.innerText = "looking for a real person...";
    clearTimeout(searchTimer);

    console.log("My User ID:", myUserId);
    const waitingRef = db.ref('waiting_room');

    // Attempt to claim the room or wait
    waitingRef.transaction((currentData) => {
        if (currentData === null) {
            // Database is empty, I'll be the first waiter
            return { roomId: "room_" + Math.random().toString(36).substr(2, 5), userId: myUserId };
        } else if (currentData.userId === myUserId) {
            return; // Already waiting
        } else {
            // Someone else is waiting! I'll take their room ID and clear the waiting room
            currentRoomId = currentData.roomId;
            return {}; // This deletes the waiting_room entry
        }
    }, (error, committed, snapshot) => {
        if (error) {
            console.error("Transaction failed:", error);
            statusText.innerText = "Connection error. Check Firebase Rules!";
        } else if (committed && snapshot.exists()) {
            // I AM THE WAITER (Room created, waiting for someone to delete it)
            currentRoomId = snapshot.val().roomId;
            console.log("Waiting in room:", currentRoomId);

            waitingRef.on('value', (snap) => {
                // If the record is gone, it means another user joined and deleted it!
                if (!snap.exists() && !isHumanMatch && !selectedGirl) {
                    console.log("Matched with a human!");
                    connectToHuman();
                }
            });

            // 10 second fallback to AI
            searchTimer = setTimeout(() => {
                waitingRef.off();
                waitingRef.remove();
                startAISession();
            }, 10000);
        } else if (committed && !snapshot.exists()) {
            // I AM THE JOINER (Matched with someone instantly)
            console.log("Joined an existing room:", currentRoomId);
            connectToHuman();
        }
    });
}

function connectToHuman() {
    isHumanMatch = true;
    clearTimeout(searchTimer);
    girlNameDisplay.innerText = "Stranger (Human)";
    girlNameDisplay.style.color = "#2ea043";
    statusText.innerText = "connected! say hi";
    
    db.ref('chats/' + currentRoomId).on('child_added', (snap) => {
        const msg = snap.val();
        if (msg.senderId !== myUserId) {
            addMessage("Stranger: " + msg.text, "bot");
        }
    });
}

// 5. AI FALLBACK
function startAISession() {
    isHumanMatch = false;
    selectedGirl = personalities[Math.floor(Math.random() * personalities.length)];
    girlNameDisplay.innerText = selectedGirl.name;
    girlNameDisplay.style.color = selectedGirl.color;
    statusText.innerText = "matched with a stranger (AI)";
    addMessage(selectedGirl.greeting, "bot");
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage("You: " + text, "user");
    userInput.value = "";

    if (isHumanMatch) {
        db.ref('chats/' + currentRoomId).push({
            senderId: myUserId,
            text: text,
            timestamp: Date.now()
        });
    } else if (selectedGirl) {
        try {
            // REPLACE THIS URL with your actual Cloudflare Worker URL
            const res = await fetch("https://strangerchat-public.sujaykumar20192019.workers.dev/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, persona: selectedGirl.id })
            });
            const data = await res.json();
            if (data.reply) addMessage(data.reply, "bot");
        } catch (e) {
            addMessage("system: zara is a bit shy... try again!", "bot");
        }
    }
}

// 6. UI HELPERS
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 7. INIT
window.onload = findMatch;
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
