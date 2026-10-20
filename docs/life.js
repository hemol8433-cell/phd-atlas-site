// Life Space: all entries live in the authenticated private workspace document.
const T=()=>new Date().toLocaleDateString("en-CA");
const id=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
const e=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const habitsTemplate=["规律作息","运动与散步","阅读学习","整理生活"];
export function normalizeLife(x){
 const data={habits:habitsTemplate.map((name,i)=>({id:"starter-"+i,name})),checks:{},daily:{},todos:[],expenses:[]};
 if(!x||typeof x!=="object"||Array.isArray(x))return data;
 for(const key of ["habits","todos","expenses"])if(Array.isArray(x[key]))data[key]=x[key].slice(0,5000);
 for(const key of ["checks","daily"])if(x[key]&&typeof x[key]==="object"&&!Array.isArray(x[key]))data[key]=x[key];
 return data;
}
export function renderLife(root,api){
 const d=api.data(),s=d.life=normalizeLife(d.life),today=T(),day=s.daily[today]||{};
 const done=new Set(Array.isArray(s.checks[today])?s.checks[today]:[]);
 const checked=s.habits.filter(x=>done.has(x.id)).length;
 const expenseToday=s.expenses.filter(x=>x.date===today&&x.type==="支出").reduce((n,x)=>n+Number(x.amount||0),0);
 const recent=[...s.expenses].reverse().slice(0,8);
 const calendar=Array.from({length:7},(_,i)=>{
  const day=new Date(today+"T12:00:00");day.setDate(day.getDate()-6+i);
  const y=day.getFullYear()+"-"+String(day.getMonth()+1).padStart(2,"0")+"-"+String(day.getDate()).padStart(2,"0");
  const amount=(s.checks[y]||[]).length, ratio=s.habits.length?Math.min(100,100*amount/s.habits.length):0;
  return '<div class="lf-bar-col"><div class="lf-bar-track"><span style="height:'+ratio+'%"></span></div><small>'+["日","一","二","三","四","五","六"][day.getDay()]+'</small></div>';
 }).join("");
 const tasks=s.todos.map(x=>'<div class="lf-task '+(x.done?"done":"")+'"><label><input type="checkbox" data-lf-check="todo" data-id="'+e(x.id)+'"'+(x.done?" checked":"")+'/><span>'+e(x.title)+'</span></label><small>'+e(x.due||"无日期")+' · '+e(x.category||"生活")+'</small><button data-lf-act="remove-todo" data-id="'+e(x.id)+'" type="button">×</button></div>').join("");
 const habitCards=s.habits.map(x=>'<div class="lf-habit '+(done.has(x.id)?"checked":"")+'"><label><input type="checkbox" data-lf-check="habit" data-id="'+e(x.id)+'"'+(done.has(x.id)?" checked":"")+'/><span>'+e(x.name)+'</span></label><button data-lf-act="remove-habit" data-id="'+e(x.id)+'" type="button" aria-label="删除习惯">×</button></div>').join("");
 const money=recent.map(x=>'<div class="lf-money-row"><span>'+e(x.date)+'</span><strong>'+e(x.category||"其他")+'</strong><small>'+e(x.note||"")+'</small><b class="'+(x.type==="收入"?"positive":"")+'">'+(x.type==="收入"?"+":"−")+"¥"+Number(x.amount||0).toFixed(2)+'</b><button type="button" data-lf-act="remove-expense" data-id="'+e(x.id)+'">×</button></div>').join("");
 root.innerHTML=[
 '<div class="lf-hero"><div><span class="lf-overline">PERSONAL LIFE · PRIVATE</span><h2>生活空间 <em>Life & Balance</em></h2><p>生活不需要变成另一份科研任务。记录健康的节奏，也给自己留一点空间。</p></div><span class="lf-date">'+today+'</span></div>',
 '<div class="lf-summary"><div class="lf-summary-card"><span>今日生活习惯</span><strong>'+checked+' <small>/ '+s.habits.length+'</small></strong><p>按自己设定的习惯打卡</p></div><div class="lf-summary-card"><span>今天的心情</span><strong>'+(day.mood?["","低落","疲惫","平静","不错","开心"][day.mood]:"未记录")+'</strong><p>没有对错，不必每天完美</p></div><div class="lf-summary-card"><span>生活待办</span><strong>'+s.todos.filter(x=>!x.done).length+'</strong><p>尚未完成的个人事项</p></div><div class="lf-summary-card"><span>今日手动记账</span><strong>¥'+expenseToday.toFixed(2)+'</strong><p>仅计算手动登记的支出</p></div></div>',
 '<div class="lf-cols"><section class="lf-panel"><div class="lf-panel-head"><h3>♡ 生活习惯</h3><span>'+checked+' / '+s.habits.length+' 已完成</span></div><div class="lf-habit-grid">'+(habitCards||'<p class="lf-empty">添加第一条习惯</p>')+'</div><form class="lf-inline-form" data-lf-form="habit"><input name="name" maxlength="60" required placeholder="新增习惯，例如每周运动"/><button type="submit">＋ 添加</button></form><h4>过去七天的习惯完成情况</h4><div class="lf-bars">'+calendar+'</div></section>',
 '<section class="lf-panel"><div class="lf-panel-head"><h3>✳ 今日状态与日记</h3><span>仅本人可见</span></div><form class="lf-form" data-lf-form="daily"><label>今天的心情</label><div class="lf-mood">'+[1,2,3,4,5].map((v)=>'<label class="'+(Number(day.mood)===v?"selected":"")+'"><input type="radio" name="mood" value="'+v+'"'+(Number(day.mood)===v?" checked":"")+'/><span>'+["","低落","疲惫","平静","不错","开心"][v]+'</span></label>').join("")+'</div><div class="lf-two"><label>睡眠时间（小时）<input name="sleep" type="number" min="0" max="24" step="0.5" value="'+e(day.sleep??"")+'" placeholder="例如 7.5"/></label><label>精力状态（1～5）<select name="energy"><option value="">未记录</option>'+[1,2,3,4,5].map(v=>'<option value="'+v+'"'+(Number(day.energy)===v?" selected":"")+'">'+v+'</option>').join("")+'</select></label></div><label>生活记录</label><textarea name="note" rows="5" maxlength="6000" placeholder="今天让你开心的事，或一段不需要产出的时间……">'+e(day.note||"")+'</textarea><button class="lf-primary" type="submit">保存今日生活记录</button></form></section></div>',
 '<div class="lf-cols lf-lower"><section class="lf-panel"><div class="lf-panel-head"><h3>▤ 生活待办</h3><span>家务 · 健康 · 关系 · 行程</span></div><form data-lf-form="todo" class="lf-inline-form"><input name="title" maxlength="180" required placeholder="例如：周末采购、预约体检"/><select name="category"><option>日常</option><option>健康</option><option>家庭</option><option>出行</option><option>其他</option></select><input name="due" type="date" aria-label="到期日期"/><button type="submit">添加</button></form><div class="lf-tasks">'+(tasks||'<p class="lf-empty">还没有待办事项</p>')+'</div></section>',
 '<section class="lf-panel"><div class="lf-panel-head"><h3>◉ 简单收支记录</h3><span>手动记账 · 不连接银行</span></div><form class="lf-inline-form" data-lf-form="expense"><select name="type"><option>支出</option><option>收入</option></select><input name="amount" type="number" step="0.01" min="0.01" max="10000000" required placeholder="金额（元）"/><select name="category"><option>餐饮</option><option>交通</option><option>生活</option><option>健康</option><option>学习</option><option>其他</option></select><input name="note" maxlength="120" placeholder="备注"/><button type="submit">记录</button></form><div class="lf-money-list">'+(money||'<p class="lf-empty">暂无收支记录</p>')+'</div></section></div>',
 '<div class="lf-bottom-note">这里是个人生活记录，不会公开到 GitHub。数据通过你现有的 Supabase 私人工作台同步，支持换设备后登录访问。</div>'
 ].join("");
 const save=()=>{api.save();api.toast("生活数据已提交云端同步");};
 const redraw=()=>renderLife(root,api);
 root.onchange=event=>{
  const el=event.target;
  if(el.dataset.lfCheck==="habit"){
   const set=new Set(s.checks[today]||[]);
   if(el.checked)set.add(el.dataset.id);else set.delete(el.dataset.id);
   s.checks[today]=[...set];save();redraw();
  }else if(el.dataset.lfCheck==="todo"){
   const todo=s.todos.find(t=>t.id===el.dataset.id);
   if(todo){todo.done=el.checked;save();redraw();}
  }
 };
 root.onclick=event=>{
  const btn=event.target.closest("[data-lf-act]");if(!btn||!root.contains(btn))return;
  const map={"remove-habit":"habits","remove-todo":"todos","remove-expense":"expenses"},field=map[btn.dataset.lfAct];
  if(!field||!confirm("确定删除这条记录吗？"))return;
  s[field]=s[field].filter(x=>x.id!==btn.dataset.id);
  save();redraw();
 };
 root.onsubmit=event=>{
  const form=event.target.closest("[data-lf-form]");if(!form||!root.contains(form))return;
  event.preventDefault();
  const f=new FormData(form),v=k=>String(f.get(k)||"").trim();
  if(form.dataset.lfForm==="habit"){
   if(!v("name"))return;s.habits.push({id:id(),name:v("name").slice(0,60)});
  }else if(form.dataset.lfForm==="todo"){
   if(!v("title"))return;s.todos.push({id:id(),title:v("title").slice(0,180),category:v("category"),due:v("due"),done:false});
  }else if(form.dataset.lfForm==="expense"){
   const amount=Number(v("amount"));
   if(!Number.isFinite(amount)||amount<=0||amount>10000000){api.toast("请输入有效金额");return;}
   s.expenses.push({id:id(),date:today,type:v("type"),amount,category:v("category"),note:v("note").slice(0,120)});
  }else if(form.dataset.lfForm==="daily"){
   const sleep=v("sleep")===""?null:Number(v("sleep"));
   if(sleep!==null&&(!Number.isFinite(sleep)||sleep<0||sleep>24)){api.toast("睡眠时间请填写 0～24 小时");return;}
   s.daily[today]={mood:v("mood")?Number(v("mood")):null,energy:v("energy")?Number(v("energy")):null,sleep,note:v("note").slice(0,6000)};
  }else return;
  save();redraw();
 };
}
