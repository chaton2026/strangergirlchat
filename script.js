// --- CONFIGURATION ---
const firebaseConfig = {
    databaseURL: "https://strangerchat-1ae52-default-rtdb.firebaseio.com/" 
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentPersona = "Aanya";
let chatHistory = []; // Stores memory for the Advanced AI

// --- UI ELEMENTS ---
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const statusText = document.getElementById('statusText');
const girlNameDisplay = document.getElementById('girlName');

// --- MATCHING LOGIC ---
function findMatch() {
    chatBox.innerHTML = '';
    chatHistory = []; // Clear AI memory for the new stranger
    statusText.innerText = "searching for a stranger...";
    
    // Randomly pick a persona
    const personas = ["Aanya", "Riya", "Zara"];
    currentPersona = personas[Math.floor(Math.random() * personas.length)];
    girlNameDisplay.innerText = currentPersona;

    // Simulate connection delay
    setTimeout(() => {
        statusText.innerText = "connected to " + currentPersona;
        addMessage("hey there..", 'bot');
    }, 1500);
}

// --- MESSAGE HANDLING ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Show User Message
    addMessage(text, 'user');
    userInput.value = '';

    // 2. Add to Memory
    chatHistory.push({ role: "user", content: text });

    // 3. Show "Typing..." Indicator
    const typingId = "typing-" + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'msg bot';
    typingDiv.id = typingId;
    typingDiv.innerText = '...';
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // 4. Call your Cloudflare Worker
        const response = await fetch('https://stranger-chat-ai.sujaykumar20192019.workers.dev/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                persona: currentPersona,
                history: chatHistory.slice(-6) // Sends last 6 messages for context
            })
        });

        const data = await response.json();
        
        // 5. Remove Typing Indicator and Show AI Reply
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();
        
        addMessage(data.reply, 'bot');

        // 6. Save AI reply to memory
        chatHistory.push({ role: "assistant", content: data.reply });

    } catch (error) {
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();
        addMessage("net is slow yaar... say again?", 'bot');
    }
}

function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `msg ${side}`;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Support for Enter key
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// Start the search when the page loads
findMatch();
