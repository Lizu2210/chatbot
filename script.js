const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

const API_KEY = "AIzaSyChXFkMQqi9_WSjuakRyUYqlIbAEI8BZzA";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};


const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });


const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  let index = 0;

  typingInterval = setInterval(() => {
    if (index < text.length) {
      textElement.textContent += text.charAt(index);
      index++;
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};


const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }]
  });

  try {
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: chatHistory,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 300
        }
      }),
      signal: controller.signal
    });

    const data = await response.json();
    console.log("API Response:", data);

    if (!response.ok || !data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error(data?.error?.message || "No valid response from API.");
    }

    const responseText = data.candidates[0].content.parts[0].text.trim();
    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

  } catch (error) {
    textElement.textContent = error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};


const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  
  const userMsgDiv = createMessageElement(
    `<p class="message-text">${userData.message}</p>`,
    "user-message"
  );
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    
    const botMsgDiv = createMessageElement(
      ` <p class="message-text">Just a sec...</p>`,
      "bot-message", "loading"
    );
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};


fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    // Store file data
    userData.file = { fileName: file.name, data: e.target.result.split(",")[1], mime_type: file.type, isImage };
  };
});


document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});


document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  clearInterval(typingInterval);
  const loadingMsg = chatsContainer.querySelector(".bot-message.loading");
  if (loadingMsg) loadingMsg.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});


document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});


document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});


document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") ||
    (wrapper.classList.contains("hide-controls") && ["add-file-btn", "stop-response-btn"].includes(target.id));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
