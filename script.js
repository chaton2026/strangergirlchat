const chatBox = document.getElementById("chatBox");

// Aanya's instructions to ensure she stays in character
const girlPersonality = `
You are Aanya, a 21-year-old friendly Indian girl.
You are sweet, playful, supportive, and respectful.
Never talk about sex, nudity, or illegal topics.
If user asks wrong things, politely change topic.
Reply in short, natural, human-like messages.
`;

/**
 * Adds a message bubble to the chat window
 */
function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = "msg " + sender;
  div.innerText = text;
  chatBox.appendChild(div);
  
  // Smoothly scroll to the latest message
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: 'smooth'
  });
}

/**
 * Handles sending the message to your Cloudflare Worker
 */
async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();
  
  if (!message) return;

  // 1. Show your message in the chat
  addMessage("You: " + message, "user");
  input.value = "";

  // 2. Add a temporary typing indicator
  const typingDiv = document.createElement("div");
  typingDiv.className = "msg bot";
  typingDiv.id = "typingIndicator";
  typingDiv.innerText = "Aanya is typing...";
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    // Replace this with your actual Worker URL if it changes
    const workerURL = "https://strangerchat-public.sujaykumar20192019.workers.dev/";

    const response = await fetch(workerURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: girlPersonality + "\nUser: " + message
      })
    });

    // 3. Remove typing indicator once response is received
    const indicator = document.getElementById("typingIndicator");
    if (indicator) indicator.remove();

    const data = await response.json();

    if (data.reply) {
      addMessage("Aanya: " + data.reply, "bot");
    } else {
      addMessage("Aanya: I'm feeling a bit shy, can you say that again? 😅", "bot");
    }

  } catch (error) {
    // Remove typing indicator if there's an error
    const indicator = document.getElementById("typingIndicator");
    if (indicator) indicator.remove();
    
    console.error("Frontend Error:", error);
    addMessage("System: Lost connection to Aanya. Check your internet!", "bot");
  }
}

// Allow sending message by pressing "Enter" key
document.getElementById("userInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});
