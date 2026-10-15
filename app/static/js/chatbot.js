// ========== 🎯 CHATBOT INJECTION (only when logged in) ==========
function injectChatbot() {
  // Check if already injected
  if (document.getElementById('chatToggle')) return;

  // Check if logged in
  if (!localStorage.getItem('token')) return;

  // Inject chatbot HTML
  var chatbotHTML = `
    <div id="chatToggle" onclick="toggleChat()">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    </div>

    <div id="chatBox" class="chat-hidden">
      <div class="chat-header">
        <div class="chat-title">
          <span class="chat-dot"></span> WEBWAVE AI
        </div>
        <div class="chat-actions">
          <span class="lang-btn" id="langBtn" onclick="cycleLanguage()" title="Change language">🇬🇧 EN</span>
          <span class="voice-toggle" id="voiceToggle" onclick="toggleVoice()" title="Voice">🔊</span>
          <span class="chat-close" onclick="toggleChat()">✖</span>
        </div>
      </div>
      <div id="chatMessages">
        <div class="bubble bot">Vanakkam! 🙏 Naan WEBWAVE AI. Tamil, English, Hindi — enna language-layum pesalam. Jobs, courses pathi kelunga!</div>
      </div>
      <div class="chat-input-wrap">
        <button class="mic-btn" id="micBtn" onclick="startVoiceInput()" title="Voice input">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </button>
        <input id="chatInput" placeholder="Type or speak..." onkeypress="if(event.key==='Enter')sendMsg()">
        <button id="sendBtn" onclick="sendMsg()" title="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Append to body
  var container = document.createElement('div');
  container.innerHTML = chatbotHTML;
  document.body.appendChild(container);
}

// Auto-inject on page load
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(injectChatbot, 100);
});

// ========== VOICE STATE ==========
var voiceOutputEnabled = true;
var recognition = null;
var isListening = false;

// ========== LANGUAGE CYCLE ==========
var LANGUAGES = [
  { code: 'en-IN', label: 'English', flag: '🇬🇧' },
  { code: 'ta-IN', label: 'Tamil', flag: '🇮🇳' },
  { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳' }
];
var currentLangIndex = 0;

function cycleLanguage() {
  currentLangIndex = (currentLangIndex + 1) % LANGUAGES.length;
  var lang = LANGUAGES[currentLangIndex];
  var btn = document.getElementById('langBtn');
  if (btn) {
    btn.innerText = lang.flag + ' ' + lang.code.split('-')[0].toUpperCase();
    btn.title = 'Voice language: ' + lang.label;
  }
  var toast = document.createElement('div');
  toast.className = 'lang-toast';
  toast.innerText = '🌐 ' + lang.label;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 1500);
}

function getCurrentLanguage() {
  return LANGUAGES[currentLangIndex].code;
}

// ========== CHAT TOGGLE ==========
function toggleChat() {
  var box = document.getElementById('chatBox');
  if (!box) return;
  var isHidden = box.classList.contains('chat-hidden');
  if (isHidden) {
    box.classList.remove('chat-hidden');
    box.style.display = 'flex';
    var input = document.getElementById('chatInput');
    if (input) setTimeout(function() { input.focus(); }, 100);
  } else {
    box.classList.add('chat-hidden');
    box.style.display = 'none';
  }
}

// ========== VOICE TOGGLE ==========
function toggleVoice() {
  voiceOutputEnabled = !voiceOutputEnabled;
  var el = document.getElementById('voiceToggle');
  if (el) {
    el.innerText = voiceOutputEnabled ? '🔊' : '🔇';
    el.style.opacity = voiceOutputEnabled ? '1' : '0.5';
  }
}

// ========== SPEAK ==========
function speak(text) {
  if (!voiceOutputEnabled) return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  var cleanText = text.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
  if (!cleanText) return;
  var utterance = new SpeechSynthesisUtterance(cleanText);
  var lang = detectLanguage(text);
  var voices = window.speechSynthesis.getVoices();
  if (lang === 'ta') {
    var v = voices.find(function(x) { return x.lang === 'ta-IN'; }) ||
            voices.find(function(x) { return x.lang.startsWith('ta'); });
    if (v) utterance.voice = v;
    utterance.lang = 'ta-IN';
  } else if (lang === 'hi') {
    var v = voices.find(function(x) { return x.lang === 'hi-IN'; }) ||
            voices.find(function(x) { return x.lang.startsWith('hi'); });
    if (v) utterance.voice = v;
    utterance.lang = 'hi-IN';
  } else {
    var v = voices.find(function(x) { return x.lang === 'en-IN'; }) ||
            voices.find(function(x) { return x.lang.startsWith('en'); });
    if (v) utterance.voice = v;
    utterance.lang = 'en-IN';
  }
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  setTimeout(function() { window.speechSynthesis.speak(utterance); }, 100);
}

function detectLanguage(text) {
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

// ========== VOICE INPUT ==========
function startVoiceInput() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Voice input browser support illa. Use Chrome or Edge.');
    return;
  }
  if (isListening) {
    if (recognition) recognition.stop();
    return;
  }
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = getCurrentLanguage();
  var micBtn = document.getElementById('micBtn');
  var input = document.getElementById('chatInput');
  if (micBtn) micBtn.classList.add('listening');
  if (input) {
    input.placeholder = '🎤 Listening... pesunga';
    input.value = '';
    input.classList.add('listening');
  }
  isListening = true;
  recognition.onresult = function(event) {
    var transcript = '';
    for (var i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (input) input.value = transcript;
    if (event.results[event.results.length - 1].isFinal) {
      if (micBtn) micBtn.classList.remove('listening');
      if (input) {
        input.placeholder = 'Type or speak...';
        input.classList.remove('listening');
      }
      isListening = false;
      setTimeout(function() {
        if (transcript.trim()) sendMsg();
      }, 500);
    }
  };
  recognition.onerror = function(event) {
    if (micBtn) micBtn.classList.remove('listening');
    if (input) {
      input.placeholder = 'Type or speak...';
      input.classList.remove('listening');
    }
    isListening = false;
  };
  recognition.onend = function() {
    if (micBtn) micBtn.classList.remove('listening');
    if (input) {
      input.placeholder = 'Type or speak...';
      input.classList.remove('listening');
    }
    isListening = false;
  };
  try { recognition.start(); } catch (e) { isListening = false; }
}

// ========== SEND MESSAGE ==========
async function sendMsg() {
  var input = document.getElementById('chatInput');
  if (!input) return;
  var msg = input.value.trim();
  if (!msg) return;
  addBubble(msg, 'user');
  input.value = '';
  var typingId = addTyping();
  try {
    var res = await fetch('/api/chat/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    var data = await res.json();
    removeTyping(typingId);
    addBubble(data.reply || 'No response', 'bot');
    speak(data.reply || '');
  } catch (err) {
    removeTyping(typingId);
    addBubble('Network error. Try again.', 'bot');
  }
}

function addBubble(text, who) {
  var box = document.getElementById('chatMessages');
  if (!box) return;
  var div = document.createElement('div');
  div.className = 'bubble ' + who;
  div.innerText = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function addTyping() {
  var box = document.getElementById('chatMessages');
  var div = document.createElement('div');
  div.className = 'bubble bot';
  div.id = 'typing-' + Date.now();
  div.innerText = '. . .';
  div.style.opacity = '0.6';
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div.id;
}

function removeTyping(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
}

// ========== PRELOAD VOICES ==========
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = function() {
    window.speechSynthesis.getVoices();
  };
}