// Plain module (not "use client") so the server layout can inline it.
export const THEME_KEY = "arthos-theme";
export const THEME_IDS = ["dark", "light", "cobalt", "noir"] as const;

/** Runs before first paint (inlined in <head>) so there is no flash of the wrong theme. Dark is the default (blueprint §11). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(${JSON.stringify(THEME_IDS)}.indexOf(t)<0){t="dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;
