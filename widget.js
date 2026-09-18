/* ===== Chat Widget Logic =====
   Self-contained: builds its own DOM, needs no framework.
   Configure via the CW_CONFIG object below (or override before this
   script loads by defining window.CW_CONFIG first). */

(function () {
  const CW_CONFIG = Object.assign(
    {
      apiUrl: "/api/chat",           // your backend endpoint (see server.js)
      title: "Chat with us",
      subtitle: "We usually reply in a few seconds",
      greeting: "Hi! What can I help you with?",
      placeholder: "Type a message…",
    },
    window.CW_CONFIG || {}
  );

  // ---------- Build DOM ----------
  const root = document.createElement("div");
  root.id = "cw-root";
  root.innerHTML = `
    <div id="cw-panel" role="dialog" aria-label="${CW_CONFIG.title}" aria-hidden="true">
      <div id="cw-header">
        <div class="cw-title">${CW_CONFIG.title}</div>
        <div class="cw-subtitle">${CW_CONFIG.subtitle}</div>
      </div>
      <div id="cw-messages" role="log" aria-live="polite"></div>
      <form id="cw-form">
        <textarea id="cw-input" rows="1" placeholder="${CW_CONFIG.placeholder}" aria-label="Message"></textarea>
        <button id="cw-send" type="submit" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    </div>
    <button id="cw-toggle" aria-expanded="false" aria-label="Open chat">
      <span class="cw-dot" id="cw-dot"></span>
      <svg class="cw-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
      <svg class="cw-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;
  document.body.appendChild(root);

  const toggleBtn = root.querySelector("#cw-toggle");
  const panel = root.querySelector("#cw-panel");
  const dot = root.querySelector("#cw-dot");
  const messagesEl = root.querySelector("#cw-messages");
  const form = root.querySelector("#cw-form");
  const input = root.querySelector("#cw-input");
  const sendBtn = root.querySelector("#cw-send");

  // ---------- State ----------
  // history mirrors what the backend/LLM needs: [{role: "user"|"assistant", content: "..."}]
  let history = [];
  let hasOpened = false;
  let isSending = false;

  // ---------- Helpers ----------
  function addBubble(text, cls) {
    const div = document.createElement("div");
    div.className = "cw-msg " + cls;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "cw-typing";
    div.id = "cw-typing-indicator";
    div.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById("cw-typing-indicator");
    if (el) el.remove();
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
  }

  // ---------- Open / close ----------
  toggleBtn.addEventListener("click", () => {
    const willOpen = !root.classList.contains("cw-open");
    root.classList.toggle("cw-open", willOpen);
    toggleBtn.setAttribute("aria-expanded", String(willOpen));
    panel.setAttribute("aria-hidden", String(!willOpen));

    if (willOpen) {
      dot.hidden = true;
      if (!hasOpened) {
        hasOpened = true;
        addBubble(CW_CONFIG.greeting, "cw-msg-bot");
      }
      input.focus();
    }
  });

  // ---------- Sending ----------
  async function sendMessage(text) {
    isSending = true;
    sendBtn.disabled = true;
    addBubble(text, "cw-msg-user");
    history.push({ role: "user", content: text });
    showTyping();

    try {
      const res = await fetch(CW_CONFIG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        throw new Error("Request failed with status " + res.status);
      }

      const data = await res.json();
      hideTyping();

      const reply = data.reply || "Sorry, I didn't get a response. Please try again.";
      addBubble(reply, "cw-msg-bot");
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      hideTyping();
      addBubble(
        "Something went wrong reaching the server. Please try again in a moment.",
        "cw-msg-error"
      );
      console.error("Chat widget error:", err);
    } finally {
      isSending = false;
      sendBtn.disabled = false;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || isSending) return;
    input.value = "";
    autoGrow();
    sendMessage(text);
  });

  input.addEventListener("input", autoGrow);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
})();
