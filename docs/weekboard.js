// Weekboard — a single weekly calendar for research and life, backed by the private workspace.
const TYPES=["科研","生活","休息","其他"];
const DAYS=["周一","周二","周三","周四","周五","周六","周日"];
const html=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dayString=date=>date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
const dateObject=s=>new Date(s+"T12:00:00");
const minute=s=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(s||"");return m?Number(m[1])*60+Number(m[2]):NaN};
const clock=date=>String(date.getHours()).padStart(2,"0")+":"+String(date.getMinutes()).padStart(2,"0");
const short=date=>String(date.getMonth()+1).padStart(2,"0")+"/"+String(date.getDate()).padStart(2,"0");
const uuid=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
const mondayOf=date=>{
 const d=dateObject(date);d.setDate(d.getDate()-(d.getDay()+6)%7);return dayString(d);
};
const plusDays=(day,n)=>{const d=dateObject(day);d.setDate(d.getDate()+n);return dayString(d)};
const today=()=>dayString(new Date());
const validDate=date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&dayString(dateObject(date))===date;
const validEntry=item=>{
 if(!validDate(item.date))return "日期无效";
 if(!item.title||item.title.trim().length===0)return "请填写内容";
 if(item.title.length>160||String(item.note||"").length>1200)return "文字过长";
 if(!TYPES.includes(item.category))return "类别无效";
 if(!["计划","已记录"].includes(item.status))return "请选择计划或实际";
 if(!Number.isFinite(minute(item.start))||!Number.isFinite(minute(item.end))||minute(item.end)<=minute(item.start))return "结束时间必须晚于开始时间";
 return null;
};
export const validateWeeklyEntry=validEntry;
export function weekEvents(db,weekStart,now=new Date()){
 const weekEnd=plusDays(weekStart,6);
 const inWeek=date=>date>=weekStart&&date<=weekEnd;
 const all=[];
 const add=e=>{if(e&&inWeek(e.date))all.push(e)};
 for(const x of (db.daybook||[])){
  if(!x||!validDate(x.date)||!x.title)continue;
  add({id:"manual:"+x.id,source:"manual",date:x.date,start:x.start||"",end:x.end||"",title:String(x.title),category:x.category||"其他",status:x.status||"计划",note:String(x.note||""),editable:true});
 }
 for(const x of (db.projectday?.sessions||[])){
  if(!x)continue;
  const name=db.projectday?.projects?.find(p=>p.id===x.projectId)?.title||"科研专注";
  if(Array.isArray(x.segments)&&x.segments.length){
   for(const [i,segment] of x.segments.entries()){
    if(!Number.isFinite(Number(segment.start))||!Number.isFinite(Number(segment.end)))continue;
    const from=new Date(segment.start),to=new Date(segment.end);
    if(to<=from)continue;
    // Split a session if it crosses midnight: do not silently assign next-day time to yesterday.
    let cursor=new Date(from);
    while(cursor<to){
      const onDay=dayString(cursor);
      const after=new Date(cursor);after.setHours(24,0,0,0);
      const until=new Date(Math.min(after.getTime(),to.getTime()));
      add({id:"focus:"+x.id+":"+i+":"+onDay,source:"focus",date:onDay,start:clock(cursor),end:until.getTime()===after.getTime()?"24:00":clock(until),title:name,category:"科研",status:"已记录",note:x.note||"专注时段"});
      cursor=until;
    }
   }
  }else if(x.startTime&&x.endTime){
    add({id:"focus:"+x.id,source:"focus",date:x.date,start:x.startTime,end:x.endTime,title:name,category:"科研",status:"已记录",note:x.note||"补记专注"});
  }else if(validDate(x.date)){
    add({id:"focus:"+x.id,source:"duration",date:x.date,start:"",end:"",title:name,category:"科研",status:"已记录",note:(x.note||"手动补记")+" · "+Math.round((Number(x.seconds)||0)/60)+" 分钟（未记录具体时段）"});
  }
 }
 const timer=db.projectday?.timer;
 if(timer && db.projectday?.projects){
  const name=db.projectday.projects.find(p=>p.id===timer.projectId)?.title||"科研专注";
  const parts=[...(timer.segments||[])];
  if(Number.isFinite(timer.startedAt)&&timer.startedAt>0)parts.push({start:timer.startedAt,end:now.getTime(),active:true});
  for(const [i,part] of parts.entries()){
    const a=new Date(part.start),b=new Date(part.end);
    if(!(a<b))continue;
    let cursor=new Date(a);
    while(cursor<b){
      const date=dayString(cursor),midnight=new Date(cursor);midnight.setHours(24,0,0,0);
      const till=new Date(Math.min(b.getTime(),midnight.getTime()));
      add({id:"pending:"+i+":"+date,source:"active",date,start:clock(cursor),end:till.getTime()===midnight.getTime()?"24:00":clock(till),title:name,category:"科研",status:part.active?"进行中":"已暂停",note:part.active?"正在专注（尚未保存）":"暂停中的专注（尚未保存）"});
      cursor=till;
    }
  }
 }
 for(const x of (db.activityEvents||[])){
  if(!x||!x.at||!x.title)continue;
  const date=dayString(new Date(x.at));const t=clock(new Date(x.at));
  add({id:"activity:"+x.id,source:x.source||"activity",date,start:t,end:"",title:String(x.title),category:x.category==="生活"?"生活":"科研",status:"已记录",note:x.note||"",instant:true});
 }
 // Existing research journals have real created timestamps; show the recording time,
 // not a fabricated start/end time for the underlying experiment.
 for(const x of (db.entries||[])){
  if(!x?.created||!x.text)continue;
  const d=new Date(x.created);
  if(Number.isNaN(d.getTime()))continue;
  add({id:"research:"+x.id,source:"journal",date:dayString(d),start:clock(d),end:"",title:(x.kind||"科研")+"日志",category:"科研",status:"已记录",note:String(x.text).slice(0,110),instant:true});
 }
 const sourceOrder={manual:0,active:1,focus:2,duration:3,activity:4,journal:5};
 return all.sort((a,b)=>a.date.localeCompare(b.date)||((a.start||"99:99").localeCompare(b.start||"99:99"))||(sourceOrder[a.source]||0)-(sourceOrder[b.source]||0));
}
let anchorDate=today(),editing=null;
export function renderWeekboard(root,api){
 const db=api.data(),mon=mondayOf(anchorDate);
 const dates=Array.from({length:7},(_,i)=>plusDays(mon,i));
 const events=weekEvents(db,mon);
 const now=today(),current=new Date(anchorDate+"T12:00:00");
 const entry=editing?(db.daybook||[]).find(x=>x.id===editing):null;
 const draft=entry||{date:anchorDate,start:"09:00",end:"10:00",title:"",category:"科研",status:"计划",note:""};
 const weeklyRecords=events.filter(x=>x.status==="已记录").length;
 const getDayEntries=d=>events.filter(x=>x.date===d);
 const block=x=>{
  const mark=x.category==="科研"?"science":x.category==="生活"?"life":x.category==="休息"?"rest":"other";
  const hours=x.instant?x.start+" · 记录":x.start&&x.end?x.start+" – "+x.end:"时间未指定";
  const extra=x.source==="focus"||x.source==="active"?"来自科研专注":x.source==="journal"?"科研日志":x.source==="activity"||x.source==="habit"?"生活记录":"";
  return '<div class="wk-event '+mark+' '+(x.source==="active"?"wk-active":"")+'" title="'+html(x.note||"")+'"><div class="wk-event-time">'+html(hours)+'</div><strong>'+html(x.title)+'</strong><div class="wk-event-foot"><span>'+html(x.status)+'</span>'+(extra?'<span>'+html(extra)+'</span>':"")+'</div>'+(x.editable?'<div class="wk-event-acts"><button type="button" data-wk-edit="'+html(x.id.slice(7))+'">编辑</button><button type="button" data-wk-delete="'+html(x.id.slice(7))+'">×</button></div>':"")+'</div>';
 };
 root.innerHTML='<div class="wk-shell"><header class="wk-head"><div><span class="wk-overline">MY WEEK · WEEKLY PLANNER</span><h2>这一周，如何度过。</h2><p>科研和生活共用一张时间表。计划可以安排，实际记录会自动出现。</p></div><div class="wk-head-controls"><button type="button" data-wk-nav="-1" aria-label="上一周">‹</button><strong>'+short(dateObject(mon))+' — '+short(dateObject(dates[6]))+'</strong><button type="button" data-wk-nav="1" aria-label="下一周">›</button><button type="button" data-wk-now="1">本周</button></div></header>'+
 '<div class="wk-grid-wrap"><div class="wk-grid">'+dates.map((d,i)=>'<section class="wk-day'+(d===now?" today":"")+(d===anchorDate?" selected":"")+'"><button type="button" class="wk-day-head" data-wk-date="'+d+'"><span>'+DAYS[i]+'</span><strong>'+short(dateObject(d))+'</strong><small>'+getDayEntries(d).length+' 条记录</small></button><div class="wk-day-events">'+(getDayEntries(d).length?getDayEntries(d).map(block).join(""):'<div class="wk-empty">尚无安排</div>')+'</div><button type="button" class="wk-add-in-day" data-wk-date="'+d+'">＋ 添加时段</button></section>').join("")+'</div></div>'+
 '<div class="wk-lower"><section class="wk-guide"><strong>本周记录</strong><p>'+events.length+' 项日程与记录，其中 '+weeklyRecords+' 项已记录。</p><div class="wk-legend"><span><i class="science"></i>科研</span><span><i class="life"></i>生活</span><span><i class="rest"></i>休息</span></div><p class="wk-small">科研专注会自动记录真实开始和结束时间；生活打卡、日记等只显示记录时刻，不会假装它们持续了一小时。</p></section><section class="wk-editor"><div class="wk-editor-head"><strong>'+(editing?"修改时间段":"安排 / 补记时段")+'</strong><span>私有云端保存</span></div><form id="wk-form"><div class="wk-two"><label>日期<input name="date" type="date" required value="'+html(draft.date)+'"/></label><label>分类<select name="category">'+TYPES.map(x=>'<option'+(x===draft.category?" selected":"")+'>'+x+'</option>').join("")+'</select></label></div><div class="wk-two"><label>开始<input name="start" type="time" required value="'+html(draft.start)+'"/></label><label>结束<input name="end" type="time" required value="'+html(draft.end)+'"/></label></div><label>做什么<input name="title" required maxlength="160" placeholder="例如：论文阅读 / 晚餐 / 散步" value="'+html(draft.title)+'"/></label><div class="wk-two"><label>状态<select name="status"><option'+(draft.status==="计划"?" selected":"")+'>计划</option><option'+(draft.status==="已记录"?" selected":"")+'>已记录</option></select></label><label>备注<input name="note" maxlength="1200" placeholder="可选" value="'+html(draft.note||"")+'"/></label></div><div class="wk-editor-actions"><button class="wk-save" type="submit">'+(editing?"保存修改":"添加到本周")+'</button>'+(editing?'<button type="button" data-wk-cancel="1">取消</button>':"")+'</div></form></section></div></div>';
 const repaint=()=>renderWeekboard(root,api);
 const persist=()=>{api.save();api.toast("每周时间表已提交云端同步");};
 root.onclick=event=>{
  const b=event.target.closest("button");if(!b||!root.contains(b))return;
  if(b.dataset.wkNav){anchorDate=plusDays(anchorDate,7*Number(b.dataset.wkNav));editing=null;repaint();return;}
  if(b.dataset.wkNow){anchorDate=today();editing=null;repaint();return;}
  if(b.dataset.wkDate){anchorDate=b.dataset.wkDate;editing=null;repaint();return;}
  if(b.dataset.wkCancel){editing=null;repaint();return;}
  if(b.dataset.wkEdit){editing=b.dataset.wkEdit;repaint();return;}
  if(b.dataset.wkDelete){
   if(!confirm("确定删除这条安排吗？"))return;
   db.daybook=(db.daybook||[]).filter(x=>x.id!==b.dataset.wkDelete);
   if(editing===b.dataset.wkDelete)editing=null;
   persist();repaint();
  }
 };
 root.onsubmit=event=>{
  if(event.target.id!=="wk-form")return;event.preventDefault();
  const form=new FormData(event.target);
  const val=k=>String(form.get(k)||"").trim();
  const record={date:val("date"),category:val("category"),start:val("start"),end:val("end"),title:val("title"),status:val("status"),note:val("note")};
  const invalid=validEntry(record);if(invalid){api.toast(invalid);return;}
  if(!Array.isArray(db.daybook))db.daybook=[];
  if(editing){
    const prev=db.daybook.find(x=>x.id===editing);if(prev)Object.assign(prev,record);else db.daybook.push({...record,id:uuid()});
  }else db.daybook.push({...record,id:uuid()});
  anchorDate=record.date;editing=null;persist();repaint();
 };
}
