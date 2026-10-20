// ProjectDay — private execution workspace. Embedded in the protected PhD document.
const QUADS=[["Q1","重要且紧急","先解决关键阻碍"],["Q2","重要不紧急","长期研究与积累"],["Q3","紧急不重要","尽量简化处理"],["Q4","不重要不紧急","减少无效投入"]];
const CATS=["实验","论文","文献","学习","其他"];
const KINDS=["灵感","情绪","工具技巧","认知感悟","科普"];
const NOW=()=>new Date().toLocaleDateString("en-CA");
const ID=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
const E=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const duration=seconds=>Number(seconds)>=3600?(Number(seconds)/3600).toFixed(1)+" 小时":Math.round((Number(seconds)||0)/60)+" 分钟";
const statusList=["计划中","进行中","已完成","暂缓"];
export function normalizeProjectDay(x){
 const d={projects:[],tasks:[],sessions:[],ideas:[],daily:{},timer:{startedAt:null,elapsedMs:0,projectId:""}};
 if(!x||typeof x!=="object")return d;
 for(const k of ["projects","tasks","sessions","ideas"])if(Array.isArray(x[k]))d[k]=x[k].slice(0,3000);
 if(x.daily&&typeof x.daily==="object"&&!Array.isArray(x.daily))d.daily=x.daily;
 if(x.timer&&typeof x.timer==="object"){
  d.timer.elapsedMs=Math.max(0,Number(x.timer.elapsedMs)||0);
  d.timer.startedAt=typeof x.timer.startedAt==="number"?x.timer.startedAt:null;
  d.timer.projectId=String(x.timer.projectId||"");
 }
 return d;
}
let kind="灵感",weekOffset=0,ticker;
export function renderProjectDay(root,api){
 const data=api.data(),s=data.projectday=normalizeProjectDay(data.projectday);
 const today=NOW(), monday=new Date(today+"T12:00:00");
 monday.setDate(monday.getDate()-((monday.getDay()+6)%7)+7*weekOffset);
 const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 const weekBegin=iso(monday);const sunday=new Date(monday);sunday.setDate(sunday.getDate()+6);const weekEnd=iso(sunday);
 const getProject=p=>s.projects.find(x=>x.id===p);
 const pname=p=>getProject(p)?.title||"未分类";
 const taskCount=s.tasks.filter(x=>x.done).length;
 const secToday=s.sessions.filter(x=>x.date===today).reduce((n,x)=>n+(Number(x.seconds)||0),0);
 const secWeek=s.sessions.filter(x=>x.date>=weekBegin&&x.date<=weekEnd).reduce((n,x)=>n+(Number(x.seconds)||0),0);
 const secTimer=()=>s.timer.elapsedMs+(s.timer.startedAt?Math.max(0,Date.now()-s.timer.startedAt):0);
 const clock=()=>{const x=Math.floor(secTimer()/1000);return [Math.floor(x/3600),Math.floor(x/60)%60,x%60].map(y=>String(y).padStart(2,"0")).join(":");};
 const choices=(selected="")=>'<option value="">选择项目</option>'+s.projects.map(p=>'<option value="'+E(p.id)+'"'+(p.id===selected?" selected":"")+'>'+E(p.title)+'</option>').join("");
 const statuses=now=>statusList.map(x=>'<option value="'+x+'"'+(now===x?" selected":"")+'>'+x+'</option>').join("");
 const taskRow=t=>'<div class="pd-task'+(t.done?" done":"")+'"><label><input type="checkbox" data-pd-change="task-done" data-id="'+E(t.id)+'"'+(t.done?" checked":"")+'/>'+E(t.title)+'</label><div class="pd-task-foot"><small>'+E(pname(t.projectId))+(t.due?" · "+E(t.due):"")+'</small><button type="button" data-pd-act="remove-task" data-id="'+E(t.id)+'">×</button></div></div>';
 const matrix=QUADS.map(q=>'<section class="pd-quad pd-'+q[0].toLowerCase()+'"><header><b>'+q[0]+'</b><div><strong>'+q[1]+'</strong><small>'+q[2]+'</small></div><span>'+s.tasks.filter(x=>x.quadrant===q[0]&&!x.done).length+'</span></header><div>'+((s.tasks.filter(t=>t.quadrant===q[0]).map(taskRow).join(""))||'<p class="pd-empty">暂无任务</p>')+'</div></section>').join("");
 const projects=s.projects.map(p=>{
   const ts=s.tasks.filter(x=>x.projectId===p.id),done=ts.filter(x=>x.done).length;
   const time=s.sessions.filter(x=>x.projectId===p.id).reduce((n,x)=>n+(Number(x.seconds)||0),0);
   const percent=ts.length?Math.round(100*done/ts.length):0;
   return '<article class="pd-project"><div class="pd-project-top"><div><h3>'+E(p.title)+'</h3><p>'+E(p.description||p.category||"研究项目")+'</p></div><select data-pd-change="project-status" data-id="'+E(p.id)+'">'+statuses(p.status)+'</select></div><div class="pd-bar"><span style="width:'+percent+'%"></span></div><footer><small>'+done+'/'+ts.length+' 项完成 · '+duration(time)+' 投入'+(p.due?" · "+E(p.due):"")+'</small><button type="button" data-pd-act="remove-project" data-id="'+E(p.id)+'">删除</button></footer></article>';
 }).join("");
 const log=s.sessions.slice(-10).reverse().map(x=>'<div class="pd-log"><time>'+E(x.date)+'</time><div><b>'+E(pname(x.projectId))+'</b><p>'+E(x.note||"专注时段")+'</p></div><strong>'+duration(x.seconds)+'</strong><button type="button" data-pd-act="remove-session" data-id="'+E(x.id)+'">×</button></div>').join("");
 const ideas=s.ideas.slice(-10).reverse().map(x=>'<div class="pd-idea"><span>'+E(x.type)+'</span><p>'+E(x.text)+'</p><small>'+E(x.date)+'</small><button type="button" data-pd-act="remove-idea" data-id="'+E(x.id)+'">×</button></div>').join("");
 const note=s.daily[today]||{};
 root.innerHTML=[
 '<div class="pd-header"><div><span class="pd-overline">PROJECTDAY · RESEARCH OPERATING SYSTEM</span><h2>科研执行中心 <em>ProjectDay</em></h2><p>给每个研究方向一个清晰目标，给每天一个最小行动。</p></div><div class="pd-head-tags"><span>博士第 '+(Number(data.year)||2)+' 年</span><span>'+E(today)+'</span></div></div>',
 '<div class="pd-top-grid"><section class="pd-panel pd-overview"><div class="pd-heading"><h3>01 · 项目总览</h3><span>本周 '+E(weekBegin)+' 至 '+E(weekEnd)+'</span></div><div class="pd-stats">',
 '<div><small>今日实际投入</small><b>'+duration(secToday)+'</b></div><div><small>本周专注</small><b>'+duration(secWeek)+'</b></div><div><small>进行中的项目</small><b>'+s.projects.filter(x=>x.status==="进行中").length+'</b></div><div><small>任务完成</small><b>'+taskCount+' / '+s.tasks.length+'</b></div>',
 '</div><p class="pd-hint">时间仅计算你记录的实际投入，不自动推测研究成果。</p></section>',
 '<section class="pd-panel pd-inspiration"><div class="pd-idea-types">'+KINDS.map(x=>'<button type="button" data-pd-act="idea-kind" data-pd-kind="'+x+'" class="'+(x===kind?"selected":"")+'">'+x+'</button>').join("")+'</div><form data-pd-form="idea"><textarea name="text" required maxlength="2500" placeholder="一个想法、一条感悟或一个新的研究问题……"></textarea><button class="pd-primary" type="submit">记录到灵感库 ↗</button></form></section></div>',
 '<div class="pd-title-line"><div><span class="pd-number">02</span><h3>今日与方向</h3><small>先确定重点，再管理任务优先级</small></div><div class="pd-week-nav"><button type="button" data-pd-act="prev-week">‹</button><span>'+E(weekBegin)+' — '+E(weekEnd)+'</span><button type="button" data-pd-act="next-week">›</button></div></div>',
 '<div class="pd-day-grid"><section class="pd-panel"><div class="pd-heading"><h3>今日重点 · 每日复盘</h3><span>完成比完美更重要</span></div><form class="pd-form pd-daily" data-pd-form="daily"><label>今天最重要的研究问题</label><textarea name="priority" rows="2" maxlength="1200" placeholder="今天必须推进的一件事">'+E(note.priority||"")+'</textarea><label>最小行动</label><textarea name="minimum" rows="2" maxlength="1200" placeholder="可以完成、可以验证的下一步">'+E(note.minimum||"")+'</textarea><label>回顾与校准</label><textarea name="reflection" rows="2" maxlength="1200" placeholder="哪些假设被证实，哪些需要改变？">'+E(note.reflection||"")+'</textarea><button class="pd-primary" type="submit">保存今日方向</button></form></section>',
 '<section class="pd-panel"><div class="pd-heading"><h3>任务四象限</h3><span>重要 × 紧急</span></div><form class="pd-task-form" data-pd-form="task"><input name="title" required maxlength="250" placeholder="新增一项可执行任务"/><select name="projectId">'+choices()+'</select><select name="quadrant">'+QUADS.map(q=>'<option value="'+q[0]+'">'+q[0]+' '+q[1]+'</option>').join("")+'</select><input name="due" type="date" title="截止日期"/><button class="pd-primary">添加</button></form><div class="pd-matrix">'+matrix+'</div></section></div>',
 '<div class="pd-title-line"><div><span class="pd-number">03</span><h3>项目与投入</h3><small>进度、任务和真实时间放在一起</small></div></div>',
 '<div class="pd-project-grid"><section class="pd-panel"><div class="pd-heading"><h3>研究项目</h3><span>'+s.projects.length+' 个项目</span></div><form class="pd-form pd-project-form" data-pd-form="project"><input name="title" required maxlength="120" placeholder="项目名称"/><select name="category">'+CATS.map(x=>'<option>'+x+'</option>').join("")+'</select><input name="due" type="date" title="目标日期"/><textarea name="description" rows="2" maxlength="600" placeholder="研究目标 / 可验证结果（可选）"></textarea><button class="pd-primary">＋ 创建项目</button></form><div class="pd-projects">'+(projects||'<p class="pd-empty">目前没有项目，先创建第一条研究主线。</p>')+'</div></section>',
 '<section class="pd-panel"><div class="pd-heading"><h3>专注计时</h3><span>可以暂停、保存或补记</span></div><div class="pd-timer"><small>本次专注</small><b id="pd-clock">'+clock()+'</b><select id="pd-timer-project" data-pd-change="timer-project">'+choices(s.timer.projectId)+'</select><div class="pd-controls"><button type="button" class="pd-primary" data-pd-act="timer-toggle"'+(s.projects.length?"":" disabled")+'>'+(s.timer.startedAt?"暂停":"开始")+'</button><button type="button" data-pd-act="timer-save">保存时段</button><button type="button" data-pd-act="timer-clear">清零</button></div></div><form class="pd-form pd-manual" data-pd-form="session"><label>补记实际投入时间</label><select name="projectId" required>'+choices()+'</select><input name="minutes" type="number" min="1" max="1440" required placeholder="分钟"/><input name="date" type="date" value="'+today+'" required/><input name="note" maxlength="250" placeholder="本次做了什么？"/><button type="submit">补记并保存</button></form></section></div>',
 '<div class="pd-bottom-grid"><section class="pd-panel"><div class="pd-heading"><h3>04 · 执行日志</h3><span>按实际投入积累</span></div>'+(log||'<p class="pd-empty">完成一次专注或补记时间后，记录会出现在这里。</p>')+'</section><section class="pd-panel"><div class="pd-heading"><h3>05 · 灵感与成长</h3><span>连接每一天的思考</span></div>'+(ideas||'<p class="pd-empty">这里会保存你的灵感、情绪和方法心得。</p>')+'</section></div>',
 '<p class="pd-privacy">🔒 仅你登录后可查看。项目、任务、投入和灵感会同步到受保护的 Supabase 记录中，建议定期导出备份。</p>'
 ].join("");
 const persist=()=>{api.save();api.toast("已提交私人数据同步");};
 const redraw=()=>renderProjectDay(root,api);
 if(ticker)clearInterval(ticker);
 ticker=setInterval(()=>{const node=root.querySelector("#pd-clock");if(node)node.textContent=clock();},1000);
 root.onclick=e=>{
  const button=e.target.closest("[data-pd-act]");if(!button||!root.contains(button))return;
  const act=button.dataset.pdAct,key=button.dataset.id;
  if(act==="idea-kind"){kind=button.dataset.pdKind;redraw();return;}
  if(act==="prev-week"||act==="next-week"){weekOffset+=act==="prev-week"?-1:1;redraw();return;}
  if(["remove-task","remove-idea","remove-session","remove-project"].includes(act)){
   if(!confirm("确定删除这条记录吗？"))return;
   const group=act.replace("remove-",""),field=({task:"tasks",idea:"ideas",session:"sessions",project:"projects"})[group];
   if(!field)return;
   s[field]=s[field].filter(x=>x.id!==key);
   if(field==="projects"&&s.timer.projectId===key){s.timer.startedAt=null;s.timer.elapsedMs=0;s.timer.projectId="";}
   persist();redraw();return;
  }
  if(act==="timer-toggle"){
   if(!getProject(s.timer.projectId)){api.toast("先选择一个项目");return;}
   if(s.timer.startedAt){s.timer.elapsedMs=secTimer();s.timer.startedAt=null;}
   else s.timer.startedAt=Date.now();
   persist();redraw();return;
  }
  if(act==="timer-clear"){
   if(secTimer()>0&&!confirm("确定清空尚未保存的计时？"))return;
   s.timer.elapsedMs=0;s.timer.startedAt=null;persist();redraw();return;
  }
  if(act==="timer-save"){
   const seconds=Math.floor(secTimer()/1000);
   if(!getProject(s.timer.projectId)){api.toast("请选择项目");return;}
   if(seconds<10){api.toast("至少记录十秒后才能保存");return;}
   s.sessions.push({id:ID(),projectId:s.timer.projectId,date:NOW(),seconds,note:"专注时段"});
   s.timer.elapsedMs=0;s.timer.startedAt=null;persist();redraw();
  }
 };
 root.onchange=e=>{
  const el=e.target,act=el.dataset.pdChange;
  if(act==="timer-project"){
   if(s.timer.startedAt){api.toast("请暂停计时再切换项目");el.value=s.timer.projectId;return;}
   s.timer.projectId=el.value;persist();return;
  }
  if(act==="project-status"){
   const project=getProject(el.dataset.id);
   if(project&&statusList.includes(el.value)){project.status=el.value;persist();redraw();}
  }
  if(act==="task-done"){
   const task=s.tasks.find(t=>t.id===el.dataset.id);
   if(task){task.done=el.checked;persist();redraw();}
  }
 };
 root.onsubmit=e=>{
  const f=e.target.closest("[data-pd-form]");if(!f||!root.contains(f))return;
  e.preventDefault();
  const form=new FormData(f),value=k=>String(form.get(k)||"").trim();
  const which=f.dataset.pdForm;
  if(which==="project"){
   if(!value("title"))return;
   s.projects.push({id:ID(),title:value("title").slice(0,120),category:value("category"),due:value("due"),description:value("description").slice(0,600),status:"计划中"});
  }else if(which==="task"){
   if(!value("title"))return;
   s.tasks.push({id:ID(),title:value("title").slice(0,250),projectId:value("projectId"),quadrant:value("quadrant"),due:value("due"),done:false});
  }else if(which==="idea"){
   if(!value("text"))return;
   s.ideas.push({id:ID(),type:kind,text:value("text").slice(0,2500),date:NOW()});
  }else if(which==="daily"){
   s.daily[NOW()]={priority:value("priority").slice(0,1200),minimum:value("minimum").slice(0,1200),reflection:value("reflection").slice(0,1200)};
  }else if(which==="session"){
   const minutes=Math.floor(Number(value("minutes")));
   if(!Number.isFinite(minutes)||minutes<1||minutes>1440){api.toast("时间请输入 1 至 1440 分钟");return;}
   if(!getProject(value("projectId"))){api.toast("请选择项目");return;}
   if(!/^\d{4}-\d{2}-\d{2}$/.test(value("date"))){api.toast("请输入有效日期");return;}
   s.sessions.push({id:ID(),projectId:value("projectId"),date:value("date"),seconds:minutes*60,note:value("note").slice(0,250)||"时间补记"});
  }else return;
  persist();redraw();
 };
}
