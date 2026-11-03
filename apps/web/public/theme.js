// Applies the saved theme before the first paint: a blocking external script (the CSP forbids inline ones).
// Same rule as ThemeService: "dark" by default, "system" follows the device.
(() => {
  let theme = 'dark';
  try {
    const mode = localStorage.getItem('theme');
    if (mode === 'light') theme = 'light';
    else if (mode === 'system' && matchMedia('(prefers-color-scheme: light)').matches)
      theme = 'light';
  } catch {
    // Storage refused (private mode): dark, as the service does.
  }
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Successful router activation sets data-app. A slow or failed public snapshot leaves this unset,
  // so prerendered content becomes readable even when Angular cannot activate the public route.
  root.setAttribute('data-js', '');
  setTimeout(() => {
    if (!root.hasAttribute('data-app')) root.removeAttribute('data-js');
  }, 4000);
})();
