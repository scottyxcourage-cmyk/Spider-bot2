function launchApp() {
  document.getElementById('auth-screen').classList.remove('visible');
  const app = document.getElementById('app');
  app.style.display = 'block';
  app.classList.add('visible');
  setUserUI();
  loadStats();
  renderHome();
  // Inject mobile bottom nav bar
  if (typeof injectMobileNav === 'function') injectMobileNav();
}

// Boot sequence
runSplash(async () => {
  const user = await fetchSession();
  if (user) {
    STATE.currentUser = user;
    launchApp();
  } else {
    document.getElementById('auth-screen').classList.add('visible');
  }
});
