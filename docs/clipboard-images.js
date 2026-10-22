// Clipboard screenshots are stored as private Supabase Storage objects.
// Notes contain only stable attachment markers, never base64 or public URLs.
const BUCKET = "phd-atlas-private";
const TYPES = {"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"};
const LIMIT = 25*1024*1024;
const TOKEN_RE = /\[\[截图:([0-9a-f-]{16,64})\]\]/gi;

export function imageMarker(id) {
 if(!/^[0-9a-f-]{16,64}$/i.test(String(id))) throw Error("Invalid attachment ID");
 return "[[截图:"+id+"]]";
}
export function imageIds(text) {
 return [...String(text||"").matchAll(TOKEN_RE)].map(match=>match[1]);
}
export function supportedImage(file) {
 return !!file && Object.hasOwn(TYPES,file.type) && file.size>0 && file.size<=LIMIT;
}
export function clipboardImages(data) {
 return [...(data?.items||[])].filter(item=>item.kind==="file" && item.type.startsWith("image/")).map(item=>item.getAsFile()).filter(Boolean).slice(0,4);
}
export function appendImageMarker(value,id,start,end,maxLength=0) {
 const before=String(value||"");
 const a=Math.max(0,Math.min(before.length,start));
 const b=Math.max(a,Math.min(before.length,end));
 const token=(a>0 && before[a-1]!=="\n"?"\n":"")+imageMarker(id)+"\n";
 const next=before.slice(0,a)+token+before.slice(b);
 if(maxLength>0 && next.length>maxLength) return null;
 return {value:next,caret:a+token.length,insert:token};
}

