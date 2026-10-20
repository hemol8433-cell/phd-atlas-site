// Daybook: one cross-domain daily schedule, stored in the owner's private PhD document.
// No requests are made without the authenticated parent application session.
const categories=["科研","生活","休息","其他"];
const marks={科研:"research",生活:"life",休息:"rest",其他:"other"};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=()=>dateText(new Date());
const addDay=(day,offset)=>{const d=new Date(day+"T12:00:00");d.setDate(d.getDate()+offset);return dateText(d);};
const validDay=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(new Date(x+"T12:00:00").getTime());
const minutes=x=>{const match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(x||"");return match?Number(match[1])*60+Number(match[2]):NaN;};
const fmt=mins=>mins>=60?(Math.floor(mins/60)+"小时"+(mins%60?mins%60+"分钟":"")):mins+"分钟";
export function normalizeDaybook(value) {
 return Array.isArray(value) ? value.filter(x=>x&&typeof x==="object").slice(0,5000) : [];
}
export function validateDayEntry(entry){
 const m=minutes(entry.start),n=minutes(entry.end);
 if(!validDay(entry.date)) return "日期格式不正确";
 if(!Number.isFinite(m)||!Number.isFinite(n)||n<=m) return "结束时间必须晚于开始时间（暂不支持跨午夜时段）";
 if(!String(entry.title||"").trim()) return "请填写这段时间做什么";
 if(String(entry.title).length>160||String(entry.note||"").length>1200) return "文字超过允许长度";
 if(!categories.includes(entry.category)) return "请选择正确的类别";
 if(!["计划","已记录"].includes(entry.status)) return "请选择计划或已记录";
 return null;
}
let selectedDate=today(),editingId=null;
export function renderDaybook(root,api,{compact=false}={}){
 const data=api.data();
 data.daybook=normalizeDaybook(data.daybook);
 const entries=data.daybook.filter(v=>v.date===selectedDate).sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
 const actual=entries.filter(x=>x.status==="已记录");
 const actualMinutes=actual.reduce((n,x)=>n+Math.max(0,minutes(x.end)-minutes(x.start)),0);
 const edited=data.daybook.find(x=>x.id===editingId);
 const form=edited && edited.date===selectedDate?edited:{start:"09:00",end:"10:00",title:"",category:"科研",status:"计划",note:""};
 const dayLabel=new Date(selectedDate+"T12:00:00").toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"long"});
 const item=e=>'<div class="db-row '+marks[e.category]+'"><div class="db-time">'+esc(e.start)+'<span>— '+esc(e.end)+'</span></div><div class="db-line"></div><div class="db-activity"><strong>'+esc(e.title)+'</strong><div class="db-meta"><span>'+esc(e.category)+'</span><span class="'+(e.status==="已记录"?"db-done":"")+'">'+esc(e.status)+'</span>'+(e.note?'<span class="db-note">'+esc(e.note)+'</span>':"")+'</div></div><div class="db-actions"><button type="button" data-db-act="edit" data-id="'+esc(e.id)+'" title="编辑">编辑</button><button type="button" data-db-act="delete" data-id="'+esc(e.id)+'" title="删除">×</button></div></div>';
 const options=categories.map(x=>'<option'+(x===form.category?" selected":"")+'>'+x+'</option>').join("");
 root.innerHTML=
 '<section class="db-shell"><div class="db-top"><div><span class="db-overline">'+(compact?"TODAY · 日程记录":"DAYBOOK · DAILY TIMELINE")+'</span><h2>'+(compact?"今天的时间表":"每日时间表")+'</h2><p>几点到几点，做了什么。科研与生活记录在同一条时间线上。</p></div><div class="db-date-control"><button type="button" data-db-act="previous" title="前一天">‹</button><input type="date" id="db-date" value="'+esc(selectedDate)+'" aria-label="选择日期"/><button type="button" data-db-act="next" title="后一天">›</button><button type="button" data-db-act="today" class="db-today">今天</button></div></div>'+
 '<div class="db-content"><div class="db-timeline"><div class="db-sectionhead"><strong>'+esc(dayLabel)+'</strong><span>'+entries.length+' 个时段 · 已记录 '+fmt(actualMinutes)+'</span></div>'+
 (entries.length?entries.map(item).join(""):'<div class="db-empty"><span>○</span><strong>这一天还没有时间记录</strong><p>添加第一条，例如 09:00–10:30 论文阅读。</p></div>')+
 '</div><section class="db-editor"><div class="db-sectionhead"><strong>'+(edited?"修改时间记录":"添加一个时段")+'</strong><span>只你可见</span></div><form id="db-form"><div class="db-pair"><label>开始<input name="start" type="time" value="'+esc(form.start)+'" required/></label><label>结束<input name="end" type="time" value="'+esc(form.end)+'" required/></label></div><label>做什么<input name="title" maxlength="160" required value="'+esc(form.title)+'" placeholder="例如：实验分析、午餐、运动"/></label><div class="db-pair"><label>类别<select name="category">'+options+'</select></label><label>记录类型<select name="status"><option'+(form.status==="计划"?" selected":"")+'>计划</option><option'+(form.status==="已记录"?" selected":"")+'>已记录</option></select></label></div><label>备注（可选）<textarea name="note" maxlength="1200" rows="2" placeholder="这段时间完成了什么？">'+esc(form.note||"")+'</textarea></label><div class="db-form-actions"><button type="submit" class="db-save">'+(edited?"保存修改":"添加到时间表")+'</button>'+(edited?'<button type="button" data-db-act="cancel">取消</button>':"")+'</div></form></section></div>'+
 (compact?'<footer class="db-bottom"><span>无需为每一分钟安排任务，实际记录比完美计划更重要。</span><button type="button" data-view="schedule">打开完整时间表 →</button></footer>':'<footer class="db-bottom"><span>支持补记、修改和删除。保存后同步到你的私人云端，换设备也可查看。</span></footer>')+
 '</section>';
 const redraw=()=>renderDaybook(root,api,{compact});
 const save=()=>{api.save();api.toast("时间表已提交私人云端同步");};
 root.onchange=e=>{
  if(e.target.id==="db-date"){
   if(validDay(e.target.value)){selectedDate=e.target.value;editingId=null;redraw();}
  }
 };
 root.onclick=e=>{
  const btn=e.target.closest("[data-db-act]");if(!btn||!root.contains(btn))return;
  const action=btn.dataset.dbAct;
  if(action==="previous"||action==="next"||action==="today"){
   selectedDate=action==="today"?today():addDay(selectedDate,action==="previous"?-1:1);
   editingId=null;redraw();return;
  }
  if(action==="cancel"){editingId=null;redraw();return;}
  if(action==="edit"){
   const entry=data.daybook.find(x=>x.id===btn.dataset.id);
   if(entry){editingId=entry.id;redraw();}
   return;
  }
  if(action==="delete"){
   if(!confirm("确定删除这条时间记录吗？"))return;
   data.daybook=data.daybook.filter(x=>x.id!==btn.dataset.id);
   if(editingId===btn.dataset.id)editingId=null;
   save();redraw();
  }
 };
 root.onsubmit=e=>{
  if(e.target.id!=="db-form")return;
  e.preventDefault();
  const input=new FormData(e.target),entry={
   date:selectedDate,
   start:String(input.get("start")||""),
   end:String(input.get("end")||""),
   title:String(input.get("title")||"").trim(),
   category:String(input.get("category")||""),
   status:String(input.get("status")||""),
   note:String(input.get("note")||"").trim()
  };
  const reason=validateDayEntry(entry);
  if(reason){api.toast(reason);return;}
  if(editingId){
   const match=data.daybook.find(x=>x.id===editingId);
   if(match)Object.assign(match,entry);
   else data.daybook.push({...entry,id:Date.now().toString(36)+Math.random().toString(36).slice(2,8)});
  }else data.daybook.push({...entry,id:Date.now().toString(36)+Math.random().toString(36).slice(2,8)});
  editingId=null;save();redraw();
 };
}
