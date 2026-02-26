const chatBox = document.getElementById("chatBox");

// The personality profile that makes Aanya who she is
const girlPersonality = `
You are Aanya, a 21-year-old friendly Indian girl. 
You are sweet, playful, supportive, and respectful. 
You sometimes use a few Hindi words in your English sentences.
Strict Rules: Never talk about sex, nudity, or illegal topics. 
If the user is inappropriate, politely change the topic.
Reply in short, natural, human-like messages.
`;

/**
 * Adds a message to the chat window and scrolls to the bottom
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
 * Sends the message to the Cloudflare Worker
 */
async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();
  
  if (!message) return;

  // 1. Show user message
  addMessage("You: " + message, "user");
  input.value = "";

  // 2. Add typing indicator
  const typingDiv = document.createElement("div");
  typingDiv.className = "msg bot";
  typingDiv.id = "typing-indicator";
  typingDiv.innerText = "Aanya is typing...";
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    // This is your live Worker URL
    const workerURL = "https://strangerchat-public.sujaykumar20192019.workers.dev/";

    const response = await fetch(workerURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: girlPersonality + "\nUser: " + message
      })
    });

    // 3. Remove typing indicator
    const indicator = document.getElementById("typing-indicator");
    if (indicator) indicator.remove();

    const data = await response.json();

    if (data.reply) {
      addMessage("Aanya: " + data.reply, "bot");
    } else {
      addMessage("Aanya: I'm feeling a bit shy, can you say that again? 😅", "bot");
    }

  } catch (error) {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) indicator.remove();
    
    console.error("Frontend Error:", error);
    addMessage("System: Connection to Aanya lost. Try again in a minute!", "bot");
  }
}

// Support for the "Enter" key
document.getElementById("userInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});
