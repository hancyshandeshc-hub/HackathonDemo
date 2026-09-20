const faqs = [
  ["Who can use this website?", "Farmers, travelers, planners and anyone who wants an idea of upcoming rainfall."],
  ["Which area does it cover?", "It covers about 62 districts of Nepal."],
  ["Is it free to use?", "Yes, it is free to use."],
  ["How is rainfall predicted?", "A model learns patterns from past data, such as temperature, humidity, pressure, wind and earlier rainfall, and uses them to estimate future rainfall."],
  ["How far ahead can it predict?", "It can predict every month up to 1 year ahead."],
  ["How accurate is it?", "The project currently states 91.15% accuracy. For a final hackathon presentation, make sure this figure matches the evaluation of your final trained model and test set."],
  ["Does climate change affect accuracy?", "Yes. Patterns from the past may shift, so the model needs regular updating."],
  ["Do you collect my location or personal information?", "The current project description says that location, name and e-mail are collected for future data purposes. Make sure your deployed privacy notice and actual backend behavior match this statement."],
  ["How do I read the rainfall categories?", "The prediction page shows six levels in millimetres per day: No rainfall (0), Very low (0.1–2.4), Low (2.5–7.5), Moderate (7.6–35.5), High (35.6–64.4), and Very high (≥64.5)."],
  ["Why did the rain I saw differ from the prediction?", "Rainfall changes a lot over short distances, especially between the Terai, hills and mountains. Data averaged over larger areas can miss a local storm or dry spell in a village."],
];
const list=document.getElementById("faqList");
if(list){faqs.forEach(([q,a],i)=>{const item=document.createElement("article");item.className="faq-item";item.innerHTML=`<button class="faq-question" aria-expanded="false"><span class="faq-index">${String(i+1).padStart(2,"0")}</span><span>${q}</span><b>+</b></button><div class="faq-answer"><p>${a}</p></div>`;list.appendChild(item);});document.querySelectorAll(".faq-question").forEach(btn=>btn.addEventListener("click",()=>{const open=btn.getAttribute("aria-expanded")==="true";document.querySelectorAll(".faq-question").forEach(b=>b.setAttribute("aria-expanded","false"));document.querySelectorAll(".faq-item").forEach(i=>i.classList.remove("open"));if(!open){btn.setAttribute("aria-expanded","true");btn.parentElement.classList.add("open");}}));}
