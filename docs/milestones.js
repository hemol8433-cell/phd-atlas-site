// Dayflow · Milestones: fully editable personal goals, preserving legacy phases.
const STATES=["计划中","进行中","已完成","暂缓"];
const CATEGORIES=["科研","生活","成长","其他"];
const X=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ID=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
const DAY=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
let editId=null,filter="all";
export function normalizeMilestones(items){
 if(!Array.isArray(items))return [];
 return items.filter(x=>x&&typeof x==="object"&&typeof x.id==="string"&&typeof x.title==="string").slice(0,2000).map(x=>({
  ...x,
  title:String(x.title).slice(0,160),
  detail:String(x.detail||"").slice(0,3000),
  category:CATEGORIES.includes(x.category)?x.category:"科研",
  status:STATES.includes(x.status)?x.status:"计划中",
  due:/^\d{4}-\d{2}-\d{2}$/.test(x.due||"")?x.due:"",
  completedAt:/^\d{4}-\d{2}-\d{2}$/.test(x.completedAt||"")?x.completedAt:"",
  createdAt:x.createdAt||"",
  progress:Math.max(0,Math.min(100,Number(x.progress)||0))
 }));
}
export function renderMilestones(root,api){
 const db=api.data();
 db.milestones=normalizeMilestones(db.milestones);
 const items=db.milestones;
 const done=items.filter(x=>x.status==="已完成").length;
 const active=items.filter(x=>x.status==="进行中").length;
 const open=items.filter(x=>x.status!=="已完成").length;
 const shown=items.filter(x=>filter==="all"||x.status===filter);
 const edit=items.find(x=>x.id===editId);
 const options=(arr,value)=>arr.map(t=>'<option value="'+X(t)+'"'+(value===t?' selected':'')+'>'+X(t)+'</option>').join("");
 const card=item=>{
  const pct=item.status==="已完成"?100:item.progress||0;
  return '<article class="ms-card '+(item.status==="已完成"?"completed":"")+'"><div class="ms-card-head"><span class="ms-category">'+X(item.category||"科研")+'</span><span class="ms-status">'+X(item.status)+'</span></div><h3>'+X(item.title)+'</h3>'+
   (item.detail?'<p>'+X(item.detail)+'</p>':'')+
   '<div class="ms-bar"><span style="width:'+pct+'%"></span></div>'+
   '<div class="ms-meta"><span>'+pct+'% 完成'+(item.due?' · 目标 '+X(item.due):'')+'</span>'+(item.completedAt?'<span>达成 '+X(item.completedAt)+'</span>':'')+'</div>'+
   '<div class="ms-actions"><button type="button" data-ms-action="edit" data-id="'+X(item.id)+'">编辑</button><button type="button" data-ms-action="toggle" data-id="'+X(item.id)+'">'+(item.status==="已完成"?"恢复进行":"标记完成")+'</button><button type="button" data-ms-action="delete" data-id="'+X(item.id)+'">删除</button></div></article>';
 };
 root.innerHTML='<section class="ms-shell"><div class="ms-hero"><div><span class="ms-eyebrow">GROWTH · PERSONAL MILESTONES</span><h2>成长里程碑</h2><p>不按固定阶段定义成长。科研、生活或任何对你重要的目标，都由你决定。</p></div><div class="ms-metrics"><div><strong>'+items.length+'</strong><span>累计目标</span></div><div><strong>'+active+'</strong><span>进行中</span></div><div><strong>'+done+'</strong><span>已完成</span></div></div></div>'+
 '<div class="ms-body"><div class="ms-list"><header class="ms-list-head"><strong>我的目标</strong><div class="ms-filters">'+[["all","全部"],["进行中","进行中"],["计划中","计划中"],["已完成","已完成"],["暂缓","暂缓"]].map(t=>'<button type="button" data-ms-filter="'+t[0]+'"'+(filter===t[0]?' class="selected"':'')+'>'+t[1]+'</button>').join("")+'</div></header><div class="ms-cards">'+(shown.length?shown.map(card).join(""):'<p class="ms-empty">'+(open===0?"还没有里程碑。添加一个属于自己的目标吧。":"当前筛选下没有里程碑。")+'</p>')+'</div></div>'+
 '<aside class="ms-editor"><div class="ms-editor-head"><h3>'+(edit?"编辑里程碑":"添加里程碑")+'</h3><small>只你可见 · 自动云端保存</small></div><form id="milestoneForm"><label>目标名称<input name="title" maxlength="160" required placeholder="例如：完成第一篇论文投稿" value="'+X(edit?.title||"")+'"/></label><label>类别<select name="category">'+options(CATEGORIES,edit?.category||"科研")+'</select></label><label>目标描述<textarea name="detail" rows="4" maxlength="3000" placeholder="什么样的结果表示已经达到目标？">'+X(edit?.detail||"")+'</textarea></label><div class="ms-two"><label>计划日期<input name="due" type="date" value="'+X(edit?.due||"")+'"/></label><label>当前状态<select name="status">'+options(STATES,edit?.status||"计划中")+'</select></label></div><label>进度（%）<div class="ms-progress-input"><input id="msProgress" name="progress" type="range" min="0" max="100" step="5" value="'+Number(edit?.progress||0)+'"/><output id="msProgressOutput">'+Number(edit?.progress||0)+'%</output></div></label><div class="ms-buttons"><button class="ms-save" type="submit">'+(edit?"保存修改":"＋ 添加里程碑")+'</button>'+(edit?'<button type="button" data-ms-action="cancel">取消</button>':'')+'</div></form><p class="ms-help">完成目标时自动记录完成日期。你可以重新编辑或恢复进行，也可删除不再适合的目标。旧版预设里程碑会保留，但也能逐个修改、删除。</p></aside></div></section>';
 const refresh=()=>renderMilestones(root,api);
 const persist=()=>{api.save();api.toast("里程碑已提交私人云端同步");};
 root.onclick=event=>{
  const t=event.target.closest("[data-ms-action],[data-ms-filter]");
  if(!t||!root.contains(t))return;
  if(t.dataset.msFilter){filter=t.dataset.msFilter;refresh();return;}
  const action=t.dataset.msAction,id=t.dataset.id;
  if(action==="cancel"){editId=null;refresh();return;}
  const obj=items.find(x=>x.id===id);
  if(!obj)return;
  if(action==="edit"){editId=id;refresh();return;}
  if(action==="delete"){
   if(!confirm("确定删除“"+obj.title+"”吗？此操作不可撤销。"))return;
   db.milestones=items.filter(x=>x.id!==id);if(editId===id)editId=null;
   persist();refresh();return;
  }
  if(action==="toggle"){
   if(obj.status==="已完成"){obj.status="进行中";obj.completedAt="";obj.progress=Math.min(95,obj.progress||0);}
   else {obj.status="已完成";obj.completedAt=DAY();obj.progress=100;}
   persist();refresh();
  }
 };
 root.oninput=event=>{if(event.target.id==="msProgress"){const output=root.querySelector("#msProgressOutput");if(output)output.textContent=event.target.value+"%";}};
 root.onsubmit=event=>{
  if(event.target.id!=="milestoneForm")return;event.preventDefault();
  const fd=new FormData(event.target),v=k=>String(fd.get(k)||"").trim();
  const title=v("title").slice(0,160);if(!title)return;
  const status=STATES.includes(v("status"))?v("status"):"计划中";
  const due=/^\d{4}-\d{2}-\d{2}$/.test(v("due"))?v("due"):"";
  const category=CATEGORIES.includes(v("category"))?v("category"):"其他";
  let progress=Math.max(0,Math.min(100,Math.round(Number(v("progress"))||0)));
  if(status==="已完成")progress=100;
  const fields={title,category,detail:v("detail").slice(0,3000),status,due,progress};
  const existing=items.find(x=>x.id===editId);
  if(existing){
   const previous=existing.status;
   Object.assign(existing,fields);
   existing.completedAt=status==="已完成"?(existing.completedAt||DAY()):"";
  }else{
   items.push({id:ID(),...fields,createdAt:DAY(),completedAt:status==="已完成"?DAY():""});
  }
  editId=null;persist();refresh();
 };
}
