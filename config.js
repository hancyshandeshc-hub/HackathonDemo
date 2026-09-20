/* =========================================================
   RainfallNepal frontend configuration
   ---------------------------------------------------------
   Same Render service serves both the pages and the API
   -> keep the relative URLs below (recommended).

   If the frontend is hosted somewhere else (GitHub Pages,
   Netlify...), use your full Render URL instead, e.g.
     predictionApiUrl: "https://your-app.onrender.com/predict",
     chatApiUrl:       "https://your-app.onrender.com/api/chat"
   ========================================================= */
window.RAINFALL_CONFIG = {
  predictionApiUrl: "/predict",
  chatApiUrl: "/api/chat"
};
