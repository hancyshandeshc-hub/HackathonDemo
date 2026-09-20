const contactForm=document.getElementById("contactForm");
if(contactForm){contactForm.addEventListener("submit",e=>{e.preventDefault();document.getElementById("contactSuccess").hidden=false;contactForm.reset();});}
