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

  addMessage("Aanya is typing...", "bot");

  try {
    const response = await fetch(
      "https://stranger-ai.sujaykumar20192019.workers.dev/",
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

    chatBox.lastChild.remove(); // remove "Aanya is typing..."

    const data = await response.json();
    const reply = data.reply || "Sorry, I didn’t understand that 😅";

    addMessage("Aanya: " + reply, "bot");

  } catch (error) {
    chatBox.lastChild.remove();
    addMessage("Aanya: Something went wrong 😔", "bot");
  }
}
