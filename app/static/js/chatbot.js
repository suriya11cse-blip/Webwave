// ========== STATE ==========
var voiceOutputEnabled = true;
var recognition = null;
var isListening = false;
var isRecording = false;
var recordStartTime = 0;
var recordTimer = null;

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

// ========== VOICE OUTPUT TOGGLE ==========
function toggleVoice() {
  voiceOutputEnabled = !voiceOutputEnabled;
  var el = document.getElementById('voiceToggle');
  if (el) {
    el.innerText = voiceOutputEnabled ? '🔊' : '🔇';
    el.style.opacity = voiceOutputEnabled ? '1' : '0.5';
  }
}

// ========== VOICE OUTPUT (TEXT-TO-SPEECH) ==========
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
            voices.find(function(x) { return x.lang === 'en-US'; }) ||
            voices.find(function(x) { return x.lang.startsWith('en'); });
    if (v) utterance.voice = v;
    utterance.lang = 'en-IN';
  }

  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  setTimeout(function() {
    window.speechSynthesis.speak(utterance);
  }, 100);
}

// ========== LANGUAGE DETECT ==========
function detectLanguage(text) {
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

// ========== 🎤 WHATSAPP-STYLE VOICE INPUT ==========
function startVoiceInput() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Voice input browser support illa.\n\nPlease use Google Chrome or Microsoft Edge.');
    return;
  }

  // If already recording → stop
  if (isListening) {
    stopRecording();
    return;
  }

  // Start recording
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'ta-IN';
  recognition.maxAlternatives = 1;

  var micBtn = document.getElementById('micBtn');
  var input = document.getElementById('chatInput');

  if (micBtn) micBtn.classList.add('listening');
  if (input) {
    input.placeholder = '🎤 Listening... pesunga';
    input.value = '';
  }

  isListening = true;
  isRecording = true;
  recordStartTime = Date.now();

  // Show recording timer
  var seconds = 0;
  recordTimer = setInterval(function() {
    seconds++;
    if (input) {
      input.placeholder = '🎤 Recording... ' + seconds + 's (click mic to stop)';
    }
  }, 1000);

  recognition.onstart = function() {
    console.log('🎤 Recording started');
  };

  recognition.onresult = function(event) {
    var transcript = '';
    for (var i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    if (input) {
      input.value = transcript;
    }

    // If final result
    if (event.results[event.results.length - 1].isFinal) {
      console.log('📝 Final transcript:', transcript);
      clearInterval(recordTimer);
      if (micBtn) micBtn.classList.remove('listening');
      isListening = false;
      isRecording = false;

      if (input) input.placeholder = 'Type or speak...';

      // Auto-send after short delay
      setTimeout(function() {
        if (transcript.trim()) {
          sendMsg();
        }
      }, 500);
    }
  };

  recognition.onerror = function(event) {
    console.error('❌ Speech error:', event.error);
    clearInterval(recordTimer);
    if (micBtn) micBtn.classList.remove('listening');
    if (input) input.placeholder = 'Type or speak...';
    isListening = false;
    isRecording = false;

    if (event.error === 'not-allowed') {
      alert('❌ Microphone permission denied.\n\nBrowser-la mic allow pannunga:\n1. Address bar-la 🔒 click\n2. Microphone → Allow\n3. Refresh');
    } else if (event.error === 'no-speech') {
      console.log('No speech detected');
    } else if (event.error === 'aborted') {
      console.log('Recording aborted');
    }
  };

  recognition.onend = function() {
    console.log('🎤 Recording ended');
    clearInterval(recordTimer);
    if (micBtn) micBtn.classList.remove('listening');
    if (input) input.placeholder = 'Type or speak...';
    isListening = false;
    isRecording = false;
  };

  try {
    recognition.start();
  } catch (e) {
    console.error('❌ Failed to start:', e);
    clearInterval(recordTimer);
    if (micBtn) micBtn.classList.remove('listening');
    isListening = false;
    isRecording = false;
  }
}

function stopRecording() {
  if (recognition && isListening) {
    recognition.stop();
  }
  clearInterval(recordTimer);
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

// ========== BUBBLE UI ==========
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

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', function() {
  var toggle = document.getElementById('chatToggle');
  var closeBtn = document.querySelector('.chat-close');
  var sendBtn = document.getElementById('sendBtn');
  var micBtn = document.getElementById('micBtn');
  var input = document.getElementById('chatInput');
  var voiceToggle = document.getElementById('voiceToggle');

  if (toggle) toggle.addEventListener('click', toggleChat);
  if (closeBtn) closeBtn.addEventListener('click', toggleChat);
  if (sendBtn) sendBtn.addEventListener('click', sendMsg);
  if (micBtn) micBtn.addEventListener('click', startVoiceInput);
  if (voiceToggle) voiceToggle.addEventListener('click', toggleVoice);
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMsg();
    });
  }
});

// ========== PRELOAD VOICES ==========
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = function() {
    window.speechSynthesis.getVoices();
  };
}