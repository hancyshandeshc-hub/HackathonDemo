const DISTRICTS = [
  "Arghakhanchi","Baglung","Baitadi","Bajang","Banke","Bara","Bardiya","Bhaktapur","Chitawan","Dadeldhura","Dailekh","Dang","Darchula","Dhading","Dhankuta","Dhanusa","Dolkha","Dolpa","Doti","Gorkha","Gulmi","Humla","Ilam","Jhapa","Jumla","Kabhre","Kailali","Kanchanpur","Kaski","Kathmandu","Lalitpur","Lamjung","Mahottari","Makwanpur","Manang","Morang","Mugu","Mustang","Myagdi","Nawalparasi","Nuwakot","Okhaldhunga","Palpa","Panchther","Parbat","Rasuwa","Routahat","Rukum","Rupandehi","Salyan","Sankhuwasabha","Saptari","Sarlahi","Sindhuli","Solukhumbu","Sunsari","Surkhet","Syangja","Tanahun","Taplejung","Terhathum","Udayapur"
];

const form = document.getElementById("predictionForm");
if (form) {
  const districtSelect = document.getElementById("district");
  DISTRICTS.forEach(d => districtSelect.add(new Option(d, d)));

  const resultEmpty = document.getElementById("resultEmpty");
  const resultCard = document.getElementById("resultCard");
  const resultBadge = document.getElementById("resultBadge");
  const rainValue = document.getElementById("rainValue");
  const rainCategory = document.getElementById("rainCategory");
  const rainMessage = document.getElementById("rainMessage");
  const awarenessText = document.getElementById("awarenessText");
  const rainImage = document.getElementById("rainImage");
  const predictBtn = document.getElementById("predictBtn");
  const apiStatus = document.getElementById("apiStatus");

  const categories = [
    {min: 0, max: 0, key:"none", name:"No Rainfall", badge:"No rain", message:"The prediction indicates no measurable rainfall.", awareness:"Dry conditions can increase water demand and raise wildfire or dust risks. Consider conserving water and monitoring local conditions.", image:"assets/images/no-rainfall.jpg"},
    {min: 0.1, max: 2.4, key:"very-low", name:"Very Low Rainfall", badge:"Very low", message:"Only a very small amount of rainfall is expected.", awareness:"Light rainfall may provide limited moisture. Avoid assuming that a small rainfall event will fully replenish soil or water sources.", image:"assets/images/very-low-rainfall.jpg"},
    {min: 2.5, max: 7.5, key:"low", name:"Low Rainfall", badge:"Low", message:"A low amount of rainfall is expected.", awareness:"Low rainfall can still support surface moisture, but water availability may remain limited. Plan irrigation and outdoor work accordingly.", image:"assets/images/low-rainfall.jpg"},
    {min: 7.6, max: 35.5, key:"moderate", name:"Moderate Rainfall", badge:"Moderate", message:"A moderate rainfall event is expected.", awareness:"Moderate rain can improve soil moisture and water availability, while also increasing the chance of slippery roads, localized runoff and drainage pressure.", image:"assets/images/moderate-rainfall.jpg"},
    {min: 35.6, max: 64.4, key:"high", name:"High Rainfall", badge:"High", message:"A high amount of rainfall is expected.", awareness:"High rainfall may cause waterlogging, strong runoff and localized flooding. Keep drainage paths clear and follow local weather or safety guidance.", image:"assets/images/high-rainfall.jpg"},
    {min: 64.5, max: Infinity, key:"very-high", name:"Very High Rainfall", badge:"Very high", message:"A very high rainfall event is expected.", awareness:"Very high rainfall can bring significant runoff, flooding, landslide and transport risks in vulnerable areas. Monitor official warnings and avoid hazardous routes.", image:"assets/images/very-high-rainfall.jpg"}
  ];

  function classify(value) {
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0) return null;
    return categories.find(c => v >= c.min && v <= c.max) || categories[categories.length - 1];
  }

  function getPredictionValue(json) {
    return json?.prediction ?? json?.precipitation ?? json?.precipitation_mm ?? json?.predicted_precipitation;
  }

  function setLoading(isLoading) {
    predictBtn.disabled = isLoading;
    predictBtn.classList.toggle("loading", isLoading);
    apiStatus.innerHTML = isLoading ? "Prediction service: <strong>calculating…</strong>" : "Prediction service: <strong>ready</strong>";
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = {
      MONTH: Number(document.getElementById("month").value),
      DISTRICT: document.getElementById("district").value,
      RH2M: Number(document.getElementById("rh2m").value),
      T2M: Number(document.getElementById("t2m").value),
      WS10M: Number(document.getElementById("ws10m").value),
      PS: Number(document.getElementById("ps").value),
      PRECTOT_LAST_MONTH: Number(document.getElementById("prectotLastMonth").value),
      RH2M_LAST_MONTH: Number(document.getElementById("rh2mLastMonth").value)
    };

    setLoading(true);
    try {
      const response = await fetch((window.RAINFALL_CONFIG?.predictionApiUrl || "/predict"), {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)});
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Prediction server returned an error.");
      const raw = getPredictionValue(json);
      const value = Number(raw);
      const category = classify(value);
      if (!category) throw new Error("The API returned an invalid precipitation value.");

      rainValue.textContent = value.toFixed(2).replace(/\.00$/, "");
      resultBadge.textContent = category.badge;
      resultBadge.className = `result-badge category-${category.key}`;
      rainCategory.textContent = category.name;
      rainMessage.textContent = category.message;
      awarenessText.textContent = category.awareness;
      rainImage.src = category.image;
      rainImage.alt = `${category.name} illustration`;
      resultEmpty.hidden = true;
      resultCard.hidden = false;
      resultCard.classList.remove("result-pop"); void resultCard.offsetWidth; resultCard.classList.add("result-pop");
      resultCard.scrollIntoView({behavior:"smooth", block:"nearest"});
    } catch (err) {
      resultEmpty.hidden = false;
      resultCard.hidden = true;
      resultEmpty.querySelector("h2").textContent = "Prediction service unavailable";
      resultEmpty.querySelector("p").textContent = `${err.message} Check the backend URL in config.js and make sure your model API is running.`;
      resultEmpty.classList.add("error-state");
      apiStatus.innerHTML = "Prediction service: <strong class=\"status-error\">connection error</strong>";
    } finally { setLoading(false); }
  });

  document.getElementById("resetPrediction").addEventListener("click", () => { resultCard.hidden = true; resultEmpty.hidden = false; resultEmpty.classList.remove("error-state"); resultEmpty.querySelector("h2").textContent = "Waiting for your prediction"; resultEmpty.querySelector("p").textContent = "Fill in the eight inputs and press Predict Rainfall. Your result will appear here."; window.scrollTo({top:0,behavior:"smooth"}); });
}
