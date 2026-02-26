const chatBox = document.getElementById("chatBox");
const charSelect = document.getElementById("charSelect");
const statusText = document.getElementById("statusText");

// 1. The Personality Bank - Define how each girl behaves
const personalities = {
    aanya: {
        prompt: "You are Aanya, a 21-year-old friendly Indian girl. You are sweet, playful, and respectful. Use a little Hinglish.",
        greeting: "Aanya: Namaste! I'm Aanya. I was waiting to talk to you. 😊"
    },
    riya: {
        prompt: "You are Riya, a 22-year-old bold, sassy, and sarcastic girl. You are energetic and like to tease the user.",
        greeting: "Riya: Hey there! I'm Riya. Hope you're ready for some fun! 😉"
    },
    zara: {
        prompt: "You are Zara, a 25-year-old mature and highly intelligent woman. You give wise advice and are very calm.",
        greeting: "Zara: Hello. I am Zara. It is a pleasure to meet you. What is on your mind?"
    }
};

// Start with Aanya by default
let currentPersona = personalities.aanya.prompt;

/**
 * Changes the AI personality when you pick from the dropdown
 */
function changeCharacter() {
    const selected = charSelect.value;
    currentPersona = personalities[selected].prompt;
    
    // Update the UI status and clear the chat for the new person
    statusText.innerText = selected.charAt(0).toUpperCase() + selected.slice(1) + " is online";
    chatBox.innerHTML = ""; 
    addMessage(personalities[selected].greeting, "bot");
}

/**
 * Adds a message bubble and scrolls smoothly
 */
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerText = text;
    chatBox.appendChild(div);
    
    // Auto-scroll to the bottom
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: 'smooth'
    });
}

/**
 * Sends message to your Cloudflare Worker
 */
async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();
    
    if (!message) return;

    addMessage("You: " + message, "user");
    input.value = "";

    // Add typing indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "msg bot";
    typingIndicator.id = "typing";
    typingIndicator.innerText = "Typing...";
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const workerURL = "https://strangerchat-public.sujaykumar20192019.workers.dev/";

        const response = await fetch(workerURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                // This sends the SPECIFIC girl's personality + your message
                message: currentPersona + "\nUser: " + message
            })
        });

        const indicator = document.getElementById("typing");
        if (indicator) indicator.remove();

        const data = await response.json();

        if (data.reply) {
            addMessage(data.reply, "bot");
        } else {
            addMessage("Aanya: I'm feeling a bit shy, try again? 😅", "bot");
        }

    } catch (error) {
        const indicator = document.getElementById("typing");
        if (indicator) indicator.remove();
        console.error("Error:", error);
        addMessage("System: Connection lost. Wait 60s and try again!", "bot");
    }
}

// Enter key support
document.getElementById("userInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});
