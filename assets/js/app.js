(()=>{
"use strict";
const API=(window.HR_CONFIG?.API_URL||"").replace(/\/$/,"");
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const page=document.body.dataset.page;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>new Intl.NumberFormat("fr-FR").format(Number(n)||0)+" $";
const img=url=>url&&/^https:\/\//i.test(url)?url:"assets/img/showroom.svg";
const token=()=>sessionStorage.getItem("ammu_admin_token");
async function api(path,options={}){
 const headers={"Content-Type":"application/json",...(options.headers||{})};
 if(options.auth&&token())headers.Authorization="Bearer "+token();
 let r;
 try{r=await fetch(API+path,{method:options.method||"GET",headers,body:options.body===undefined?undefined:JSON.stringify(options.body)});}
 catch{throw Error("Impossible de joindre Cloudflare. Vérifiez la connexion et le déploiement du Worker.");}
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||"Erreur HTTP "+r.status);
 return data;
}
function notice(message,error=false){
 const e=$("#status");if(e){e.textContent=message;e.className=error?"notice error":"notice";e.style.display=message?"block":"none";}
}
let siteSettings={};
const siteImage = value => typeof value === "string" && /^https:\/\/[^\s]+$/i.test(value) ? value : "";
function applyAppearance(){
 const logo=siteImage(siteSettings.site_logo_image);
 if(logo){ $$(".brand,.footer-brand").forEach(el=>{el.textContent="";const image=document.createElement("img");image.src=logo;image.alt="Ammu-Nation Nord";image.className="brand-image";el.append(image);}); }
 const hero=siteImage(siteSettings.site_hero_image);
 if(hero && $(".hero")) $(".hero").style.backgroundImage=`linear-gradient(90deg,rgba(2,2,3,.96),rgba(36,0,9,.38)),url("${hero.replace(/\"/g,"%22")}")`;
 const banners={catalogue:"site_catalogue_image",news:"site_news_image",reservations:"site_news_image",association:"site_association_image",equipe:"site_team_image",contact:"site_contact_image"};
 const bannerKey=banners[page];
 const banner=$('.page-head');
 if(banner && bannerKey){
   const url=siteImage(siteSettings[bannerKey]);
   banner.classList.toggle('image-page-head',Boolean(url));
   if(url){
     const safeUrl=url.replace(/["\\]/g, c=>encodeURIComponent(c));
     banner.style.setProperty('background-image',`linear-gradient(90deg,rgba(3,2,3,.88),rgba(45,2,14,.48)),url("${safeUrl}")`,'important');
   }else{
     banner.style.removeProperty('background-image');
   }
 }

}
function cropStyle(v){const x=Math.max(0,Math.min(100,Number(v.crop_x??50)||0));const y=Math.max(0,Math.min(100,Number(v.crop_y??50)||0));const z=Math.max(.5,Math.min(3,Number(v.crop_zoom??1)||1));return `transform:translate(${x-50}%,${y-50}%) scale(${z});object-position:center` ;}
function layout(){
 const current=(location.pathname.split('/').pop()||'index.html');
 const links=[['index.html','Accueil'],['catalogue.html','Catalogue'],['actualites.html','Événements'],['reservations.html','Réservations'],['equipe.html','Notre équipe'],['association.html','Association'],['contact.html','Contact'],['admin.html','Administration']];
 const menu=links.map(([href,label])=>`<a href="${href}" class="${current===href?'is-active':''} ${href==='admin.html'?'nav-admin':''}" ${current===href?'aria-current="page"':''}>${label}</a>`).join('');
 $("#header").innerHTML=`<header class="site-header"><div class="container nav"><a class="brand" href="index.html">AMMU-<span>NATION NORD</span></a><button type="button" class="mobile-menu-toggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="site-navigation"><span></span><span></span><span></span></button><nav id="site-navigation" class="nav-links" aria-label="Navigation principale">${menu}</nav></div></header>`;
 const menuButton=document.querySelector('.mobile-menu-toggle');
 const navigation=document.getElementById('site-navigation');
 if(menuButton && navigation){
   const closeMenu=()=>{menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Ouvrir le menu');navigation.classList.remove('mobile-open');};
   menuButton.addEventListener('click',()=>{const opened=menuButton.getAttribute('aria-expanded')==='true';menuButton.setAttribute('aria-expanded',String(!opened));menuButton.setAttribute('aria-label',opened?'Ouvrir le menu':'Fermer le menu');navigation.classList.toggle('mobile-open',!opened);});
   navigation.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
   document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
   document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
 }


 const target=$("#footer");
 const html=`<footer class="site-footer"><div class="container footer-content"><div class="footer-identity"><a class="footer-brand" href="index.html">AMMU-NATION NORD</a><p>Votre armurerie à San Andreas.</p></div><nav class="footer-links" aria-label="Navigation de pied de page"><a href="index.html">Accueil</a><a href="catalogue.html">Catalogue</a><a href="actualites.html">Événements</a><a href="reservations.html">Réservations</a></nav></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} Ammu-Nation Nord. Tous droits réservés.</span><span>San Andreas · Armurerie</span></div></footer>`;
 if(target)target.innerHTML=html;
 else document.body.insertAdjacentHTML('beforeend',html);
}

async function loadAssociationEditor(){
 const field=$("#association-text");if(!field)return;
 const data=await api("/api/association");field.value=data.text||"";
}
async function associationPage(){
 const target=$("#association-content");
 if(!target)return;
 try{
  const data=await api("/api/association");
  const value=String(data.text||"").trim();
  target.textContent=value||"La présentation de notre association sera bientôt disponible.";
 }catch(err){target.textContent="Impossible de charger la présentation pour le moment.";notice(err.message,true);}
}
let teamMembers=[];
const teamRanks=["Patron","Co Patron","Manager","Employé"];
async function teamPage(){
 const target=$("#team-public-list");if(!target)return;
 try{
  const members=await api("/api/team");
  if(!members.length){target.innerHTML='<div class="panel"><p>Notre équipe sera prochainement présentée.</p></div>';return;}
  const card=m=>`<article class="team-tree-card">${m.image_url?`<img src="${esc(m.image_url)}" alt="" loading="lazy" class="team-tree-photo">`:`<div class="team-tree-placeholder" aria-hidden="true">👤</div>`}<div class="team-tree-content"><h2>${esc(m.first_name)} ${esc(m.last_name)}</h2><strong>${esc(m.rank)}</strong>${m.description?`<p>${esc(m.description)}</p>`:""}</div></article>`;
  target.innerHTML=teamRanks.map((rank,i)=>{const group=members.filter(m=>(m.rank||"").toLowerCase()==rank.toLowerCase()||(rank==="Employé"&&(m.rank||"").toLowerCase()==="employé"));return group.length?`<section class="team-tree-level" aria-label="${rank}"><div class="team-tree-row">${group.map(card).join("")}</div></section>`:"";}).join("") || '<p>Aucun membre à afficher.</p>';
 }catch(err){target.innerHTML='<div class="panel">Impossible de charger l’équipe.</div>';notice(err.message,true);}
}
function renderTeamAdmin(){
 const target=$("#team-admin-list");if(!target)return;
 if(!teamMembers.length){target.innerHTML='<div class="team-admin-empty"><span aria-hidden="true">♙</span><strong>Aucun membre enregistré</strong><p>Ajoutez votre premier membre avec le formulaire ci-dessus.</p></div>';return;}
 target.innerHTML=`<div class="team-admin-summary">${teamMembers.length} membre${teamMembers.length>1?'s':''} enregistré${teamMembers.length>1?'s':''}</div><div class="team-admin-grid">${teamMembers.map((m,i)=>{
 const initials=((m.first_name||'').charAt(0)+(m.last_name||'').charAt(0)).toUpperCase();
 return `<article class="team-admin-card"><div class="team-admin-card-top"><div class="team-admin-avatar">${m.image_url?`<img src="${esc(m.image_url)}" alt="Photo de ${esc(m.first_name)} ${esc(m.last_name)}" loading="lazy">`:`<span aria-hidden="true">${esc(initials||'•')}</span>`}</div><div class="team-admin-person"><h3>${esc(m.first_name)} ${esc(m.last_name)}</h3><span class="team-admin-rank">${esc(m.rank)}</span></div></div><div class="team-admin-description">${m.description?`<p>${esc(m.description)}</p>`:'<p class="team-admin-no-description">Aucune description</p>'}</div><div class="team-admin-actions"><button type="button" class="btn outline small" data-edit-team="${i}">Modifier</button><button type="button" class="btn outline small team-admin-delete" data-delete-team="${i}">Supprimer</button></div></article>`;
 }).join('')}</div>`;
}
async function loadTeamEditor(){
 if(!$("#team-admin-list"))return;
 teamMembers=await api("/api/team");renderTeamAdmin();
}
async function saveTeamMembers(next){
 await api("/api/admin/team",{method:"PUT",auth:true,body:{members:next}});
 teamMembers=next;renderTeamAdmin();
}
function resetTeamForm(){["team-index","team-first","team-last","team-rank","team-description","team-image"].forEach(id=>$("#"+id).value="");}
function vehicleCard(v){
 const name=esc(v.brand+" "+v.model);
 return `<article class="card vehicle-card vehicle-card-simple">
   <button type="button" class="vehicle-card-media vehicle-open" data-vehicle-id="${Number(v.id)}" aria-label="Voir ${name}">
     <img class="card-image crop-render" style="${cropStyle(v)}" src="${esc(img(v.image_url))}" alt="${name}" loading="lazy">
   </button>
   <div class="card-body vehicle-card-body">
     <span class="vehicle-card-brand">${esc(v.brand)}</span>
     <h3>${esc(v.model)}</h3>
     <div class="vehicle-card-bottom">
       <strong class="vehicle-card-price">${money(v.price)}</strong>
       <button type="button" class="btn vehicle-card-action vehicle-open" data-vehicle-id="${Number(v.id)}">Voir le produit →</button>
     </div>
   </div>
 </article>`;
}
const modalMarkup='<div id="vehicle-modal" class="vehicle-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-modal-title" hidden><div class="vehicle-modal-dialog"><button type="button" id="vehicle-modal-close" class="vehicle-modal-close" aria-label="Fermer la fiche">×</button><div id="vehicle-modal-content"></div></div></div>';
function initVehicleModal(){
 const modal=$("#vehicle-modal");
 if(!modal)return;
 const close=()=>{modal.hidden=true;document.body.classList.remove("modal-open");};
 document.addEventListener("click",event=>{
   const opener=event.target.closest(".vehicle-open");
   if(opener){
     const v=vehicles.find(item=>Number(item.id)===Number(opener.dataset.vehicleId));
     if(!v)return;
     
     
     $("#vehicle-modal-content").innerHTML=`<div class="modal-vehicle-image"><img class="crop-render" style="${cropStyle(v)}" src="${esc(img(v.image_url))}" alt="${esc(v.brand+" "+v.model)}"></div>
       <div class="modal-vehicle-info"><span class="vehicle-card-brand">${esc(v.brand)}</span><h2 id="vehicle-modal-title">${esc(v.model)}</h2>
       <span class="modal-vehicle-category">${esc(v.category)}</span>
       
       <div class="modal-vehicle-price"><span>Prix du produit</span><strong>${money(v.price)}</strong></div>
       ${v.description?`<p class="modal-vehicle-description">${esc(v.description)}</p>`:""}</div>`;
     modal.hidden=false;document.body.classList.add("modal-open");$("#vehicle-modal-close").focus();
   }
   if(event.target===modal||event.target.closest("#vehicle-modal-close"))close();
 });
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!modal.hidden)close();});
}
function newsCard(n){return `<article class="card"><img src="${esc(img(n.image_url))}" alt="" loading="lazy"><div class="card-body"><h3>${esc(n.title)}</h3><p>${esc(n.content).slice(0,180)}${n.content.length>180?"…":""}</p><small>${esc(n.created_at||"")}</small></div></article>`;}
let vehicles=[],news=[],categories=[];
async function publicPage(){
 if(page==="home"||page==="index"){
   const [v,n]=await Promise.all([api("/api/vehicles"),api("/api/news")]);
   vehicles=v;
  if(!$("#vehicle-modal"))document.body.insertAdjacentHTML("beforeend",modalMarkup);
  initVehicleModal();
  $("#featured").innerHTML=(v.filter(x=>x.featured).length?v.filter(x=>x.featured):v).slice(0,3).map(vehicleCard).join("")||"<p>Aucun produit pour le moment.</p>";
   $("#latest").innerHTML=n.slice(0,3).map(newsCard).join("")||"<p>Pas encore d'événements.</p>";
 }
 if(page==="catalogue"){
  const toggleFilters=$("#toggle-filters"),filtersPanel=$("#filters-panel");
  if(toggleFilters&&filtersPanel){
   toggleFilters.addEventListener("click",()=>{
    const opening=filtersPanel.hidden;
    filtersPanel.hidden=!opening;
    toggleFilters.setAttribute("aria-expanded",String(opening));
   });
  }

  vehicles=await api("/api/vehicles");
  initVehicleModal();
  const cats=(await api("/api/categories")).map(c=>c.name);
  $("#category").innerHTML='<option value="">Toutes les catégories</option>'+cats.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
  const ids=["search","category","price-min","price-max",];
  const bound=(v,min,max)=>{
   const lo=$("#"+min)?.value ?? "",hi=max ? ($("#"+max)?.value ?? "") : "";
   return (lo===""||Number(v)>=Number(lo))&&(hi===""||Number(v)<=Number(hi));
  };
  const render=()=>{
   const q=$("#search").value.trim().toLowerCase(),c=$("#category").value;
   const rows=vehicles.filter(v=>(v.brand+" "+v.model).toLowerCase().includes(q)&&(!c||v.category===c)&&bound(v.price,"price-min","price-max"));
   $("#results").textContent=rows.length+" produit(s)";
   $("#vehicle-grid").innerHTML=rows.map(vehicleCard).join("")||"<p>Aucun produit ne correspond à ces filtres.</p>";
  };
  ids.forEach(id=>$("#"+id).addEventListener("input",render));
  $("#reset-filters").onclick=()=>{ids.forEach(id=>$("#"+id).value="");render();};
  render();
 }
 if(page==="reservations"){initPublicReservation();}
 if(page==="vehicle"){
  const id=Number(new URLSearchParams(location.search).get("id"));
  const v=(await api("/api/vehicles")).find(x=>x.id===id);
  if(!v){notice("Produit introuvable.",true);return;}
  $("#detail").innerHTML=`<div class="panel"><img class="detail-image crop-render" style="${cropStyle(v)}" src="${esc(img(v.image_url))}" alt="${esc(v.brand+" "+v.model)}"></div><div class="panel"><span class="eyebrow">${esc(v.category)}</span><h1>${esc(v.brand)} ${esc(v.model)}</h1><h2>${money(v.price)}</h2><p style="white-space:pre-wrap">${esc(v.description)}</p></div>`;
 }
 if(page==="news"){
  const n=await api("/api/news");initEventCalendar(n);
 }

}
function initEventCalendar(events){
 const today=new Date(),view=new Date(today.getFullYear(),today.getMonth(),1);
 const dated=events.filter(e=>/^\d{4}-\d{2}-\d{2}/.test(e.event_date||""));
 const modal=$("#event-modal"),modalContent=$("#event-modal-content");let lastFocus=null;
 function closeModal(){if(!modal)return;modal.hidden=true;modal.setAttribute("aria-hidden","true");document.body.classList.remove("event-modal-open");if(lastFocus&&lastFocus.isConnected)lastFocus.focus();}
 function openModal(event){if(!modal)return;lastFocus=document.activeElement;
  const rawDate=(event.event_date||"").slice(0,10),time=(event.event_time||event.event_date?.slice(11,16)||"").slice(0,5);
  const prettyDate=rawDate?new Date(rawDate+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}).toUpperCase():"";
  modalContent.innerHTML=`${siteImage(event.image_url)?`<img class="event-modal-image" src="${esc(event.image_url)}" alt="Affiche de ${esc(event.title)}">`:""}<div class="event-modal-body"><div class="event-modal-date">${esc(prettyDate)}${time?" · "+esc(time):""}</div><h2>${esc(event.title)}</h2><p>${esc(event.content||"")}</p></div>`;
  modal.hidden=false;modal.setAttribute("aria-hidden","false");document.body.classList.add("event-modal-open");$("#event-modal-close").focus();
 }
 modal?.addEventListener("click",e=>{if(e.target.closest("[data-event-close],#event-modal-close"))closeModal();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal?.hidden)closeModal();});
 const render=()=>{
  $("#cal-month").textContent=view.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  const first=(view.getDay()+6)%7,total=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
  const count=Math.ceil((first+total)/7)*7;let html="";
  for(let i=0;i<count;i++){
   const d=i-first+1,valid=d>=1&&d<=total,cellDate=new Date(view.getFullYear(),view.getMonth(),d);
   const date=[cellDate.getFullYear(),String(cellDate.getMonth()+1).padStart(2,"0"),String(cellDate.getDate()).padStart(2,"0")].join("-");
   const dayEvents=valid?dated.filter(e=>e.event_date.slice(0,10)===date):[];
   const cards=dayEvents.map(e=>`<button type="button" class="calendar-event-mini" data-event-id="${esc(String(e.id))}" aria-label="Voir ${esc(e.title)}">${siteImage(e.image_url)?`<img src="${esc(e.image_url)}" loading="lazy" alt="">`:""}<strong>${esc(e.title)}</strong><small>${esc((e.event_time||e.event_date?.slice(11,16)||"").slice(0,5))}</small></button>`).join("");
   html+=`<div class="calendar-day ${valid?'':'calendar-outside'} ${dayEvents.length?'has-event':''}"><span class="calendar-day-number">${cellDate.getDate()}</span>${cards}</div>`;
  }
  $("#cal-days").innerHTML=html;
 };
 $("#cal-prev").onclick=()=>{view.setMonth(view.getMonth()-1);render();};
 $("#cal-next").onclick=()=>{view.setMonth(view.getMonth()+1);render();};
 $("#cal-days").addEventListener("click",e=>{const btn=e.target.closest("[data-event-id]");if(!btn)return;const ev=dated.find(x=>String(x.id)===btn.dataset.eventId);if(ev)openModal(ev);});
 render();
}
function initPublicReservation(){
 const form=$("#reservation-form");if(!form)return;
 const date=$("#r-date");const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());date.min=now.toISOString().slice(0,16);
 $("#r-birth").max=new Date().toISOString().slice(0,10);
 form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('button[type=submit]');btn.disabled=true;
  try{await api('/api/reservations',{method:'POST',body:{first_name:$("#r-first").value,last_name:$("#r-last").value,phone:$("#r-phone").value,birth_date:$("#r-birth").value,reservation_at:date.value,party_size:Number($("#r-count").value),reservation_type:$("#r-type").value}});form.reset();$("#reservation-status").textContent='Demande envoyée ! Elle reste en attente de confirmation.';}
  catch(err){$("#reservation-status").textContent=err.message;}finally{btn.disabled=false;}
 };
}
async function loadReservations(){const target=$("#admin-reservations");if(!target)return;
 try{const rows=await api('/api/admin/reservations',{auth:true});target.innerHTML=rows.length?rows.map(r=>`<article class="booking-row"><div><strong>${esc(r.first_name)} ${esc(r.last_name)}</strong><p>${esc(r.reservation_type)} · ${esc(r.reservation_at.replace('T',' '))} · ${r.party_size} personne(s)</p><p>Tél. ${esc(r.phone)} · Né(e) le ${esc(r.birth_date)}</p><span class="booking-status">${r.status==='confirmed'?'Confirmée':r.status==='cancelled'?'Refusée':'En attente'}</span></div><div class="booking-actions"><button class="btn small" data-book-status="confirmed" data-book-id="${r.id}">Confirmer</button><button class="btn outline small" data-book-status="cancelled" data-book-id="${r.id}">Refuser</button><button class="btn outline small" data-book-delete="${r.id}">Supprimer</button></div></article>`).join(''):'<p class="muted">Aucune demande de réservation.</p>';}
 catch(err){target.textContent=err.message;}
}
function setLogged(logged){$("#login-panel").classList.toggle("hidden",logged);$("#admin-panel").classList.toggle("hidden",!logged);}
function adminRows(){
 $("#count-v").textContent=vehicles.length;$("#count-n").textContent=news.length;
 $("#admin-vehicles").innerHTML=vehicles.map(v=>`<tr><td>${esc(v.brand+" "+v.model)}</td><td>${money(v.price)}</td><td><button class="btn outline small" data-edit-v="${v.id}">Modifier</button> <button class="btn outline small" data-del-v="${v.id}">Supprimer</button></td></tr>`).join("");
 $("#admin-news").innerHTML=news.map(n=>`<tr><td>${esc(n.title)}</td><td>${n.published?"Publiée":"Brouillon"}</td><td><button class="btn outline small" data-edit-n="${n.id}">Modifier</button> <button class="btn outline small" data-del-n="${n.id}">Supprimer</button></td></tr>`).join("");
}
function renderCategories(){
 const chosen=$("#v-category").value;
 $("#v-category").innerHTML='<option value="">Choisir une catégorie</option>'+categories.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("");
 if(categories.some(c=>c.name===chosen)) $("#v-category").value=chosen;
 const counts=Object.fromEntries(categories.map(c=>[c.name,vehicles.filter(v=>v.category===c.name).length]));
 $("#admin-categories").innerHTML=categories.map(c=>`<tr><td>${esc(c.name)}</td><td>${counts[c.name]}</td><td><button class="btn outline small" data-edit-cat="${c.id}">Renommer</button> <button class="btn outline small" data-del-cat="${c.id}">Supprimer</button></td></tr>`).join("");
}
async function refreshCategories(){ categories=await api("/api/categories");renderCategories(); }
async function refreshAdmin(){
 [vehicles,news,categories]=await Promise.all([api("/api/vehicles"),api("/api/admin/news",{auth:true}),api("/api/categories")]);adminRows();renderCategories();
}
 function updateCropPreview(){
  const preview=$("#v-crop-preview"),url=$("#v-image-url").value.trim();
  if(preview.dataset.currentUrl!==url){preview.src=img(url);preview.dataset.currentUrl=url;}
  preview.style.cssText=cropStyle({crop_x:$("#v-crop-x").value,crop_y:$("#v-crop-y").value,crop_zoom:$("#v-crop-zoom").value});
  $("#v-crop-zoom-value").textContent=Math.round(Number($("#v-crop-zoom").value)*100)+" %";
 }
