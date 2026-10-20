(function(){
'use strict';
const session=window.__phdPrivateSession;
if(!session){document.body.textContent='请先登录';return;}
const now=new Date();
function iso(d){const v=new Date(d);return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0')}
const TODAY=iso(now);
const names=['日','一','二','三','四','五','六'];
const statusOptions=['计划中','进行中','待复核','已完成','暂缓'];
const topics=[
 {id:'method',title:'研究方法',detail:'方法构思 · 假设检验 · 代码验证',status:'进行中'},
 {id:'flow',title:'研究实验',detail:'案例设计 · 基准对照 · 结果复现',status:'进行中'},
 {id:'optim',title:'理论与机制',detail:'数学推导 · 误差分析 · 机制检验',status:'进行中'},
 {id:'manuscript',title:'论文与研究叙事',detail:'问题定位 · 相关工作 · 实验与讨论',status:'计划中'}
];
const chapterDefault=[
 {id:'problem',title:'研究问题与文献基础',detail:'把真正要解决的问题说清楚，形成可检验的研究假设',status:'进行中'},
 {id:'methods',title:'方法与可信实验',detail:'建立正确实现、对照实验及失败案例解释',status:'进行中'},
 {id:'paper',title:'阶段性论文与投稿',detail:'组织 Introduction / Methods / Results，并逐步投稿',status:'计划中'},
 {id:'community',title:'学术交流与合作',detail:'组会、报告、会议、反馈与研究合作',status:'计划中'},
 {id:'thesis',title:'博士论文与毕业准备',detail:'沉淀可复用成果，逐步搭建博士论文框架',status:'计划中'}
];
const writingDefault=[
 {id:'intro',title:'Introduction',detail:'问题背景、研究缺口、贡献定位',status:'计划中'},
 {id:'related',title:'Related Work',detail:'归一化、PINN 损失权重、优化器、流场重构',status:'计划中'},
 {id:'method',title:'Methods',detail:'统计变换、PDE 一致性、优化机制',status:'计划中'},
 {id:'results',title:'Experiments & Results',detail:'四种预处理与正反例分析',status:'计划中'},
 {id:'discussion',title:'Discussion & Limitations',detail:'适用条件、失效场景、敏感性',status:'计划中'}
];
const defaultState=()=>({version:1,created:TODAY,year:2,entries:[],tasks:[],reviews:{},achievements:[],tracks:topics.map(x=>({...x})),milestones:chapterDefault.map(x=>({...x})),writing:writingDefault.map(x=>({...x})),daybook:[],activityEvents:[]});
function load(){try{
 const saved=window.__phdWorkspaceDocument || null;
 if(!saved||saved.version!==1) return defaultState();
 const base=defaultState();if(Array.isArray(saved.daybook))base.daybook=saved.daybook.slice(0,5000);if(Array.isArray(saved.activityEvents))base.activityEvents=saved.activityEvents.slice(0,5000);if(saved.projectday && typeof saved.projectday==='object' && !Array.isArray(saved.projectday))base.projectday=saved.projectday;
 if(saved.life && typeof saved.life==='object' && !Array.isArray(saved.life))base.life=saved.life;
 if(Array.isArray(saved.vaultFiles))base.vaultFiles=saved.vaultFiles.slice(0,5000);for(const k of ['entries','tasks','achievements'])if(Array.isArray(saved[k]))base[k]=saved[k].slice(0,5000);
 if(saved.reviews&&typeof saved.reviews==='object'&&!Array.isArray(saved.reviews))base.reviews=saved.reviews;
 for(const k of ['tracks','milestones','writing'])if(Array.isArray(saved[k]))base[k]=base[k].map(x=>({...x,...(saved[k].find(v=>v&&v.id===x.id)||{})}));
 if(Number.isInteger(saved.year)&&saved.year>=1&&saved.year<=10)base.year=saved.year;
 return base;
 }catch(e){return defaultState()}}
let db=load();
let view='dashboard', kind='实验',selected=TODAY,displayMonth=new Date(now.getFullYear(),now.getMonth(),1),weekOffset=0,papers=[];
const $=id=>document.getElementById(id);
let pendingRemoteSave=Promise.resolve();
function save(){
  const snapshot=JSON.parse(JSON.stringify(db));
  // Serialize writes to avoid out-of-order updates that could overwrite a newer entry.
  pendingRemoteSave=pendingRemoteSave.catch(()=>{}).then(async()=>{
    const {error}=await session.client.from('phd_workspace_state').upsert({
      owner_id:session.user.id,document:snapshot,updated_at:new Date().toISOString()
    },{onConflict:'owner_id'});
    if(error) throw error;
  }).catch(err=>{console.error('Workspace save failed',err);toast('云端保存失败，请先导出备份并检查连接');});
  return true;
}
function safe(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function truncate(s,n=130){s=String(s||'');return s.length>n?s.slice(0,n)+'…':s}
function dateObj(x){return new Date(x+'T12:00:00')}
function labelDate(x){const d=dateObj(x);return(d.getMonth()+1)+'/'+d.getDate()}
function verboseDate(x){const d=dateObj(x);return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日 · 周'+names[d.getDay()]}
function addDays(x,d){const v=dateObj(x);v.setDate(v.getDate()+d);return iso(v)}
function monday(x){const v=dateObj(x);v.setDate(v.getDate()-((v.getDay()+6)%7));return iso(v)}
function getWeek(){return addDays(monday(TODAY),7*weekOffset)}
function stats(){return {entries:db.entries.length,tasks:db.tasks.length,done:db.tasks.filter(x=>x.done).length,achievements:db.achievements.length}}
let toastTimer;function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2900)}
function counts(date){return{n:db.entries.filter(x=>x.date===date).length,t:db.tasks.filter(x=>x.due===date).length}}
function statusSelect(which,id,current){return '<select data-status="'+which+'" data-id="'+safe(id)+'" aria-label="更新进度">'+statusOptions.map(x=>'<option value="'+x+'"'+(x===current?' selected':'')+'>'+x+'</option>').join('')+'</select>'}
function tracksHTML(){return db.tracks.map((x,i)=>'<div class="track"><span class="track-number">0'+(i+1)+'</span><div class="track-text"><strong>'+safe(x.title)+'</strong><p>'+safe(x.detail)+'</p></div>'+statusSelect('tracks',x.id,x.status)+'</div>').join('')}
function renderDashboard(){
  $('profileYear').textContent='我的空间';
  $('homeGreetingDate').textContent=verboseDate(TODAY);
  const root=$('homeDaybook');
  if(!window.__weekboardLoader)window.__weekboardLoader=import("./weekboard.js?v=20261020-w2");
  window.__weekboardLoader.then(mod=>{
    if(view==='dashboard')mod.renderWeekboard(root,{data:()=>db,save,toast});
  }).catch(error=>{
    console.error('Daybook could not load',error);
    if(view==='dashboard')root.innerHTML='<p class="empty">每周时间表暂时无法加载，请刷新页面。</p>';
  });
}
function uid(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function addEntry(textValue,kindValue,dateValue){
 const t=String(textValue||'').trim();
 if(!t){toast('先写下你想记录的内容');return false}
 if(t.length>12000){toast('单条记录最多 12000 字');return false}
 db.entries.push({id:uid(),kind:kindValue||kind,date:dateValue||selected,text:t,created:new Date().toISOString()});
 save();return true;
}
function controls(){
 return '<nav class="navstrip" aria-label="页面导航"><button data-view="dashboard"'+(view==='dashboard'?' class="active"':'')+'>⌂ 首页</button><button data-view="projectday"'+(view==='projectday'?' class="active"':'')+'>▥ 科研执行</button><button data-view="life"'+(view==='life'?' class="active"':'')+'>♡ 生活</button><button data-view="vault"'+(view==='vault'?' class="active"':'')+'>▣ 资料库</button><button data-view="experiments"'+(view==='experiments'?' class="active"':'')+'>实验</button><button data-view="literature"'+(view==='literature'?' class="active"':'')+'>文献</button><button data-view="review"'+(view==='review'?' class="active"':'')+'>周复盘</button><button data-view="milestones"'+(view==='milestones'?' class="active"':'')+'>博士路线图</button><button data-view="settings"'+(view==='settings'?' class="active"':'')+'>备份与设置</button></nav>'
}
const meta={
 projectday:['科研执行中心','项目进度、任务优先级、专注投入和每日复盘。'],
 life:['生活空间','在科研之外，也记录自己的日常节奏、习惯、心情和生活计划。'],
 vault:['私人资料库','图片、文档、PDF 和研究材料保存在受保护的云端，支持跨设备读取。'],
 experiments:['实验日志','每次实验的目的、变量、结果、失败原因和下一步都值得追踪。'],
 questions:['研究问题库','把灵感变成假设，把卡住的地方变成可验证的问题。'],
 literature:['AI × 流体文献','每日推荐与中文摘要、论文筛选、阅读记录。'],
 writing:['论文写作','每次修改、一次推导、一张结果图，都是论文进度。'],
 growth:['技能与成长','这里记录学会的工具、科研方法与心态变化。'],
 milestones:['博士路线图','关注实际成长与研究成熟度，而不是机械地数毕业倒计时。'],
 review:['每周复盘','每周回顾一次：做成了什么、卡在何处、下一步是什么。'],
 outcomes:['成果档案','成果不仅是论文，也可以是可复现代码、学术报告和重要突破。'],
 settings:['隐私与数据管理','科研成长记录保存在私人云端，请定期导出备份。']
};
function notesFor(k){
 const es=db.entries.filter(e=>k==='all'||e.kind===k).slice().reverse().slice(0,20);
 return es.length?es.map(e=>'<div class="row-card"><div class="row-head"><small class="muted">'+safe(e.date)+' · '+safe(e.kind)+'</small><button class="text-btn" data-act="delete-entry" data-id="'+safe(e.id)+'">删除</button></div><p style="white-space:pre-wrap;color:#364763">'+safe(e.text)+'</p></div>').join(''):'<div class="row-card empty">还没有这一类记录，可以从今天开始。</div>';
}
function entryForm(k,prompt){return '<form class="form-stack" data-form="module-entry" data-kind="'+k+'"><label>记录时间</label><input name="date" type="date" value="'+selected+'" required/><label>记录内容</label><textarea name="text" required maxlength="12000" placeholder="'+safe(prompt)+'"></textarea><button type="submit">保存到我的科研日志</button></form>'}
function renderModule(){
 const el=$('moduleContent');
 if(view==='life' || view==='vault'){
   el.innerHTML='<section class="panel"><h3>正在加载私人空间…</h3></section>';
   const isLife=view==='life';
   const key=isLife?'__lifeLoader':'__vaultLoader';
   if(!window[key])window[key]=import(isLife?'./life.js?v=20261020-l3':'./vault.js?v=20261020-v1');
   window[key].then(mod=>{
     if(view!==(isLife?'life':'vault'))return;
     const api={data:()=>db,save,toast,session};
     if(isLife)mod.renderLife(el,api);else mod.renderVault(el,api);
   }).catch(error=>{
     console.error('Personal module failed',error);
     if(view===(isLife?'life':'vault'))el.innerHTML='<section class="panel"><h3>模块暂时无法加载</h3><p>请刷新页面重试。</p></section>';
   });
   return;
 }
 if(view==='projectday'){
   el.innerHTML='<section class="panel"><h3>正在加载科研执行中心…</h3></section>';
   if(!window.__projectDayLoader)window.__projectDayLoader=import("./projectday.js?v=20261020-pd2");
   window.__projectDayLoader.then(mod=>{
     if(view==='projectday')mod.renderProjectDay(el,{data:()=>db,save,toast});
   }).catch(error=>{
     console.error("ProjectDay failed to load",error);
     if(view==='projectday')el.innerHTML='<section class="panel"><h3>执行中心加载失败</h3><p>请刷新页面重试。</p></section>';
   });
   return;
 }

 const h=meta[view]||meta.experiments;
 let body='';
 if(view==='experiments'){
 body='<div class="module-layout"><div class="content-grid"><section class="panel"><h3>我的研究主线</h3><p class="muted small">这些是根据你现有研究方向整理的初始路线，并不意味着所有工作已完成。</p><div class="track-list">'+tracksHTML()+'</div></section><h3>实验记录</h3>'+notesFor('实验')+'</div><aside class="panel"><h3>新增实验记录</h3>'+entryForm('实验','算例与版本：\n本次假设：\n参数与对照：\n结果/误差：\n出现的问题：\n下一步：')+'<p class="memo">建议记录随机种子、代码版本、数据集及评估指标，便于复现实验。</p></aside></div>';
 }else if(view==='questions'){
 body='<div class="module-layout"><div class="content-grid"><h3>研究问题与待验证假设</h3>'+notesFor('问题')+'</div><aside class="panel"><h3>记录一个值得解决的问题</h3>'+entryForm('问题','观察到了什么？\n可能原因是什么？\n怎样设计一次最小验证？')+'<p class="memo">示例：PerTime 的收益来自时间尺度重加权，还是标准化后的函数表示更简单？</p></aside></div>';
 }else if(view==='literature'){
 const arr=papers.slice(0,10);
 const allowedLink=url=>/^https?:\/\//i.test(String(url||''))?String(url):'';
 const renderPaper=p=>{
   const link=allowedLink(p.url||p.link),pdf=allowedLink(p.pdf_url||p.pdf);
   const fluid=p.fluid||p.fluid_relevance||'';
   const fluidLabel=({direct:'流体直接相关',transfer:'可迁移方法',fallback:'纯流体领域'})[fluid]||fluid;
   const zh=p.abstract_zh||'';
   return '<article class="row-card" style="padding:18px;border-color:#e5e9df"><div class="row-head"><h3 style="font-size:14px">'+safe(p.title||'未命名论文')+'</h3>'+(fluidLabel?'<span class="pill">'+safe(fluidLabel)+'</span>':'')+'</div><p>'+safe(p.published||'日期未核实')+' · '+safe(p.category||'待分类')+(p.journal?' · '+safe(p.journal):'')+(p.quartile?' · '+safe(p.quartile):'')+'</p><p style="color:#48634f">'+(zh?safe(zh):'<em>中文摘要尚未同步。新一轮 AI×流体筛选及翻译仍待接通。</em>')+'</p><div class="row" style="gap:10px;flex-wrap:wrap">'+(link?'<a href="'+safe(link)+'" target="_blank" rel="noopener noreferrer" class="text-btn">论文来源 ↗</a>':'')+(pdf?'<a href="'+safe(pdf)+'" target="_blank" rel="noopener noreferrer" class="text-btn">PDF ↗</a>':'')+'</div></article>';
 };
 body='<div class="module-layout"><div class="content-grid"><section class="panel"><div class="row-head"><h3>AI × 流体 · 论文日报</h3><span class="panel-caption">私人文献库</span></div><p class="small muted">当前展示已入库的数据。新版 arXiv / Crossref / OpenAlex 双重筛选和逐篇中文摘要翻译尚未连接 WorkBuddy 脚本，不能将现有记录视为今日的 10 篇推荐。</p><div class="content-grid">'+(arr.length?arr.map(renderPaper).join(''):'<p class="empty">尚无已同步论文。待完成私人数据源连接。</p>')+'</div></section></div><aside class="panel"><h3>读完论文，留下一个判断</h3>'+entryForm('文献','论文标题与链接：\\n解决的问题：\\n真正创新点：\\n与我的研究区别：\\n值得复现的实验：')+'</aside></div>';
 }else if(view==='writing'){
 body='<div class="module-layout"><div class="content-grid"><section class="panel"><h3>文章章节进度</h3><div class="track-list">'+db.writing.map((x,i)=>'<div class="track"><span class="track-number">'+(i+1)+'</span><div class="track-text"><strong>'+safe(x.title)+'</strong><p>'+safe(x.detail)+'</p></div>'+statusSelect('writing',x.id,x.status)+'</div>').join('')+'</div></section><h3>写作日志</h3>'+notesFor('写作')+'</div><aside class="panel"><h3>记录写作进展</h3>'+entryForm('写作','今天完成的章节、图表或推导：\n反馈与修改：\n下一步需要解决的论证问题：')+'</aside></div>';
 }else if(view==='growth'){
 body='<div class="module-layout"><div class="content-grid"><section class="panel"><h3>成长档案 · 博士第 '+db.year+' 年</h3><p>这里不只统计发表成果，更关注你逐渐获得的独立研究能力：发现问题、设计验证、判断结果、表达贡献、面对失败。</p></section>'+notesFor('成长')+'</div><aside class="panel"><h3>记录今天的学习与成长</h3>'+entryForm('成长','今天学会了什么？\n从失败中发现了什么？\n对科研的理解发生了什么变化？')+'</aside></div>';
 }else if(view==='milestones'){
 body='<div class="module-layout"><div class="content-grid"><section class="panel"><h3>博士成长里程碑</h3><p class="small muted">以下是可编辑的成长路线，不预设毕业年份或完成期限。</p>'+db.milestones.map((x,i)=>'<div class="milestone"><div class="milestone-rail">'+(i+1)+'</div><div class="milestone-body"><div class="row-head"><strong>'+safe(x.title)+'</strong>'+statusSelect('milestones',x.id,x.status)+'</div><p>'+safe(x.detail)+'</p></div></div>').join('')+'</section></div><aside class="panel"><h3>阶段说明</h3><p>现在是博士第 '+db.year+' 年。你可以在“备份与设置”中调整年级。研究和成长不是线性推进的，暂缓、返工和问题重构都应被记录。</p><div class="memo">里程碑状态保存在此浏览器中，不会自动提交到 GitHub。</div></aside></div>';
 }else if(view==='review'){
 const key=getWeek(),end=addDays(key,6),r=db.reviews[key]||{};
 body='<div class="module-layout"><section class="panel"><div class="row-head"><h3>周复盘 · '+labelDate(key)+' — '+labelDate(end)+'</h3><div class="week-switcher"><button class="circle-btn" data-act="prev-week">‹</button><button class="circle-btn" data-act="next-week">›</button></div></div><form class="form-stack review-grid" id="reviewForm"><label>这一周最有价值的进展是什么？</label><textarea name="progress" placeholder="具体到实验、结论、可复现输出……">'+safe(r.progress||'')+'</textarea><label>遇到了什么困难？有哪些问题仍未解决？</label><textarea name="blocker" placeholder="困惑、失败案例、代码问题、研究方向上的犹豫……">'+safe(r.blocker||'')+'</textarea><label>下周最重要的三件事是什么？</label><textarea name="next" placeholder="可执行、可检查，而不是宽泛目标……">'+safe(r.next||'')+'</textarea><label>写给一周后的自己</label><textarea name="letter" placeholder="我希望记住什么？">'+safe(r.letter||'')+'</textarea><button type="submit">保存这一周的复盘</button></form></section><aside class="panel"><h3>本周研究足迹</h3>'+dayWeekStats(key)+'<div class="memo">周复盘以“周一日期”为索引。切换不同周后可以分别填写和查看。</div></aside></div>';
 }else if(view==='outcomes'){
 body='<div class="module-layout"><div class="content-grid"><h3>我的成果时间线</h3>'+(db.achievements.length?[...db.achievements].sort((a,b)=>b.date.localeCompare(a.date)).map(a=>'<div class="row-card"><div class="row-head"><h3>'+safe(a.title)+'</h3><button class="text-btn" data-act="delete-outcome" data-id="'+safe(a.id)+'">删除</button></div><p>'+safe(a.date)+' · '+safe(a.kind)+'</p><p style="white-space:pre-wrap;color:#43536d">'+safe(a.detail||'')+'</p></div>').join(''):'<div class="row-card empty">这里将逐步积累论文、报告、代码、重大发现和科研中的第一次。</div>')+'</div><aside class="panel"><h3>记录一项成果</h3><form class="form-stack" id="outcomeForm"><label>成果名称</label><input name="title" required maxlength="200" placeholder="例如：完成一组关键对照实验"/><label>类别</label><select name="kind"><option>研究突破</option><option>论文与投稿</option><option>代码与数据</option><option>报告与交流</option><option>技能成长</option></select><label>日期</label><input name="date" type="date" value="'+TODAY+'" required/><label>记录意义</label><textarea name="detail" maxlength="8000" placeholder="这件事为什么重要？有哪些可复用的收获？"></textarea><button type="submit">收藏到成长档案</button></form></aside></div>';
 }else if(view==='settings'){
 body='<div class="module-layout"><section class="panel"><h3>数据只存储在当前浏览器</h3><p>科研和生活记录保存在 Supabase 私人数据库，私人文档保存在非公开 Storage。换设备后使用同一 GitHub 账号可继续访问已同步的记录；旧版浏览器本地的 PaperFlow 收藏和笔记仍需要单独迁移。请定期导出备份。</p><div class="form-stack"><label>当前博士阶段</label><select id="yearSelect">'+Array.from({length:9},(_,i)=>'<option value="'+(i+1)+'"'+(db.year===i+1?' selected':'')+'>博士第 '+(i+1)+' 年</option>').join('')+'</select><label>备份全部数据</label><button data-act="export" type="button">↓ 导出成长记录 JSON</button><label>从备份文件恢复</label><input id="importBackup" type="file" accept=".json,application/json"/><label>清除所有本地成长记录</label><button data-act="clear" type="button" style="background:#fff0f1;color:#a43f51;border:1px solid #f0d7dc">清空本机数据（需二次确认）</button></div></section><aside class="panel"><h3>隐私与公开网站</h3><p>公开的只是登录界面。未经身份验证和数据库授权，访客不能通过数据接口读取你的研究内容。网站源码不能存储任何未公开实验结果、API 私钥或私人文献。</p><div class="memo">数据库资料可跨设备访问，但上传文件不包含在 JSON 备份内。如需离线备份，请分别下载重要文档。旧版 PaperFlow 的浏览器本地收藏尚未自动迁移。</div><button class="big-link" type="button" data-view="literature">前往私人文献雷达 ↗</button></aside></div>';
 }
 el.innerHTML='<div class="view-hero"><span class="pill blue">PhD · Year '+db.year+'</span><h2>'+h[0]+'</h2><p>'+h[1]+'</p></div>'+body;
}
function dayWeekStats(start){
 const end=addDays(start,6);const es=db.entries.filter(e=>e.date>=start&&e.date<=end);
 return '<div class="content-grid"><div class="row-card"><h3>'+es.length+' 条科研日志</h3><p>实验 '+es.filter(x=>x.kind==='实验').length+' · 文献 '+es.filter(x=>x.kind==='文献').length+' · 成长 '+es.filter(x=>x.kind==='成长').length+'</p></div><div class="row-card"><h3>'+db.tasks.filter(t=>t.due>=start&&t.due<=end&&t.done).length+' 项本周完成任务</h3><p>不求每天产出很多，重要的是持续积累。</p></div></div>';
}
function render(){
 $('dashboardView').classList.toggle('active',view==='dashboard');
 $('moduleView').classList.toggle('active',view!=='dashboard');
 $('homeNav').classList.toggle('hidden',view==='dashboard');
 if(view==='dashboard')renderDashboard();else renderModule();
 $('moduleNav').innerHTML=controls();
 document.querySelectorAll('.atlas-rail a[href]').forEach(a=>{const h=a.hash.slice(1);a.classList.toggle('active',h===(view==='dashboard'?'home':view));});
}
function changeView(v){
 if(v==='schedule')v='dashboard';
 if(v!=='dashboard'&&!meta[v])v='dashboard';
 view=v;window.location.hash=v==='dashboard'?'home':v;render();
 window.scrollTo({top:0,behavior:'smooth'});
}
function selectDay(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
 selected=date;displayMonth=new Date(dateObj(date).getFullYear(),dateObj(date).getMonth(),1);
 if(view!=='dashboard')view='dashboard';
 render();
}
async function refreshPapers(){
 try{
   const {data,error}=await session.client.from('phd_private_papers').select('document').eq('id',1).maybeSingle();
   if(error)throw error;
   papers=Array.isArray(data?.document?.papers)?data.document.papers.slice(0,120):[];
   if(view==='literature')renderModule();
 }catch(e){console.error('Private literature feed failed',e);papers=[];}
}
function exportFile(){
 const data=JSON.stringify({...db,exportedAt:new Date().toISOString()},null,2);
 const blob=new Blob([data],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Dayflow-个人记录-'+TODAY+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast('已生成本地备份文件');
}
function validateImport(x){
 return x&&x.version===1&&Array.isArray(x.entries)&&Array.isArray(x.tasks)&&Array.isArray(x.achievements);
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-act],[data-view],[data-date],[data-kind]');
 if(!btn)return;
 if(btn.dataset.date){selectDay(btn.dataset.date);return}
 if(btn.dataset.view){changeView(btn.dataset.view);return}
 if(btn.dataset.kind){
 kind=btn.dataset.kind;
 document.querySelectorAll('[data-kind]').forEach(x=>x.classList.toggle('active',x.dataset.kind===kind));
 return;
 }
 const act=btn.dataset.act, id=btn.dataset.id;
 if(act==='prev-month'||act==='next-month'){displayMonth.setMonth(displayMonth.getMonth()+(act==='prev-month'?-1:1));renderCalendar();return}
 if(act==='today'){selected=TODAY;displayMonth=new Date(now.getFullYear(),now.getMonth(),1);weekOffset=0;render();return}
 if(act==='prev-week'||act==='next-week'){weekOffset+=(act==='prev-week'?-1:1);render();return}
 if(act==='delete-entry'||act==='delete-task'||act==='delete-outcome'){
  if(!confirm('确定删除这条记录吗？'))return;
  const attr=act==='delete-entry'?'entries':act==='delete-task'?'tasks':'achievements';
  db[attr]=db[attr].filter(x=>x.id!==id);save();render();return;
 }
 if(act==='toggle-task'){const t=db.tasks.find(x=>x.id===id);if(t){t.done=btn.checked;save();render()}return}
 if(act==='export'){exportFile();return}
 if(act==='clear'){if(confirm('这将删除本浏览器中的全部博士成长记录，建议先导出备份。继续吗？')&&confirm('最后确认：要永久清空本机成长记录吗？')){db=defaultState();save();render();toast('本机成长记录已清空')}return}
});
document.addEventListener('change',e=>{
 const el=e.target;
 if(el.dataset.status){const a=db[el.dataset.status];if(Array.isArray(a)){const r=a.find(x=>x.id===el.dataset.id);if(r){r.status=el.value;save();toast('进度已保存')}}return}
 if(el.id==='yearSelect'){db.year=Number(el.value);save();render();toast('博士阶段已更新')}
 if(el.id==='importBackup'&&el.files&&el.files[0]){
  const fr=new FileReader();
  fr.onload=()=>{try{const imported=JSON.parse(String(fr.result));if(!validateImport(imported))throw new Error('文件不是有效的成长工作台备份');
   if(!confirm('导入会覆盖当前浏览器中已有的博士成长日志。是否继续？'))return;
   window.__phdWorkspaceDocument=imported;db=load();save();render();toast('备份已导入，并开始同步到云端');
  }catch(err){toast('导入失败：'+err.message)}};
  fr.readAsText(el.files[0]);el.value='';
 }
});
document.addEventListener('submit',e=>{
 const form=e.target;
 if(!['reviewForm','outcomeForm'].includes(form.id)&&form.dataset.form!=='module-entry')return;
 e.preventDefault();
 const fd=new FormData(form);
 if(form.dataset.form==='module-entry'){
  if(addEntry(fd.get('text'),form.dataset.kind,fd.get('date'))){render();toast('已保存到科研成长档案')}
 }else if(form.id==='reviewForm'){
  const d={progress:String(fd.get('progress')||'').slice(0,20000),blocker:String(fd.get('blocker')||'').slice(0,20000),next:String(fd.get('next')||'').slice(0,20000),letter:String(fd.get('letter')||'').slice(0,20000)};
  db.reviews[getWeek()]=d;save();toast('本周复盘已保存');
 }else if(form.id==='outcomeForm'){
  const title=String(fd.get('title')||'').trim();if(!title)return;
  db.achievements.push({id:uid(),title:title.slice(0,200),kind:String(fd.get('kind')||'研究突破'),date:String(fd.get('date')||TODAY),detail:String(fd.get('detail')||'').slice(0,8000)});
  save();render();toast('已加入成果档案');
 }
});
$('topDate').textContent=verboseDate(TODAY);
const h=window.location.hash.replace('#','');if(meta[h])view=h;
window.addEventListener('hashchange',()=>{const next=window.location.hash.slice(1);if(next==='home'||next==='dashboard'||next==='schedule')view='dashboard';else if(meta[next])view=next;render()});
render();refreshPapers();
})();
