// Get elements
const chatBox = document.getElementById("chatBox");
const girlNameDisplay = document.getElementById("girlName");
const statusText = document.getElementById("statusText");

// Personalities
const personalities = [
    {
        name: "Aanya",
        prompt: "You are Aanya, a 21-year-old friendly Indian girl. You are sweet and respectful.",
        greeting: "Namaste! I'm Aanya. I was waiting to talk to you. 😊",
        color: "#ff79c6"
    },
    {
        name: "Riya",
        prompt: "You are Riya, a 22-year-old bold and sassy girl. You like to tease the user.",
        greeting: "Hey! I'm Riya. Hope you're ready for some fun! 😉",
        color: "#bd93f9"
    },
    {
        name: "Zara",
        prompt: "You are Zara, a 25-year-old mature and intelligent woman. You give wise advice.",
        greeting: "Hello. I am Zara. It's a pleasure to meet you.",
        color: "#8be9fd"
    }
];

let selectedGirl = null;

// Function to pick a random girl
function pickRandomGirl() {
    const randomIndex = Math.floor(Math.random() * personalities.length);
    selectedGirl = personalities[randomIndex];

    // Update Header
    if(girlNameDisplay) {
        girlNameDisplay.innerText = selectedGirl.name;
        girlNameDisplay.style.color = selectedGirl.color;
    }
    if(statusText) statusText.innerText = "Connected & Online";
    
    // Clear and Greet
    chatBox.innerHTML = "";
    addMessage(selectedGirl.greeting, "bot");
}

// Function to show messages
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
}

// Function to send message
async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();
    
    if (!message || !selectedGirl) return;

    // Show user message
    addMessage("You: " + message, "user");
    input.value = "";

    try {
        const response = await fetch("https://strangerchat-public.sujaykumar20192019.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: selectedGirl.prompt + "\nUser: " + message
            })
        });

        const data = await response.json();
        if (data.reply) {
            addMessage(data.reply, "bot");
        }
    } catch (error) {
        console.error("Error:", error);
        addMessage("System: Connection lost. Try again later.", "bot");
    }
}

// Trigger random girl when page loads
window.onload = () => {
    pickRandomGirl();
};

// Enter key support
document.getElementById("userInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});
