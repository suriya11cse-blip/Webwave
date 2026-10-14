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

function renderNav() {
  var navLinks = document.getElementById('navLinks');
  var chatToggle = document.getElementById('chatToggle');
  var chatBox = document.getElementById('chatBox');

  if (isLoggedIn()) {
    // ✅ LOGGED IN
    document.body.classList.add('logged-in');
    document.body.classList.remove('guest');

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
    document.body.classList.add('guest');
    document.body.classList.remove('logged-in');

    if (navLinks) navLinks.innerHTML = '';
    if (chatToggle) chatToggle.style.display = 'none';
    if (chatBox) {
      chatBox.style.display = 'none';
      chatBox.classList.add('chat-hidden');
    }
  }
}

window.addEventListener('DOMContentLoaded', renderNav);