let pendingVehicleImage=null;
async function uploadVehicleImage(file){
 if(!file || !file.type.startsWith("image/"))throw Error("Choisis une image JPEG, PNG ou WebP.");
 if(file.size>5*1024*1024)throw Error("Image trop volumineuse (maximum 5 Mo).");
 const status=$("#v-upload-status");status.textContent="Envoi de l’image…";
 const headers={"Content-Type":file.type};if(token())headers.Authorization="Bearer "+token();
 try{
  const response=await fetch(API+"/api/admin/upload-vehicle-image",{method:"POST",headers,body:file});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"Échec de l’envoi de l’image.");
  $("#v-image-url").value=data.url;pendingVehicleImage=null;updateCropPreview();
  status.textContent="Image importée ! Ajuste maintenant le cadrage.";
 }catch(e){status.textContent=e.message;throw e;}
}
function initVehicleUpload(){
 const zone=$("#v-image-drop"),input=$("#v-image-file"),status=$("#v-upload-status");if(!zone||!input)return;
 const handle=async file=>{try{await uploadVehicleImage(file);}catch(e){notice(e.message,true);}};
 input.addEventListener("change",()=>{if(input.files?.[0])handle(input.files[0]);input.value="";});
 zone.addEventListener("click",e=>{if(e.target!==input)input.click();});
 zone.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();input.click();}});
 for(const name of ["dragenter","dragover"]){zone.addEventListener(name,e=>{e.preventDefault();zone.classList.add("drag-over");});}
 for(const name of ["dragleave","drop"]){zone.addEventListener(name,e=>{e.preventDefault();zone.classList.remove("drag-over");});}
 zone.addEventListener("drop",e=>{const file=[...(e.dataTransfer?.files||[])].find(f=>f.type.startsWith("image/"));if(file)handle(file);else status.textContent="Dépose une image valide.";});
 document.addEventListener("paste",e=>{if(page!=="admin"||$("#admin-panel")?.hidden)return;const file=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith("image/"))?.getAsFile();if(file){e.preventDefault();handle(file);}});
}
function resetVehicle(){$("#vehicle-form").reset();$("#v-brand").value="Ammu-Nation Nord";$("#v-id").value="";$("#v-crop-x").value=50;$("#v-crop-y").value=50;$("#v-crop-zoom").value=1;updateCropPreview();$("#vehicle-form-title").textContent="Ajouter un produit";}
function resetNews(){$("#news-form").reset();$("#n-id").value="";$("#news-form-title").textContent="Ajouter une événement";}
function refreshAppearanceForm(){
 const mapping={"a-logo":"site_logo_image","a-hero":"site_hero_image","a-catalogue":"site_catalogue_image","a-news":"site_news_image","a-association":"site_association_image","a-team":"site_team_image","a-contact":"site_contact_image"};
 for(const [id,key] of Object.entries(mapping)){
   $("#"+id).value=siteSettings[key]||"";
   const preview=$("#preview-"+id.slice(2));
   if(preview){preview.src=siteImage(siteSettings[key])||"assets/img/showroom.svg";}
 }
}
async function adminPage(){
 $("#login-form").onsubmit=async e=>{e.preventDefault();try{
  const result=await api("/api/admin/login",{method:"POST",body:{code:$("#admin-code").value}});
  sessionStorage.setItem("ammu_admin_token",result.token);$("#admin-code").value="";
  setLogged(true);notice("");refreshAppearanceForm();
  await Promise.allSettled([refreshAdmin(),loadAssociationEditor(),loadTeamEditor(),loadReservations()]);
 }catch(err){notice(err.message,true);}};
 $("#logout").onclick=async()=>{try{await api("/api/admin/logout",{method:"POST",auth:true});}catch{}sessionStorage.removeItem("ammu_admin_token");setLogged(false);notice("Déconnecté.");};
 
 $("#association-form").onsubmit=async e=>{
  e.preventDefault();
  try{
   await api("/api/admin/association",{method:"PUT",auth:true,body:{text:$("#association-text").value}});
   notice("Présentation de l’association enregistrée.");
  }catch(err){notice(err.message,true);}
 };
 $("#team-form").onsubmit=async e=>{
  e.preventDefault();const idx=$("#team-index").value;
  const member={first_name:$("#team-first").value.trim(),last_name:$("#team-last").value.trim(),rank:$("#team-rank").value.trim(),description:$("#team-description").value.trim(),image_url:$("#team-image").value.trim()};
  if(!member.first_name||!member.last_name||!member.rank)return notice("Le prénom, le nom et le grade sont obligatoires.",true);
  const next=[...teamMembers];if(idx==="")next.push(member);else next[Number(idx)]=member;
  try{await saveTeamMembers(next);resetTeamForm();notice("Membre enregistré.");}catch(err){notice(err.message,true);}
 };
 $("#team-image-file").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  const status=$("#team-image-status");status.textContent="Envoi de la photo…";
  try{
   if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Format JPG, PNG ou WebP requis.");
   const headers={"Content-Type":file.type};const t=token();if(t)headers.Authorization="Bearer "+t;
   const response=await fetch(API+"/api/admin/upload-vehicle-image",{method:"POST",headers,body:file});
   const data=await response.json();if(!response.ok)throw Error(data.error||"Envoi impossible");
   $("#team-image").value=data.url||data.image_url||"";
   if(!$("#team-image").value)throw Error("URL non reçue du serveur");
   status.textContent="Photo envoyée. Enregistrez le membre.";
  }catch(err){status.textContent=err.message;notice(err.message,true);}finally{e.target.value="";}
 });
 $("#team-reset").onclick=resetTeamForm;
 $("#team-admin-list").onclick=async e=>{
  const btn=e.target.closest("button");if(!btn)return;
  if(btn.dataset.editTeam!==undefined){const i=Number(btn.dataset.editTeam),m=teamMembers[i];if(!m)return;$("#team-index").value=i;$("#team-first").value=m.first_name;$("#team-last").value=m.last_name;$("#team-rank").value=m.rank;$("#team-description").value=m.description||"";$("#team-image").value=m.image_url||"";$("#team-form").scrollIntoView({behavior:"smooth"});}
  if(btn.dataset.deleteTeam!==undefined){const i=Number(btn.dataset.deleteTeam);if(!confirm("Supprimer ce membre de l’équipe ?"))return;try{await saveTeamMembers(teamMembers.filter((_,j)=>i!==j));notice("Membre supprimé.");}catch(err){notice(err.message,true);}}
 };
 // Navigation administrateur fluide // Navigation administrateur fluide, accessible et persistante pendant la session.
 const adminTabs=$$(".admin-tabs button");
 const adminPanes=$$("[data-pane]");
 function activateAdminTab(name){
  const selected=adminTabs.find(b=>b.dataset.tab===name)||adminTabs[0];
  if(!selected)return;
  adminTabs.forEach(b=>{const active=b===selected;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));b.setAttribute("role","tab");b.setAttribute("tabindex",active?"0":"-1");});
  adminPanes.forEach(p=>{p.classList.toggle("hidden",p.dataset.pane!==selected.dataset.tab);p.setAttribute("role","tabpanel");});
  sessionStorage.setItem("ammu_admin_tab",selected.dataset.tab);
 }
 adminTabs.forEach((b,i)=>{b.onclick=()=>activateAdminTab(b.dataset.tab);b.onkeydown=e=>{if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft")return;e.preventDefault();const next=adminTabs[(i+(e.key==="ArrowRight"?1:-1)+adminTabs.length)%adminTabs.length];activateAdminTab(next.dataset.tab);next.focus();};});
 activateAdminTab(sessionStorage.getItem("ammu_admin_tab")||"vehicles");
 if(token()){try{await api("/api/admin/me",{auth:true});setLogged(true);refreshAppearanceForm();await Promise.allSettled([refreshAdmin(),loadAssociationEditor(),loadTeamEditor(),loadReservations()]);}catch{sessionStorage.removeItem("ammu_admin_token");setLogged(false);}}
 $("#category-form").onsubmit=async e=>{
  e.preventDefault();const id=$("#cat-id").value;
  try{await api("/api/admin/categories"+(id?"/"+id:""),{method:id?"PUT":"POST",auth:true,body:{name:$("#cat-name").value}});$("#cat-id").value="";$("#cat-name").value="";await refreshCategories();notice("Catégorie enregistrée.");}catch(err){notice(err.message,true);}
 };
 $("#reset-cat").onclick=()=>{$("#cat-id").value="";$("#cat-name").value="";};
 $("#admin-categories").onclick=async e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.editCat){const c=categories.find(c=>c.id===Number(b.dataset.editCat));if(c){$("#cat-id").value=c.id;$("#cat-name").value=c.name;$("#cat-name").focus();}}
  if(b.dataset.delCat){if(!confirm("Supprimer cette catégorie ?"))return;try{await api("/api/admin/categories/"+b.dataset.delCat,{method:"DELETE",auth:true});await refreshCategories();notice("Catégorie supprimée.");}catch(err){notice(err.message,true);}}
 };
 $("#appearance-form").onsubmit=async e=>{
  e.preventDefault();const body={site_logo_image:$("#a-logo").value.trim(),site_hero_image:$("#a-hero").value.trim(),site_catalogue_image:$("#a-catalogue").value.trim(),site_news_image:$("#a-news").value.trim(),site_association_image:$("#a-association").value.trim(),site_team_image:$("#a-team").value.trim(),site_contact_image:$("#a-contact").value.trim()};
  try{await api("/api/admin/site-settings",{method:"PUT",auth:true,body});siteSettings=body;refreshAppearanceForm();applyAppearance();notice("Apparence du site enregistrée.");}catch(err){notice(err.message,true);}
 };
 ["logo","hero","catalogue","news","association","team","contact"].forEach(k=>$("#a-"+k).addEventListener("input",()=>{$("#preview-"+k).src=siteImage($("#a-"+k).value)||"assets/img/showroom.svg";}));

 ["v-image-url","v-crop-x","v-crop-y","v-crop-zoom"].forEach(id=>$("#"+id).addEventListener("input",updateCropPreview));
 const cropArea=$("#v-crop-area");let drag=null;
 cropArea.addEventListener("pointerdown",e=>{if(e.button!==0&&e.pointerType==="mouse")return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:Number($("#v-crop-x").value),startY:Number($("#v-crop-y").value)};cropArea.setPointerCapture(e.pointerId);cropArea.classList.add("dragging");});
 cropArea.addEventListener("pointermove",e=>{if(!drag||e.pointerId!==drag.id)return;const r=cropArea.getBoundingClientRect();const clamp=n=>Math.round(Math.max(0,Math.min(100,n)));$("#v-crop-x").value=clamp(drag.startX+(e.clientX-drag.x)/r.width*100);$("#v-crop-y").value=clamp(drag.startY+(e.clientY-drag.y)/r.height*100);updateCropPreview();});
 const endDrag=e=>{if(drag&&e.pointerId===drag.id){drag=null;cropArea.classList.remove("dragging");}};
 cropArea.addEventListener("pointerup",endDrag);cropArea.addEventListener("pointercancel",endDrag);
 $("#v-crop-reset").onclick=()=>{$("#v-crop-x").value=50;$("#v-crop-y").value=50;$("#v-crop-zoom").value=1;updateCropPreview();};
 updateCropPreview();initVehicleUpload();
 $("#reset-v").onclick=resetVehicle;$("#reset-n").onclick=resetNews;
 $("#vehicle-form").onsubmit=async e=>{e.preventDefault();const id=$("#v-id").value;
  const b={brand:$("#v-brand").value,model:$("#v-name").value,category:$("#v-category").value,price:Number($("#v-price").value),description:$("#v-description").value,image_url:$("#v-image-url").value,featured:$("#v-featured").checked,seats:Number($("#v-seats").value),trunk_kg:Number($("#v-trunk").value),crop_x:Number($("#v-crop-x").value),crop_y:Number($("#v-crop-y").value),crop_zoom:Number($("#v-crop-zoom").value)};
  try{await api("/api/admin/vehicles"+(id?"/"+id:""),{auth:true,method:id?"PUT":"POST",body:b});resetVehicle();await refreshAdmin();notice("Produit enregistré.");}catch(err){notice(err.message,true);}
 };
 $("#news-form").onsubmit=async e=>{e.preventDefault();const id=$("#n-id").value;
  try{await api("/api/admin/news"+(id?"/"+id:""),{auth:true,method:id?"PUT":"POST",body:{title:$("#n-title").value,content:$("#n-content").value,image_url:$("#n-image-url").value,event_date:$("#n-event-date").value,published:$("#n-published").checked}});resetNews();await refreshAdmin();notice("Événement enregistrée.");}catch(err){notice(err.message,true);}
 };
 $("#admin-reservations").addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.bookId||b.dataset.bookDelete;if(!id)return;
  try{if(b.dataset.bookDelete){if(!confirm('Supprimer cette demande ?'))return;await api('/api/admin/reservations/'+id,{method:'DELETE',auth:true});}
  else await api('/api/admin/reservations/'+id,{method:'PUT',auth:true,body:{status:b.dataset.bookStatus}});
  await loadReservations();notice('Demande mise à jour.');}catch(err){notice(err.message,true);}
 });
 $("#admin-panel").addEventListener("click",async e=>{
  const b=e.target.closest("button");if(!b)return;
  let id;
  if(id=b.dataset.editV){const v=vehicles.find(x=>x.id===Number(id));if(!v)return;$("#v-id").value=v.id;$("#v-name").value=v.model;$("#v-brand").value=v.brand;$("#v-category").value=v.category;$("#v-price").value=v.price;$("#v-seats").value=v.seats??0;$("#v-trunk").value=v.trunk_kg??0;$("#v-image-url").value=v.image_url||"";$("#v-crop-x").value=v.crop_x??50;$("#v-crop-y").value=v.crop_y??50;$("#v-crop-zoom").value=v.crop_zoom??1;updateCropPreview();$("#v-description").value=v.description||"";$("#v-featured").checked=!!v.featured;$("#vehicle-form-title").textContent="Modifier le produit";$("#vehicle-form").scrollIntoView({behavior:"smooth"});}
  if(id=b.dataset.editN){const n=news.find(x=>x.id===Number(id));if(!n)return;$("#n-id").value=n.id;$("#n-title").value=n.title;$("#n-content").value=n.content;$("#n-image-url").value=n.image_url||"";$("#n-event-date").value=n.event_date||"";$("#n-published").checked=!!n.published;$("#news-form-title").textContent="Modifier l'événement";$("#news-form").scrollIntoView({behavior:"smooth"});}
  if(id=b.dataset.delV){if(!confirm("Supprimer ce produit ?"))return;try{await api("/api/admin/vehicles/"+id,{auth:true,method:"DELETE"});await refreshAdmin();}catch(err){notice(err.message,true);}}
  if(id=b.dataset.delN){if(!confirm("Supprimer cette événement ?"))return;try{await api("/api/admin/news/"+id,{auth:true,method:"DELETE"});await refreshAdmin();}catch(err){notice(err.message,true);}}
 });
}
document.addEventListener("DOMContentLoaded",async()=>{layout();try{if(page==="admin"){adminPage();api("/api/site-settings").then(v=>{siteSettings=v;applyAppearance();refreshAppearanceForm();}).catch(()=>{});}else{siteSettings=await api("/api/site-settings");applyAppearance();if(page==="association")await associationPage();else if(page==="equipe")await teamPage();else await publicPage();}}catch(err){notice(err.message,true);}});
})();
