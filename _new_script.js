const API=window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1'?'http://localhost:3000':'';
let running=false,cvC={},selected=new Set(),allJobs=[],currentCVId=null,profileSkills=[],profileId=null;
const USER_KEY='jobAgentUserId';
let userId=localStorage.getItem(USER_KEY);
let keywords=JSON.parse(localStorage.getItem('jobAgentKw')||'["Supervisor de Ventas","Coordinador","Vendedor","Ejecutivo de Ventas","Asesor de Ventas","Merchandiser","Capacitador","Sales Trainer","Retail Supervisor","Jefe de Sector","Coordinador Retail","Servicio al Cliente","Call Center","Analista de Datos","Soporte Técnico","Desarrollador Web","Frontend"]');

async function ensureProfile(){
  if(!userId){document.getElementById('welcomeModal').classList.remove('hidden');return false}
  try{
    const d=await api('/api/profiles/'+userId);
    if(d.ok&&d.profile){
      profileId=userId;
      if(d.profile.name)localStorage.setItem('pfName',d.profile.name);
      if(d.profile.title)localStorage.setItem('pfTitle',d.profile.title);
      if(d.profile.email)localStorage.setItem('pfEmail',d.profile.email);
      if(d.profile.location)localStorage.setItem('pfLocation',d.profile.location);
      if(d.profile.linkedin_url)localStorage.setItem('pfLinkedin',d.profile.linkedin_url);
      if(d.profile.github_url)localStorage.setItem('pfGithub',d.profile.github_url);
      if(d.profile.web_url)localStorage.setItem('pfWeb',d.profile.web_url);
      if(d.profile.phone)localStorage.setItem('pfPhone',d.profile.phone);
      if(d.profile.keywords_json){
        const sk=JSON.parse(d.profile.keywords_json);
        if(sk.length){keywords=sk;localStorage.setItem('jobAgentKw',JSON.stringify(keywords));renderKw()}
      }
      if(d.profile.skills_json){const ps=JSON.parse(d.profile.skills_json);if(ps.length)localStorage.setItem('pfSkills',ps.map(function(s){return s.name}).join(', '))}
      return true
    }
    userId=null;localStorage.removeItem(USER_KEY);
    document.getElementById('welcomeModal').classList.remove('hidden');
    return false
  }catch(e){console.error('Profile check:',e);return true}
}
async function registerUser(name,email){
  const id=crypto.randomUUID();
  const body={id:id,name:name,email:email,title:'',location:'',linkedin_url:'',github_url:'',web_url:'',phone:'',headline:'',summary:'',skills:[],keywords:keywords};
  try{
    const d=await api('/api/profiles',{method:'POST',body:JSON.stringify(body)});
    if(d.ok){localStorage.setItem(USER_KEY,id);userId=id;profileId=id;document.getElementById('welcomeModal').classList.add('hidden');localStorage.setItem('pfName',name);document.getElementById('headerName').textContent=name;lg('\u2705 Registro: '+name,'success');return true}
  }catch(e){console.error('Register:',e)}
  return false
}
function continueAsGuest(){document.getElementById('welcomeModal').classList.add('hidden');lg('\U0001f464 Invitado','success');profileId=null}
function submitRegister(){const n=document.getElementById('regName').value,e=document.getElementById('regEmail').value;if(!n||!e)return alert('Completa nombre y email');registerUser(n,e)}

function toggleTheme(){
  const h=document.documentElement;
  if(h.classList.contains('light')){h.classList.remove('light');h.classList.add('theme-dark');document.getElementById('themeBtn').textContent='\U0001f319';localStorage.setItem('theme','dark')}
  else{h.classList.add('light');h.classList.remove('theme-dark');document.getElementById('themeBtn').textContent='\u2600\ufe0f';localStorage.setItem('theme','light')}
}
(function(){if(localStorage.getItem('theme')==='light'){document.documentElement.classList.add('light');document.documentElement.classList.remove('theme-dark');document.getElementById('themeBtn').textContent='\u2600\ufe0f'}})();

