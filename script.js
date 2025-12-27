const chatBox = document.getElementById("chatBox");

const girlPersonality = `
You are Aanya, a 21-year-old friendly Indian girl.
You are sweet, playful, and supportive.
Never talk about sex, nudity, or illegal topics.
Reply in short human-like messages.
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer sk-...FG8A"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: girlPersonality },
        { role: "user", content: message }
      ]
    })
  });

  chatBox.lastChild.remove();
  const data = await response.json();
  addMessage("Aanya: " + data.choices[0].message.content, "bot");
}
