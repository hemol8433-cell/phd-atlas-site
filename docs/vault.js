// Private attachment vault. File bytes live in a non-public Supabase Storage bucket.
const BUCKET="phd-atlas-private";
const TYPES={research:"科研与实验",papers:"论文与文档",images:"照片与图片",life:"生活资料",other:"其他资料"};
const allow={
 jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",
 pdf:"application/pdf",txt:"text/plain",md:"text/markdown",csv:"text/csv",
 doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation"
};
const limit=25*1024*1024;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const bytes=x=>x>=1048576?(x/1048576).toFixed(1)+" MB":x>=1024?(x/1024).toFixed(0)+" KB":x+" B";
let category="all",listed=[],busy=false,previewUrl=null,editMetaPath=null;
const safeName=file=>String(file.name||"unnamed").slice(0,230);
function closePreview(root){
 const dialog=root.querySelector("#vaultPreview");
 if(dialog?.open)dialog.close();
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
}
export function fileIsAllowed(file){
 const suffix=safeName(file).split(".").pop().toLowerCase();
 if(!Object.prototype.hasOwnProperty.call(allow,suffix))return false;
 if(file.size>limit||file.size<=0)return false;
 // Browser MIME varies for Office documents; extension whitelist remains binding.
 if(file.type && file.type!=="application/octet-stream" &&
    file.type!==allow[suffix] &&
    !((suffix==="txt"||suffix==="md"||suffix==="csv") && file.type.startsWith("text/")))return false;
 return true;
}
export async function renderVault(root,api){
 const db=api.data(),ctx=api.session;
 if(!Array.isArray(db.vaultFiles))db.vaultFiles=[];
 const storage=ctx.client.storage.from(BUCKET);
 const prefix=ctx.user.id+"/uploads/";
 const filesMap=new Map(db.vaultFiles.map(v=>[v.path,v]));
 const categorySelect=Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join("");
 const tabs=[["all","全部资料"],...Object.entries(TYPES)];
 root.innerHTML='<div class="vt-hero"><div><span class="vt-overline">MY PRIVATE CLOUD · FILE LIBRARY</span><h2>我的资料库 <em>Private Vault</em></h2><p>科研与生活的照片、PDF、Word 和表格可以上传、预览、下载，并在其他电脑登录后访问。</p></div><div class="vt-lock">🔒 私人文件空间</div></div>'+
 '<div class="vt-layout"><section class="vt-panel"><div class="vt-panel-head"><h3>上传文件</h3><small>非公开存储 · 单文件不超过 25 MB</small></div><form id="vaultUpload"><label>文件类别</label><select name="category">'+categorySelect+'</select><label>选择图片或文档</label><input type="file" name="files" multiple required accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"/><label>备注（可选）</label><textarea name="note" rows="3" maxlength="250" placeholder="这份资料是什么？方便未来检索。"></textarea><button type="submit" class="vt-button">上传到私人云端</button></form><p class="vt-tip">支持 JPG/PNG/WebP/GIF、PDF、Word、Excel、PPT、TXT、Markdown、CSV。文件只保存在 Supabase 私人存储，不会提交到公开 GitHub 仓库。</p><div id="vaultMessage" class="vt-message" role="status"></div></section>'+
 '<section class="vt-panel vt-files"><div class="vt-panel-head"><h3>文件资料</h3><span id="vaultCount">加载中…</span></div><div class="vt-tabs">'+tabs.map(([k,v])=>'<button type="button" data-vt-filter="'+k+'" class="'+(k===category?"active":"")+'">'+v+'</button>').join("")+'</div><div id="vaultList" class="vt-file-list"><p class="vt-empty">正在读取私人云端文件…</p></div></section></div>'+
 '<dialog id="vaultPreview" class="vt-preview"><div class="vt-preview-head"><strong id="vaultPreviewName">预览</strong><button type="button" id="vaultClose">关闭 ×</button></div><div id="vaultPreviewBody"></div></dialog>';
 const notice=text=>{root.querySelector("#vaultMessage").textContent=text;api.toast(text);};
 const listNode=root.querySelector("#vaultList");
 const show=()=>{
  const entries=category==="all"?listed:listed.filter(x=>x.category===category);
  root.querySelector("#vaultCount").textContent=entries.length+(listed.length>=500?"＋":"")+" 份文件";
  root.querySelectorAll("[data-vt-filter]").forEach(btn=>btn.classList.toggle("active",btn.dataset.vtFilter===category));
  listNode.innerHTML=entries.length?entries.map(entry=>{
    const f=entry.file,meta=filesMap.get(entry.path);
    const name=meta?.name||f.name.replace(/^\d+-[a-z0-9]+-?/,"");
    const mime=meta?.mime||f.metadata?.mimetype||"";
    const image=mime.startsWith("image/"),pdf=mime==="application/pdf";
    const icon=image?"▧":pdf?"▤":"▥";
    const metaEditor=editMetaPath===entry.path?'<form class="vt-meta-editor" data-vt-meta="'+esc(entry.path)+'"><label>显示名称<input name="name" required maxlength="230" value="'+esc(meta?.name||name)+'"/></label><label>资料类别<select name="category">'+Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'"'+(k===entry.category?' selected':'')+'>'+v+'</option>').join("")+'</select></label><label>备注<textarea name="note" rows="2" maxlength="250">'+esc(meta?.note||"")+'</textarea></label><div><button type="submit">保存修改</button><button type="button" data-vt-act="cancel-meta" data-path="'+esc(entry.path)+'">取消</button></div></form>':'';
    return '<article class="vt-item"><div class="vt-file-icon">'+icon+'</div><div class="vt-file-info"><strong title="'+esc(name)+'">'+esc(name)+'</strong><small>'+esc(TYPES[entry.category]||"文件")+' · '+bytes(Number(f.metadata?.size)||Number(meta?.size)||0)+' · '+esc((f.created_at||meta?.createdAt||"").slice(0,10))+'</small>'+(meta?.note?'<p>'+esc(meta.note)+'</p>':"")+'</div><div class="vt-actions">'+((image||pdf)?'<button type="button" data-vt-act="preview" data-path="'+esc(entry.path)+'">预览</button>':"")+'<button type="button" data-vt-act="download" data-path="'+esc(entry.path)+'">下载</button><button type="button" data-vt-act="edit-meta" data-path="'+esc(entry.path)+'">编辑信息</button><button type="button" data-vt-act="delete" data-path="'+esc(entry.path)+'">删除</button></div>'+metaEditor+'</article>';
  }).join(""):'<div class="vt-empty">这个分类中还没有文件。选择左侧资料，即可安全上传。</div>';
 };
 async function refresh(){
  listNode.innerHTML='<p class="vt-empty">正在同步私人文件列表…</p>';
  const batches=await Promise.all(Object.keys(TYPES).map(async k=>{
   const {data,error}=await storage.list(prefix+k,{limit:100,sortBy:{column:"created_at",order:"desc"}});
   if(error)return {k,error};
   return {k,data:data||[]};
  }));
  const failed=batches.filter(x=>x.error);
  if(failed.length)notice("部分文件列表加载失败："+failed[0].error.message);
  listed=batches.flatMap(x=>(x.data||[]).filter(f=>f.id && !f.name.startsWith(".")).map(file=>({
    path:prefix+x.k+"/"+file.name,category:x.k,file
  }))).sort((a,b)=>String(b.file.created_at||"").localeCompare(String(a.file.created_at||"")));
  show();
 }
 await refresh();
 root.querySelector("#vaultClose").onclick=()=>closePreview(root);
 root.querySelector("#vaultPreview").addEventListener("close",()=>closePreview(root));
 root.addEventListener("submit",async event=>{
  const form=event.target.closest("[data-vt-meta]");
  if(!form||!root.contains(form))return;
  event.preventDefault();if(busy)return;
  const path=form.dataset.vtMeta,entry=listed.find(x=>x.path===path);
  if(!entry){notice("找不到这份文件");return;}
  const fd=new FormData(form),name=String(fd.get("name")||"").trim().slice(0,230),note=String(fd.get("note")||"").slice(0,250),nextCategory=String(fd.get("category")||entry.category);
  if(!name){notice("请填写文件显示名称");return;}
  if(!Object.hasOwn(TYPES,nextCategory)){notice("请选择有效的资料类别");return;}
  let nextPath=path;
  if(nextCategory!==entry.category){
   const fileName=path.split("/").pop();nextPath=prefix+nextCategory+"/"+fileName;
   busy=true;
   const {error}=await storage.move(path,nextPath);
   busy=false;
   if(error){notice("移动文件类别失败："+error.message);return;}
  }
  const existing=filesMap.get(path)||{path,name,category:entry.category,createdAt:entry.file.created_at||new Date().toISOString()};
  db.vaultFiles=db.vaultFiles.filter(x=>x.path!==path);
  db.vaultFiles.push({...existing,path:nextPath,name,note,category:nextCategory});
  api.save();filesMap.delete(path);filesMap.set(nextPath,{...existing,path:nextPath,name,note,category:nextCategory});
  editMetaPath=null;notice("文件信息已修改并同步");await refresh();
 });
 root.querySelector("#vaultUpload").onsubmit=async event=>{
  event.preventDefault();
  if(busy)return;
  const form=event.target,files=[...form.elements.files.files],type=form.elements.category.value;
  if(!Object.hasOwn(TYPES,type)||!files.length)return;
  if(files.length>12){notice("一次最多上传 12 个文件");return;}
  const invalid=files.find(x=>!fileIsAllowed(x));
  if(invalid){notice("文件格式不支持，或大小超过 25 MB："+invalid.name);return;}
  busy=true;form.querySelector("button[type=submit]").disabled=true;
  let success=0;
  for(const file of files){
   const ext=file.name.split(".").pop().toLowerCase();
   const key=Date.now()+"-"+Math.random().toString(36).slice(2,10)+"."+ext;
   const path=prefix+type+"/"+key;
   const {error}=await storage.upload(path,file,{cacheControl:"3600",contentType:allow[ext],upsert:false});
   if(error){notice("上传失败："+file.name+"（"+error.message+"）");continue;}
   db.vaultFiles.push({path,name:safeName(file),mime:allow[ext],size:file.size,category:type,note:form.elements.note.value.slice(0,250),createdAt:new Date().toISOString()});
   success++;
  }
  if(success)api.save();
  busy=false;form.querySelector("button[type=submit]").disabled=false;
  if(success)notice(success+" 份文件已上传，并提交私人元数据同步");
  form.reset();
  filesMap.clear();db.vaultFiles.forEach(v=>filesMap.set(v.path,v));
  await refresh();
 };
 root.onclick=async event=>{
  const filter=event.target.closest("[data-vt-filter]");
  if(filter){category=filter.dataset.vtFilter;show();return;}
  const button=event.target.closest("[data-vt-act]");
  if(!button||busy)return;
  const path=button.dataset.path,action=button.dataset.vtAct,entry=listed.find(x=>x.path===path);
  if(action==="edit-meta"){if(!entry)return;editMetaPath=path;show();return;}
  if(action==="cancel-meta"){editMetaPath=null;show();return;}
  if(!entry)return;
  if(action==="delete"){
   if(!confirm("确定从私人云端永久删除文件？此操作无法撤销。"))return;
   busy=true;
   const {error}=await storage.remove([path]);
   busy=false;
   if(error){notice("删除失败："+error.message);return;}
   db.vaultFiles=db.vaultFiles.filter(x=>x.path!==path);
   api.save();filesMap.delete(path);notice("私人文件已删除");await refresh();return;
  }
  if(action!=="preview"&&action!=="download")return;
  busy=true;
  const {data,error}=await storage.download(path);busy=false;
  if(error){notice("读取文件失败："+error.message);return;}
  const meta=filesMap.get(path);
  const name=meta?.name||entry.file.name;
  const blobUrl=URL.createObjectURL(data);
  if(action==="download"){
   const a=document.createElement("a");a.href=blobUrl;a.download=name;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(blobUrl),30000);
  }else{
   closePreview(root);previewUrl=blobUrl;
   root.querySelector("#vaultPreviewName").textContent=name;
   const body=root.querySelector("#vaultPreviewBody");
   const mime=meta?.mime||data.type||"";
   if(mime.startsWith("image/")){
    const img=document.createElement("img");img.src=blobUrl;img.alt=name;body.replaceChildren(img);
   }else{
    const frame=document.createElement("iframe");frame.src=blobUrl;frame.title=name;body.replaceChildren(frame);
   }
   root.querySelector("#vaultPreview").showModal();
  }
 };
}