function renderKw(){const b=document.getElementById('kwBar');b.innerHTML=keywords.map(function(k){return '<span class="kw-tag">'+k+'<span class="kw-del" onclick="removeKw(\\''+k.replace(/'/g,"\\'")+'\\')">\u00d7</span></span>'}).join('')+'<span class="kw-add" onclick="addKw()">+ Agregar</span>'}
function addKw(){const i=prompt('Nueva keyword:');if(i&&i.trim()){keywords.push(i.trim());localStorage.setItem('jobAgentKw',JSON.stringify(keywords));renderKw()}}
function removeKw(k){keywords=keywords.filter(function(x){return x!==k});localStorage.setItem('jobAgentKw',JSON.stringify(keywords));renderKw()}
function openProfileModal(){
  document.getElementById('pfName').value=localStorage.getItem('pfName')||'Alejandro Gutierrez Zavala';
  document.getElementById('pfTitle').value=localStorage.getItem('pfTitle')||'Supervisor de Ventas | Retail';
  document.getElementById('pfEmail').value=localStorage.getItem('pfEmail')||'alejandrogtzz93@gmail.com';
  document.getElementById('pfLocation').value=localStorage.getItem('pfLocation')||'Monterrey, Nuevo Le\u00f3n';
  document.getElementById('pfLinkedin').value=localStorage.getItem('pfLinkedin')||'https://www.linkedin.com/in/alejandro-gutierrez-zavala-181994232/';
  document.getElementById('pfGithub').value=localStorage.getItem('pfGithub')||'https://github.com/Alemty';
  document.getElementById('pfWeb').value=localStorage.getItem('pfWeb')||'alemty.eth';
  document.getElementById('pfPhone').value=localStorage.getItem('pfPhone')||'';
  document.getElementById('pfSkills').value=localStorage.getItem('pfSkills')||'Ventas, CRM, Salesforce, Retail, Liderazgo de equipo, Merchandising, Capacitaci\u00f3n, An\u00e1lisis de datos, Servicio al cliente, Negociaci\u00f3n, Inventarios, KPI, Reporting, Excel avanzado, Power BI';
  document.getElementById('profileModal').classList.remove('hidden')
}
function saveProfile(){
  ['pfName','pfTitle','pfEmail','pfLocation','pfLinkedin','pfGithub','pfWeb','pfPhone','pfSkills'].forEach(function(id){localStorage.setItem(id,document.getElementById(id).value)});
  document.getElementById('profileModal').classList.add('hidden');
  document.getElementById('headerName').textContent=localStorage.getItem('pfName');
  if(profileId){
    var skillsList=document.getElementById('pfSkills').value.split(',').map(function(s){return s.trim()}).filter(Boolean).map(function(name){return {name:name,level:'intermediate',category:'soft'}});
    api('/api/profiles/'+profileId,{method:'PUT',body:JSON.stringify({name:document.getElementById('pfName').value,title:document.getElementById('pfTitle').value,email:document.getElementById('pfEmail').value,location:document.getElementById('pfLocation').value,linkedin_url:document.getElementById('pfLinkedin').value,github_url:document.getElementById('pfGithub').value,web_url:document.getElementById('pfWeb').value,phone:document.getElementById('pfPhone').value,skills:skillsList,keywords:keywords})})
  }
}

async function api(p,o){o=o||{};return fetch(API+p,{headers:{'Content-Type':'application/json'},...o}).then(function(r){return r.json()})}
function closeModal(id){document.getElementById(id).classList.add('hidden')}
function showManualModal(){document.getElementById('manualModal').classList.remove('hidden')}
function closeCVModal(){document.getElementById('cvModal').classList.add('hidden');document.getElementById('cvFrameContainer').innerHTML='<div class="empty" style="height:200px"><div class="spinner" style="margin:0 auto 8px"></div><p>Generando CV...</p></div>';document.getElementById('btnDlCV').classList.add('hidden');currentCVId=null}
function sp(t,p){var e=document.getElementById('progressCard');e.classList.remove('hidden');document.getElementById('progressText').textContent=t;document.getElementById('progressFill').style.width=p+'%'}
function lg(m,c){document.getElementById('logOutput').innerHTML+='<div'+(c?' class="log-'+c+'"':'')+'>'+m+'</div>';document.getElementById('logOutput').scrollTop=document.getElementById('logOutput').scrollHeight}
function hp(){document.getElementById('progressCard').classList.add('hidden');document.getElementById('logOutput').innerHTML=''}

async function loadStats(){var d=await api('/stats');if(!d.ok)return;var s=d.stats;document.getElementById('totalJobs').textContent=s.totalJobs;document.getElementById('totalApps').textContent=s.appliedJobs;document.getElementById('avgMatch').textContent=s.averageMatchScore.toFixed(0)+'%';document.getElementById('todayApps').textContent=s.todayApplications+'/'+s.maxDailyApplications}
async function loadJobs(){var pf=document.getElementById('platformFilter').value,sf=document.getElementById('statusFilter').value,p=new URLSearchParams({limit:'50'});if(pf)p.set('platform',pf);var d=await api('/jobs?'+p.toString());if(!d.ok||!d.jobs){document.getElementById('jobsList').innerHTML='<div class="empty"><div class="ei">\U0001f52e</div><p>Error</p></div>';return}
allJobs=d.jobs;document.getElementById('jobsCount').textContent=allJobs.length;var j=allJobs;if(sf==='applied')j=j.filter(function(x){return x.applied});if(sf==='pending')j=j.filter(function(x){return !x.applied});renderJobs(j)}

function renderJobs(jobs){
  var l=document.getElementById('jobsList');
  if(!jobs.length){l.innerHTML='<div class="empty"><div class="ei">\U0001f52e</div><p>No hay vacantes</p></div>';updateBatchBar();return}
  l.innerHTML=jobs.map(function(j){
    var b=j.match_score>=60?'s-high':j.match_score>=30?'s-mid':'s-low',ic=j.match_score>=60?'\u2705':j.match_score>=30?'\u26a0\ufe0f':'\u274c',sk=j.matched_skills_json?JSON.parse(j.matched_skills_json):[],sel=selected.has(j.id)?'selected':'';
    return '<div class="job-item '+sel+'" id="ji-'+j.id+'"><div class="job-check"><input type="checkbox" '+(selected.has(j.id)?'checked':'')+' onchange="toggleSel(\\''+j.id+'\\')"/></div><div class="job-info"><div class="job-title" onclick="showDetail(\\''+j.id+'\\')">'+ic+' '+j.title+'</div><div class="job-meta">'+(j.company||'?')+' \u00b7 '+(j.location||'?')+'</div>'+(sk.length?'<div class="job-skills">'+sk.slice(0,4).join(' \u00b7 ')+(sk.length>4?' \u00b7 +'+(sk.length-4):'')+'</div>':'')+'</div><div class="job-actions"><span class="score-b '+b+'">'+j.match_score+'%</span>'+(j.applied?'<span class="ab">\u2705 Postulada</span>':'<span class="pb">\u23f3 Pendiente</span>')+'<button class="btn btn-xs btn-o" onclick="showDetail(\\''+j.id+'\\')" title="Detalle">\U0001f50d</button><button class="btn btn-xs btn-g" onclick="singleGenCV(\\''+j.id+'\\')" title="CV">\U0001f4c4</button>'+(j.url?'<a href="'+j.url+'" target="_blank" class="btn btn-xs btn-p" title="LinkedIn">\U0001f517</a>':'')+'</div></div>'
  }).join('');updateBatchBar()}

function toggleSel(id){if(selected.has(id))selected.delete(id);else selected.add(id);var el=document.getElementById('ji-'+id);if(el)el.classList.toggle('selected');updateBatchBar()}
function selectAll(){(document.getElementById('statusFilter').value==='applied'?allJobs.filter(function(x){return x.applied}):document.getElementById('statusFilter').value==='pending'?allJobs.filter(function(x){return !x.applied}):allJobs).forEach(function(j){if(!j.applied)selected.add(j.id)});renderJobs(document.getElementById('statusFilter').value==='applied'?allJobs.filter(function(x){return x.applied}):document.getElementById('statusFilter').value==='pending'?allJobs.filter(function(x){return !x.applied}):allJobs)}
function deselectAll(){selected.clear();renderJobs(document.getElementById('statusFilter').value==='applied'?allJobs.filter(function(x){return x.applied}):document.getElementById('statusFilter').value==='pending'?allJobs.filter(function(x){return !x.applied}):allJobs)}
function updateBatchBar(){var bar=document.getElementById('batchBar');document.getElementById('selCount').textContent=selected.size+' seleccionadas';if(selected.size>0)bar.classList.remove('hidden');else bar.classList.add('hidden')}

async function showDetail(id){
  var d=await api('/jobs/'+id);if(!d.ok||!d.job)return;
  var j=d.job,sk=j.skills_json?JSON.parse(j.skills_json):[],mk=j.matched_skills_json?JSON.parse(j.matched_skills_json):[],ms=j.missing_skills_json?JSON.parse(j.missing_skills_json):[];
  document.getElementById('detailTitle').textContent='\U0001f4cb '+j.title;
  document.getElementById('detailContent').innerHTML='<table class="job-detail-table"><tr><td>Empresa</td><td><strong>'+j.company+'</strong></td></tr><tr><td>Ubicaci\u00f3n</td><td>'+j.location+'</td></tr><tr><td>Match</td><td><span class="score-b '+(j.match_score>=60?'s-high':j.match_score>=30?'s-mid':'s-low')+'">'+j.match_score+'%</span></td></tr><tr><td>Modalidad</td><td>'+(j.modality||'No especificada')+'</td></tr><tr><td>Salario</td><td>'+(j.salary||'No especificado')+'</td></tr><tr><td>Skills</td><td>'+(sk.length?sk.join(', '):'No listadas')+'</td></tr>'+(mk.length?'<tr><td>\u2705 Matched</td><td style="color:var(--green)">'+mk.join(', ')+'</td></tr>':'')+(ms.length?'<tr><td>\u274c Missing</td><td style="color:var(--red)">'+ms.join(', ')+'</td></tr>':'')+(j.analysis?'<tr><td>An\u00e1lisis</td><td style="font-size:11px;color:var(--text-dim)">'+j.analysis+'</td></tr>':'')+'<tr><td>Descripci\u00f3n</td><td><div class="desc-text">'+(j.description||'No disponible')+'</div></td></tr>'+(j.url?'<tr><td>Link</td><td><a href="'+j.url+'" target="_blank" style="color:var(--primary)">\U0001f517 Abrir</a></td></tr>':'')+'<tr><td>Estado</td><td>'+(j.applied?'<span class="ab">\u2705 Postulada</span>':'<span class="pb">\u23f3 Pendiente</span>')+'</td></tr></table><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-sm btn-g" onclick="singleGenCV(\\''+j.id+'\\')">\U0001f4c4 Generar CV</button>'+(j.url?'<a href="'+j.url+'" target="_blank" class="btn btn-sm btn-p">\U0001f517 Ir a LinkedIn</a>':'')+'</div>';document.getElementById('detailModal').classList.remove('hidden')}

async function singleGenCV(id){lg('\U0001f4c4 Generando CV...');sp('Generando CV...',30);try{var d=await api('/api/agent/cv/'+id,{method:'POST'});if(d.ok&&d.html){cvC[id]=d.html;currentCVId=id;viewCV(id,d.title||'Vacante',d.html)}else{lg('\u274c Error','error')}}catch(e){lg('\u274c '+e.message,'error')}setTimeout(function(){hp()},1000)}
async function batchGenCV(){if(!selected.size)return;sp('\U0001f4c4 Generando '+selected.size+' CVs...',10);lg('\U0001f4c4 Generando CVs...');var cc=0,i=0;for(const id of selected){i++;sp('\U0001f4c4 CV '+i+'/'+selected.size+'...',Math.round(i/selected.size*80));try{var d=await api('/api/agent/cv/'+id,{method:'POST'});if(d.ok&&d.html){cvC[id]=d.html;cc++;lg('  \U0001f4c4 '+d.title+' ('+d.matchScore+'%)','success')}}catch(e){lg('  \u26a0\ufe0f','error')}}sp('\u2705 '+cc+' CVs',100);lg('\u2705 '+cc+' CVs generados','success');setTimeout(function(){hp()},1500)}
async function batchMarkApplied(){if(!selected.size)return;sp('\u2705 Marcando...',10);lg('\u2705 Marcando postulaciones...');var ac=0,i=0;for(const id of selected){i++;sp('\u2705 '+i+'/'+selected.size+'...',Math.round(i/selected.size*100));try{var d=await api('/api/agent/mark-applied',{method:'POST',body:JSON.stringify({jobId:id,profileId:profileId})});if(d.ok)ac++;lg('  \u2705 Marcada','success')}catch(e){lg('  \u26a0\ufe0f','error')}}sp('\u2705 '+ac+' postulaciones',100);lg('\u2705 Total: '+ac,'success');selected.clear();setTimeout(function(){hp();loadJobs();loadStats()},1000)}
function viewCV(id,tit,html){document.getElementById('cvModalTitle').textContent='\U0001f4c4 CV \u2014 '+(tit||'Vacante');document.getElementById('cvModal').classList.remove('hidden');var c=document.getElementById('cvFrameContainer');if(html||cvC[id]){var h=html||cvC[id];c.innerHTML='<iframe id="cvFrame" srcdoc="'+h.replace(/"/g,'&quot;')+'"></iframe>';document.getElementById('btnDlCV').classList.remove('hidden')}}
function downloadCurrentCV(){var id=currentCVId;if(!id||!cvC[id])return;var blob=new Blob([cvC[id]],{type:'text/html'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='CV_'+(allJobs.find(function(j){return j.id===id})?.title||'vacante').replace(/[^a-zA-Z0-9]/g,'_').substring(0,40)+'.html';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url)}

async function runScrape(){if(running)return;running=true;document.getElementById('btnScrape').classList.add('btn-p');sp('Buscando...',10);lg('\U0001f50d Iniciando con '+keywords.length+' keywords...');try{var d=await api('/api/scrape',{method:'POST',body:JSON.stringify({keywords:keywords,location:'Monterrey, Nuevo Le\u00f3n, M\u00e9xico',maxResults:50,profileId:profileId})});if(d.ok){sp('\u2705 '+d.scrape.total+' vacantes',100);lg('\u2705 '+d.scrape.total+' totales | '+d.scrape.matched+' match','success');(d.jobs||[]).forEach(function(j){lg('  \u2022 '+j.title+' \u2014 '+j.company)})}else{sp('\u274c Error',100);lg('\u274c '+(d.error||'desconocido'),'error')}}catch(e){sp('\u274c Error',100);lg('\u274c '+e.message,'error')}setTimeout(function(){hp();loadJobs();loadStats()},2000);running=false;document.getElementById('btnScrape').classList.remove('btn-p')}
async function runPipeline(){if(running)return;running=true;document.getElementById('btnPipeline').classList.add('btn-g');try{sp('\U0001f50d Scraping...',10);var sd=await api('/api/scrape',{method:'POST',body:JSON.stringify({keywords:keywords,location:'Monterrey, Nuevo Le\u00f3n, M\u00e9xico',maxResults:30,profileId:profileId})});lg('\u2705 '+(sd.scrape?.total||0)+' encontradas','success');sp('\U0001f4c4 Generando CVs...',40);var jd=await api('/jobs?limit=30'),pj=(jd.jobs||[]).filter(function(j){return !j.applied}).sort(function(a,b){return b.match_score-a.match_score}).slice(0,5);var cc=0;for(const job of pj){try{var cr=await api('/api/agent/cv/'+job.id,{method:'POST'});if(cr.ok){cvC[job.id]=cr.html;lg('  \U0001f4c4 '+job.title+' ('+job.match_score+'%)');cc++}}catch(e){lg('  \u26a0\ufe0f Error')}}lg('\u2705 '+cc+' CVs generados','success');sp('\u2705 Listo',100);lg('\U0001f3af Pipeline completo!','success');setTimeout(function(){hp();loadJobs();loadStats()},1000)}catch(e){sp('\u274c Error',100);lg('\u274c '+e.message,'error')}running=false;document.getElementById('btnPipeline').classList.remove('btn-g')}
async function addManualJob(){var u=document.getElementById('manualUrl').value;if(!u)return;try{var d=await api('/jobs',{method:'POST',body:JSON.stringify({url:u,platform:'manual',title:u.split('/').pop()||'Manual',profile_id:profileId})});if(d.ok){closeModal('manualModal');loadJobs();loadStats()}else alert('Error: '+(d.error||'no se pudo agregar'))}catch(e){alert('Error: '+e.message)}}
function refreshAll(){loadStats();loadJobs()}

(async function(){
  renderKw();
  if(localStorage.getItem(USER_KEY)){
    await ensureProfile();
    var name=localStorage.getItem('pfName');
    if(name)document.getElementById('headerName').textContent=name+(profileId?' \u00b7 \u2601\ufe0f':'');
  }
  refreshAll();
})()