export function installClipboardImages({session,getData,save,toast}) {
 if(typeof document==="undefined" || document.body.dataset.sxPasteReady==="yes")return;
 document.body.dataset.sxPasteReady="yes";
 const storage=session.client.storage.from(BUCKET);
 const uid=session.user.id;
 const attachments=()=>Array.isArray(getData().vaultFiles)?getData().vaultFiles:[];
 const lookup=id=>attachments().find(x=>x.attachmentId===id);
 let activeUrl=null,dialog=null,renderQueued=false;
 const notify=text=>{if(typeof toast==="function")toast(text);};
 const validTarget=el=>el?.tagName==="TEXTAREA" && !el.closest("#vaultUpload") && !el.disabled && !el.readOnly;
 const trayFor=target=>{
  let tray=target.nextElementSibling;
  if(!tray?.classList?.contains("sx-paste-tray")){
   tray=document.createElement("div");tray.className="sx-paste-tray";
   target.insertAdjacentElement("afterend",tray);
  }
  return tray;
 };
 const addChip=(target,id,file)=>{
  const tray=trayFor(target);
  const chip=document.createElement("button");chip.type="button";
  chip.className="sx-paste-chip";chip.dataset.sxImage=id;
  const name=document.createElement("span");name.textContent="已添加截图 · 点击查看";
  const preview=document.createElement("img");preview.alt="刚粘贴的截图缩略图";
  if(file){
   const src=URL.createObjectURL(file);
   preview.src=src;preview.onload=()=>URL.revokeObjectURL(src);
   preview.onerror=()=>URL.revokeObjectURL(src);
   chip.appendChild(preview);
  }
  chip.appendChild(name);tray.appendChild(chip);
 };
 const renderExisting=target=>{
  if(!validTarget(target))return;
  const tray=trayFor(target);
  for(const id of imageIds(target.value)){
   if(lookup(id) && ![...tray.querySelectorAll("[data-sx-image]")].some(x=>x.dataset.sxImage===id))addChip(target,id);
  }
  if(!tray.childNodes.length){
   const hint=document.createElement("small");hint.textContent="📷 支持 Ctrl+V 粘贴截图";
   tray.appendChild(hint);
  }
 };
 document.addEventListener("focusin",event=>{if(validTarget(event.target))renderExisting(event.target);});
 document.addEventListener("paste",async event=>{
  const target=event.target;
  if(!validTarget(target))return;
  const files=clipboardImages(event.clipboardData);
  if(!files.length)return;  // ordinary text paste remains unchanged
  event.preventDefault(); // never paste base64 image bytes into text
  if(target.dataset.sxUploading==="yes"){notify("上一张截图仍在上传，请稍后再粘贴");return;}
  target.dataset.sxUploading="yes";
  const form=target.closest("form");
  if(form){form.dataset.sxUploading="yes";for(const btn of form.querySelectorAll('button[type="submit"],input[type="submit"]'))btn.disabled=true;}
  const tray=trayFor(target);
  const hint=tray.querySelector("small");if(hint)hint.remove();
  const status=document.createElement("small");status.className="sx-upload-status";
  status.textContent="正在上传私人截图…";tray.appendChild(status);
  let success=0;
  try{
   for(const file of files){
    if(!supportedImage(file)){notify("截图必须是 PNG/JPG/WebP/GIF，且不超过 25 MB");continue;}
    const id=crypto.randomUUID();
    const marker=appendImageMarker(target.value,id,target.selectionStart??target.value.length,target.selectionEnd??target.value.length,target.maxLength);
    if(!marker){notify("此输入框的文字长度已达到上限，无法加入截图");continue;}
    const path=uid+"/uploads/images/clipboard-"+id+"."+TYPES[file.type];
    const {error}=await storage.upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});
    if(error){notify("截图上传失败："+error.message);continue;}
    const db=getData();
    if(!Array.isArray(db.vaultFiles))db.vaultFiles=[];
    db.vaultFiles.push({attachmentId:id,path,name:"粘贴截图 "+new Date().toLocaleString("zh-CN")+"."+TYPES[file.type],mime:file.type,size:file.size,category:"images",note:"粘贴至工作台记录",createdAt:new Date().toISOString()});
    if(target.isConnected){
     const fresh=appendImageMarker(target.value,id,target.selectionStart??target.value.length,target.selectionEnd??target.value.length,target.maxLength);
     if(fresh){
      target.value=fresh.value;
      target.setSelectionRange(fresh.caret,fresh.caret);
      target.dispatchEvent(new Event("input",{bubbles:true}));
      addChip(target,id,file);
     }else notify("截图保存在私人资料库，但当前输入框已无法插入引用");
    }else notify("截图已存入私人资料库；原编辑框已关闭，请重新打开记录");
    save();success++;
   }
  }catch(error){notify("粘贴图片失败："+(error?.message||"未知错误"));}
  finally{
   target.dataset.sxUploading="no";
   if(form){delete form.dataset.sxUploading;for(const btn of form.querySelectorAll('button[type="submit"],input[type="submit"]'))btn.disabled=false;}
   status.remove();
   if(success && target.isConnected)notify("已安全上传截图。请保存当前文字记录以保留关联。");
   scheduleRender();
  }
 },true);
 document.addEventListener("submit",event=>{
  if(event.target.dataset?.sxUploading==="yes"){
   event.preventDefault();event.stopImmediatePropagation();
   notify("请等截图上传完成后再保存记录");
  }
 },true);

 async function viewImage(id){
  const metadata=lookup(id);
  if(!metadata){notify("找不到截图，可能已从资料库删除");return;}
  if(!metadata.path.startsWith(uid+"/uploads/")){notify("截图路径未通过身份校验");return;}
  if(!dialog){
   dialog=document.createElement("dialog");dialog.className="sx-image-dialog";
   dialog.innerHTML='<div class="sx-image-dialog-head"><strong>私人截图</strong><button type="button" data-sx-close>关闭 ×</button></div><div class="sx-image-content">正在读取截图…</div>';
   document.body.appendChild(dialog);
   dialog.addEventListener("click",e=>{if(e.target.matches("[data-sx-close]"))dialog.close();});
   dialog.addEventListener("close",()=>{if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null;}dialog.querySelector(".sx-image-content").replaceChildren();});
  }
  if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null;}
  const container=dialog.querySelector(".sx-image-content");container.textContent="正在从私人云端加载…";
  if(!dialog.open)dialog.showModal();
  const {data,error}=await storage.download(metadata.path);
  if(error){container.textContent="截图读取失败："+error.message;return;}
  if(!dialog.open)return;
  activeUrl=URL.createObjectURL(data);
  const img=document.createElement("img");img.src=activeUrl;img.alt=metadata.name||"私人截图";
  const link=document.createElement("a");link.href=activeUrl;link.download=metadata.name||"截图.png";link.textContent="下载原图";
  container.replaceChildren(img,link);
 }
 document.addEventListener("click",event=>{
  const button=event.target.closest?.("[data-sx-image]");
  if(button){event.preventDefault();viewImage(button.dataset.sxImage);}
 });
 function decorateTextNode(node){
  const text=node.nodeValue;
  if(!text?.includes("[[截图:"))return;
  const matches=[...text.matchAll(TOKEN_RE)];
  if(!matches.length)return;
  const fragment=document.createDocumentFragment();
  let cursor=0;
  for(const match of matches){
   fragment.appendChild(document.createTextNode(text.slice(cursor,match.index)));
   const id=match[1],meta=lookup(id);
   const button=document.createElement("button");button.type="button";
   button.className="sx-attachment";button.dataset.sxImage=id;
   button.textContent=meta?"📷 查看截图":"📷 截图已删除";
   if(!meta)button.disabled=true;
   fragment.appendChild(button);cursor=match.index+match[0].length;
  }
  fragment.appendChild(document.createTextNode(text.slice(cursor)));
  node.replaceWith(fragment);
 }
 function renderMarkers(){
  if(!document.body)return;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()){
   const node=walker.currentNode;
   if(!node.nodeValue?.includes("[[截图:"))continue;
   if(node.parentElement?.closest("textarea,script,style,select,option,code,pre,[contenteditable],.sx-image-dialog"))continue;
   nodes.push(node);
  }
  for(const n of nodes)decorateTextNode(n);
 }
 function scheduleRender(){if(renderQueued)return;renderQueued=true;queueMicrotask(()=>{renderQueued=false;renderMarkers();});}
 const observer=new MutationObserver(scheduleRender);
 observer.observe(document.body,{childList:true,subtree:true});
 scheduleRender();
}