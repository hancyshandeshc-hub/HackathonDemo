/* =========================================================
   RainfallNepal frontend configuration
   ---------------------------------------------------------
   Change these URLs when you deploy your backend.
   Prediction endpoint should accept POST JSON and return:
   { "prediction": 12.34 }
   (The frontend also accepts precipitation or precipitation_mm.)
   ========================================================= */
window.RAINFALL_CONFIG = {
  predictionApiUrl: "/predict",
  chatApiUrl: "/api/chat"
};
