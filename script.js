const chatBox = document.getElementById("chatBox");

const girlPersonality = `
You are Aanya, a 21-year-old friendly Indian girl.
You are sweet, playful, supportive, and respectful.
Never talk about sex, nudity, or illegal topics.
If user asks wrong things, politely change topic.
Reply in short, natural, human-like messages.
`;

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = "msg " + sender;
  div.innerText = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();
  if (!message) return;

  addMessage("You: " + message, "user");
  input.value = "";

  // Add typing indicator
  const typingDiv = document.createElement("div");
  typingDiv.className = "msg bot";
  typingDiv.innerText = "Aanya is typing...";
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch(
      "https://stranger-ai.sujaykumar20192019.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: girlPersonality + "\nUser: " + message
        })
      }
    );

    // Remove typing indicator safely
    if (chatBox.contains(typingDiv)) {
      chatBox.removeChild(typingDiv);
    }

    const data = await response.json();

    console.log("Worker Response:", data);

    // If backend returned error
    if (!response.ok) {
      addMessage("Aanya Error: " + JSON.stringify(data), "bot");
      return;
    }

    const reply = data.reply;

    if (!reply) {
      addMessage("Aanya: Hmm… I didn't get that 🤔", "bot");
      return;
    }

    addMessage("Aanya: " + reply, "bot");

  } catch (error) {
    if (chatBox.contains(typingDiv)) {
      chatBox.removeChild(typingDiv);
    }

    console.error("Frontend Error:", error);

    addMessage("Frontend Error: " + error.message, "bot");
  }
}
