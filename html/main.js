const API = "http://localhost:8033/v1/chat/completions";
const MODEL = "/home/em-/AI/LFM3-1.7B-Q6_K.gguf";

let isGenerating = false;

const messages = [
  {
    role: "system",
    content: "You are Eden, an assistant built into the user's computer. You currently have no tools and can only speak to the user. More will be added later.",
  },
];

const chatInput = document.getElementById("chatInput");
const output = document.getElementById("output");

function scrollToBottom() {
  output.scrollTop = output.scrollHeight;
}

function addMessage(role, content = "") {
  const message = document.createElement("p");

  message.className = `message ${role}`;
  if (role == "assistant") {
    message.textContent = `Eden: ${content}`;    
  } else {
    message.textContent = `${role}: ${content}`
  }

  output.appendChild(message);
  scrollToBottom();

  return message;
}

function createSelector() {
  document.getElementById("info").style="display: block;"
}

async function submit(val) {
  if (isGenerating || !val.trim()) return;
  if (val.trim() == "/info") {
    createSelector()
    return
  }
  isGenerating = true;

  messages.push({
    role: "User",
    content: val,
  });

  addMessage("User", val);

  const assistantMessage = addMessage("assistant");
  // quick fix -- no clue what's happening
  let fullResponse = "Eden: ";

  try {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        stream: true,
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error("Response has no readable stream.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let finished = false;

    while (!finished) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, {
        stream: true,
      });

      const lines = buffer.split("\n");

      // Keep incomplete lines for the next read.
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine.startsWith("data:")) {
          continue;
        }

        const data = trimmedLine.slice(5).trim();

        if (data === "[DONE]") {
          finished = true;
          break;
        }

        if (!data) continue;

        let chunk;

        try {
          chunk = JSON.parse(data);
        } catch (err) {
          console.error("Error parsing SSE chunk:", err);
          continue;
        }

        const choice = chunk.choices?.[0];

        // Standard OpenAI-compatible streaming response.
        const token = choice?.delta?.content;

        if (typeof token === "string" && token.length > 0) {
          fullResponse += token;
          assistantMessage.textContent = fullResponse;
          scrollToBottom();
        }

        // Handle servers that send a finish_reason.
        if (choice?.finish_reason) {
          finished = true;
          break;
        }
      }
    }

    // Flush any remaining decoder data.
    buffer += decoder.decode();

    // Save the completed assistant response.
    messages.push({
      role: "assistant",
      content: fullResponse,
    });

    if (!fullResponse) {
      assistantMessage.textContent = "No response received from the model.";
    }
  } catch (error) {
    assistantMessage.textContent = "Error: " + error.message;
    assistantMessage.classList.add("error");

    console.error("Chat error:", error);

    // Remove the failed user message from history.
    messages.pop();

    // Remove the empty assistant response from the UI.
    if (!fullResponse) {
      assistantMessage.textContent = "Error: " + error.message;
    }
  } finally {
    isGenerating = false;
    scrollToBottom();
    chatInput.focus();
  }
}

// Keyboard handling.
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const value = chatInput.value.trim();

    if (value && !isGenerating) {
      chatInput.value = "";
      submit(value);
    }
  }
});
