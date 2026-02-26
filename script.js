const chatBox = document.getElementById("chatBox");
const girlNameDisplay = document.getElementById("girlName");
const statusText = document.getElementById("statusText");

// 1. The Personality Bank - All possible girls the system can pick
const personalities = [
    {
        name: "Aanya",
        prompt: "You are Aanya, a 21-year-old friendly Indian girl. You are sweet, playful, and respectful. Use a little Hinglish.",
        greeting: "Namaste! I'm Aanya. I was waiting to talk to someone nice like you. 😊",
        color: "#ff79c6" // Pink
    },
    {
        name: "Riya",
        prompt: "You are Riya, a 22-year-old bold, sassy, and sarcastic girl. You are energetic and like to tease the user.",
        greeting: "Hey! I'm Riya. Hope you can keep up with me! 😉",
        color: "#bd93f9" // Purple
    },
    {
        name: "Zara",
        prompt: "You are Zara, a 25-year-old mature and highly intelligent woman. You give wise advice and are very calm.",
        greeting: "Hello. I am Zara. It's a pleasure to be matched with you. What's on your mind?",
        color: "#8be9fd" // Cyan/Blue
    }
];

let selectedGirl = null;

/**
 * Picks a random girl from the bank and resets the chat
 */
function pickRandomGirl() {
    // Select a random object from the personalities array
    const randomIndex = Math.floor(Math.random() * personalities.length);
    selectedGirl = personalities[randomIndex];

    // Update the UI with the new girl's details
    girlNameDisplay.innerText = selectedGirl.name;
    girlNameDisplay.style.color = selectedGirl.color;
    statusText.innerText = "You are now chatting with a stranger";
    
    // Clear the chat and show the greeting
    chatBox.innerHTML = "";
    addMessage(selectedGirl.greeting, "bot");
}

/**
 * Adds a message bubble and scrolls smoothly to the bottom
 */
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    
    // If it's the bot, we can color the text based on the girl's theme
    if (sender === "bot") {
        div.style.borderLeft = `3px solid ${selectedGirl.color}`;
    }
    
    div.innerText = text;
    chatBox.appendChild(div);
    
    // Auto-scroll to the newest message
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: 'smooth'
    });
}

/**
 * Sends your message to the Cloudflare Worker
 */
async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();
    
    if (!message || !selectedGirl) return;
