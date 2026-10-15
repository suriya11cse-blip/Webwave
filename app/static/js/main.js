// ---------- AUTH HELPERS ----------
function getToken() {
  return localStorage.getItem('token');
}

function getUserName() {
  return localStorage.getItem('name');
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  localStorage.clear();
  window.location.href = '/login';
}

// ---------- NAV + CHATBOT VISIBILITY ----------
function renderNav() {
  var navLinks = document.getElementById('navLinks');
  var chatToggle = document.getElementById('chatToggle');
  var chatBox = document.getElementById('chatBox');

  if (isLoggedIn()) {
    // ✅ LOGGED IN
    if (navLinks) {
      var userName = getUserName() || 'User';
      navLinks.innerHTML =
        '<a href="/dashboard">Jobs</a>' +
        '<span style="color:var(--vl);font-weight:700">' + userName + '</span>' +
        '<a href="#" onclick="logout();return false;" style="color:#f9a8d4">Logout</a>';
    }
    if (chatToggle) chatToggle.style.display = 'flex';
  } else {
    // ❌ GUEST
    if (navLinks) navLinks.innerHTML = '';
    if (chatToggle) chatToggle.style.display = 'none';
    if (chatBox) {
      chatBox.style.display = 'none';
      chatBox.classList.add('chat-hidden');
    }
  }
}

window.addEventListener('DOMContentLoaded', renderNav);