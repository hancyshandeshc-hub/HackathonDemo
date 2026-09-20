(function(){
  const navToggle=document.querySelector('.nav-toggle'); const nav=document.querySelector('.site-nav');
  if(navToggle){navToggle.addEventListener('click',()=>{const open=navToggle.getAttribute('aria-expanded')==='true';navToggle.setAttribute('aria-expanded',String(!open));nav.classList.toggle('open',!open);});}
  document.querySelectorAll('.site-nav a').forEach(a=>a.addEventListener('click',()=>{nav?.classList.remove('open');navToggle?.setAttribute('aria-expanded','false');}));
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
  const header=document.querySelector('.site-header'); window.addEventListener('scroll',()=>header?.classList.toggle('scrolled',window.scrollY>12),{passive:true});
})();
