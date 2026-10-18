export const themeStorageKey = "cyberclub-theme";
export const themeInitScript = `(function(){var d=true;try{d=localStorage.getItem('cyberclub-theme')!=='light'}catch(e){}document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'})()`;
