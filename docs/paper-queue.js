// Dayflow literature inbox — owner-only state, dates based on actual feed metadata.
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const DATE=s=>{const m=/^\d{4}-\d{2}-\d{2}/.exec(String(s||""));return m?m[0]:""};
const localToday=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const daysBetween=(from,to)=>{
 if(!DATE(from)||!DATE(to))return null;
 const a=Date.parse(DATE(from)+"T00:00:00Z"),b=Date.parse(DATE(to)+"T00:00:00Z");
 return Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.floor((b-a)/86400000)):null;
};
export const overdueDays=daysBetween;
export function normalizePaperQueue(x){
 const records=x?.records&&typeof x.records==="object"&&!Array.isArray(x.records)?x.records:{};
 return {records};
}
const stablePaper=p=>({
 id:String(p.id||p.paper_id||p.doi||""),title:String(p.title||"未命名论文"),
 published:String(p.published||""),updated:String(p.updated||""),category:String(p.category||""),
 fluid:String(p.fluid||p.fluid_relevance||""),abstract_zh:String(p.abstract_zh||""),
 abstract:String(p.abstract||""),url:String(p.url||p.link||""),pdf:String(p.pdf_url||p.pdf||""),
 journal:String(p.journal||""),quartile:String(p.quartile||"")
});
export function updatePaperQueue(queue,feed,today=localToday()){
 let changes=0;
 const recommended=new Set((feed?.today_ids||[]).map(String));
 const recommendedDate=DATE(feed?.generated_at);
 // Only the feed's explicitly recommended IDs receive an historical recommendation date.
 for(const p of (feed?.papers||[])){
  const paper=stablePaper(p);
  if(!paper.id||!recommended.has(paper.id))continue;
  const old=queue.records[paper.id];
  if(!old){
   queue.records[paper.id]={id:paper.id,status:"未读",firstRecommended:recommendedDate||today,origin:"recommendation",savedPaper:paper,notes:"",readAt:""};
   changes++;
  }else{
   // Preserve the earliest recommendation date and all reading states, including read items.
   const newer=DATE(recommendedDate||today);
   if(!DATE(old.firstRecommended)||newer<old.firstRecommended){old.firstRecommended=newer;changes++;}
   old.savedPaper=paper;
  }
 }
 return changes;
}
let tab="recommendations",expandedSearch="";
export function renderPaperQueue(root,api){
 const db=api.data(),feed=api.feed()||{papers:[],today_ids:[]};
 db.paperQueue=normalizePaperQueue(db.paperQueue);
 const queue=db.paperQueue,today=localToday(),asOf=DATE(feed.generated_at);
 const latestIDs=new Set((feed.today_ids||[]).map(String));
 const sourceLabel=/arxiv/i.test(String(feed.source||""))?"arXiv · PINN":"文献数据源";
 const changed=updatePaperQueue(queue,feed,today);
 if(changed)api.save();
 const index=new Map((feed.papers||[]).map(p=>[String(p.id||p.paper_id||p.doi),stablePaper(p)]));
 const selected=Object.values(queue.records).filter(r=>r&&r.id);
 // Current titles/abstract translations are always read from the newest feed.
 const docs=selected.map(r=>({...r,paper:index.get(r.id)||r.savedPaper})).filter(r=>r.paper?.id);
 const backlog=docs.filter(r=>r.status!=="已读"&&r.firstRecommended&&overdueDays(r.firstRecommended,today)>0);
 const waiting=docs.filter(r=>r.status!=="已读"),read=docs.filter(r=>r.status==="已读");
 const newest=docs.filter(r=>latestIDs.has(r.id));
 const tabs=[
  ["recommendations",asOf===today?"今日推荐":"最近一期",newest.length],
  ["backlog","积压待读",backlog.length],
  ["waiting","全部待读",waiting.length],
  ["read","已读",read.length],
  ["library","资料库",index.size]
 ];
 const allLibrary=Array.from(index.values()).map(p=>({
  id:p.id,paper:p,status:queue.records[p.id]?.status||"",firstRecommended:queue.records[p.id]?.firstRecommended||"",origin:queue.records[p.id]?.origin||""
 }));
 const list=(tab==="library"?allLibrary:tab==="backlog"?backlog:tab==="waiting"?waiting:tab==="read"?read:newest)
  .filter(r=>(!expandedSearch||[r.paper.title,r.paper.abstract_zh,r.paper.id].join(" ").toLowerCase().includes(expandedSearch.toLowerCase())))
  .sort((a,b)=>{
   if(tab==="backlog")return (a.firstRecommended||"").localeCompare(b.firstRecommended||"");
   return (b.firstRecommended||b.paper.updated||"").localeCompare(a.firstRecommended||a.paper.updated||"");
  });
 const link=s=>/^https?:\/\//i.test(String(s||""))?String(s):"";
 const card=r=>{
  const p=r.paper,old=overdueDays(r.firstRecommended,today);
  const badge=r.firstRecommended?(old>0&&r.status!=="已读"?"积压 "+old+" 天":r.status==="已读"?"已读":r.origin==="manual"?"待读":"新推荐"):"未加入";
  const fluid={direct:"流体直接相关",transfer:"可迁移方法",fallback:"纯流体领域"}[p.fluid]||p.fluid;
  const abstract=p.abstract_zh||p.abstract;
  const stateActions=r.status==="已读"
    ?'<button type="button" data-pq-act="unread" data-id="'+E(p.id)+'">标为未读</button>'
    :r.status==="在读"
      ?'<button type="button" data-pq-act="read" data-id="'+E(p.id)+'" class="pq-primary">完成阅读 ✓</button><button type="button" data-pq-act="unread" data-id="'+E(p.id)+'">未读</button>'
      :'<button type="button" data-pq-act="start" data-id="'+E(p.id)+'">开始阅读</button><button type="button" data-pq-act="read" data-id="'+E(p.id)+'" class="pq-primary">标为已读</button>';
  const actions=r.status?stateActions:'<button type="button" data-pq-act="add" data-id="'+E(p.id)+'" class="pq-primary">加入待读</button>';
  const href=link(p.url),pdf=link(p.pdf);
  const notes=queue.records[p.id]?.notes||"";
  return '<article class="pq-paper"><div class="pq-paper-top"><div class="pq-paper-main"><div class="pq-mini">'+E(p.published||"发布日期未提供")+(fluid?' · '+E(fluid):"")+(p.journal?' · '+E(p.journal):"")+'</div><h3>'+E(p.title)+'</h3></div><span class="pq-state'+(old>0&&r.status!=="已读"?' overdue':'')+'">'+E(badge)+'</span></div><div class="pq-foot"><div class="pq-quick">'+actions+'</div><div class="pq-links">'+(href?'<a href="'+E(href)+'" target="_blank" rel="noopener noreferrer">论文 ↗</a>':"")+(pdf?'<a href="'+E(pdf)+'" target="_blank" rel="noopener noreferrer">PDF ↗</a>':"")+'</div></div>'+(abstract?'<details class="pq-details"><summary>'+(p.abstract_zh?"中文摘要":"英文摘要")+'</summary><p>'+E(abstract)+'</p></details>':"")+(r.status?'<details class="pq-details"><summary>阅读笔记'+(notes?" · 已保存":"")+'</summary><form data-pq-note="'+E(p.id)+'"><textarea name="note" rows="3" maxlength="10000" placeholder="方法、创新点、与我的研究的联系">'+E(notes)+'</textarea><button type="submit">保存笔记</button></form></details>':"")+'</article>';
 };
 const summary='<div class="pq-summary"><div><strong>'+newest.length+'</strong><span>本期推荐</span></div><div><strong>'+backlog.length+'</strong><span>积压待读</span></div><div><strong>'+read.length+'</strong><span>已读归档</span></div></div>';
 root.innerHTML='<div class="pq-shell"><div class="pq-head"><div><span class="pq-overline">PAPER INBOX · PRIVATE</span><h2>文献收件箱</h2></div><div class="pq-meta"><span>'+E(sourceLabel)+'</span><span class="pq-freshness'+(asOf!==today?" stale":"")+'">'+(asOf?"更新 "+asOf:"暂无同步日期")+'</span></div></div>'+summary+
 '<div class="pq-toolbar"><div class="pq-tabs">'+tabs.map(x=>'<button type="button" data-pq-tab="'+x[0]+'"'+(tab===x[0]?' class="active"':'')+'>'+x[1]+' <span>'+x[2]+'</span></button>').join("")+'</div><label class="pq-search"><span>⌕</span><input id="pqSearch" placeholder="搜索论文" value="'+E(expandedSearch)+'"/></label></div><div class="pq-list">'+(list.length?list.slice(0,120).map(card).join(""):'<div class="pq-empty">这一栏暂时没有论文</div>')+'</div>'+
 '<div class="pq-legend">积压天数按首次推荐或加入待读的日期计算。</div></div>';
 const rerender=()=>renderPaperQueue(root,api);
 const persist=()=>{api.save();api.toast("阅读状态已保存到私人云端");};
 root.onclick=e=>{
  const t=e.target.closest("[data-pq-act],[data-pq-tab]");
  if(!t||!root.contains(t))return;
  if(t.dataset.pqTab){tab=t.dataset.pqTab;expandedSearch="";rerender();return;}
  const action=t.dataset.pqAct,id=t.dataset.id,paper=index.get(id)||queue.records[id]?.savedPaper;
  if(!paper)return;
  let record=queue.records[id];
  if(!record){
   record=queue.records[id]={id,status:"未读",firstRecommended:today,origin:"manual",savedPaper:paper,notes:"",readAt:""};
  }
  if(action==="start"){record.status="在读";record.readAt="";}
  else if(action==="read"){record.status="已读";record.readAt=new Date().toISOString();}
  else if(action==="unread"){record.status="未读";record.readAt="";}
  record.savedPaper=paper;
  persist();rerender();
 };
 root.oninput=e=>{
  if(e.target.id!=="pqSearch")return;
  expandedSearch=e.target.value;
  // Search filters existing cards without rebuilding the input and losing focus.
  root.querySelectorAll(".pq-paper").forEach(card=>{
   card.hidden=!card.textContent.toLowerCase().includes(expandedSearch.toLowerCase());
  });
 };
 root.onsubmit=e=>{
  const form=e.target.closest("[data-pq-note]");
  if(!form||!root.contains(form))return;e.preventDefault();
  const record=queue.records[form.dataset.pqNote];if(!record)return;
  record.notes=String(new FormData(form).get("note")||"").slice(0,10000);
  persist();rerender();
 };
}
