const chatBox = document.getElementById("chatBox");
const girlNameDisplay = document.getElementById("girlName");
const statusText = document.getElementById("statusText");
const userInput = document.getElementById("userInput");

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

function findMatch() {
    isHumanMatch = false;
    selectedGirl = null;
    if (currentRoomId) db.ref('chats/' + currentRoomId).off();
    db.ref('waiting_room').off();
    
    chatBox.innerHTML = "";
    girlNameDisplay.innerText = "matching...";
    statusText.innerText = "looking for someone...";
    clearTimeout(searchTimer);

    const waitingRef = db.ref('waiting_room');

    waitingRef.once('value', (snapshot) => {
        const data = snapshot.val();

        if (data && data.userId !== myUserId) {
            // Found someone! Join their room
            currentRoomId = data.roomId;
            waitingRef.remove().then(() => connectToHuman());
        } else {
            // I'll wait. Create a room
            currentRoomId = "room_" + Math.random().toString(36).substr(2, 5);
            waitingRef.set({ roomId: currentRoomId, userId: myUserId });

            // Watch for someone to join me
            waitingRef.on('value', (snap) => {
                if (!snap.exists() && !isHumanMatch && !selectedGirl) {
                    connectToHuman();
                }
            });

            // 10 second fallback to AI
            searchTimer = setTimeout(() => {
                waitingRef.off();
                waitingRef.remove();
                startAISession();
            }, 10000);
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
        if (msg.senderId !== myUserId) addMessage("Stranger: " + msg.text, "bot");
    });
}

function startAISession() {
    isHumanMatch = false;
    selectedGirl = personalities[Math.floor(Math.random() * personalities.length)];
    girlNameDisplay.innerText = selectedGirl.name;
    girlNameDisplay.style.color = selectedGirl.color;
    statusText.innerText = "matched with a stranger";
    addMessage(selectedGirl.greeting, "bot");
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    addMessage("You: " + text, "user");
    userInput.value = "";

    if (isHumanMatch) {
        db.ref('chats/' + currentRoomId).push({ senderId: myUserId, text: text });
    } else if (selectedGirl) {
        try {
            const res = await fetch("https://strangerchat-public.sujaykumar20192019.workers.dev/", {
                method: "POST",
                body: JSON.stringify({ message: text, persona: selectedGirl.id })
            });
            const data = await res.json();
            addMessage(data.reply, "bot");
        } catch (e) { addMessage("system: error", "bot"); }
    }
}

function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

window.onload = findMatch;
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
