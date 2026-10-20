import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const src=await readFile(new URL("../docs/daybook.js",import.meta.url),"utf-8");
const mod=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(src));
assert.equal(mod.validateDayEntry({date:"2026-10-20",start:"09:00",end:"10:30",title:"阅读论文",category:"科研",status:"已记录",note:""}),null);
assert.match(mod.validateDayEntry({date:"2026-10-20",start:"10:30",end:"09:00",title:"不合法",category:"科研",status:"计划"}),/结束时间/);
assert.match(mod.validateDayEntry({date:"2026-10-20",start:"09:00",end:"10:00",title:"",category:"科研",status:"计划"}),/填写/);
assert.equal(mod.normalizeDaybook({}).length,0);
const previousFormData=globalThis.FormData,previousConfirm=globalThis.confirm;
globalThis.FormData=class{constructor(form){this.values=form.values;}get(k){return this.values[k]??null;}};
globalThis.confirm=()=>true;
const db={version:1,entries:[{id:"older",text:"research note"}],life:{habits:[{id:"h",name:"walk"}]},daybook:[]};
const snapshots=[];
const api={data:()=>db,save:()=>{snapshots.push(structuredClone(db));},toast:()=>{}};
const root={innerHTML:"",contains:()=>true};
try{
 mod.renderDaybook(root,api,{compact:true});
 assert.match(root.innerHTML,/今天的时间表/);
 assert.match(root.innerHTML,/科研与生活/);
 const dateText=new Date().toLocaleDateString("en-CA");
 const currentDate=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0")+"-"+String(new Date().getDate()).padStart(2,"0");
 const submit=(values)=>{
  const form={id:"db-form",values};
  root.onsubmit({target:form,preventDefault(){}});
 };
 submit({start:"09:00",end:"10:30",title:"论文阅读",category:"科研",status:"已记录",note:"读完一章"});
 assert.equal(db.daybook.length,1);
 assert.equal(db.daybook[0].date,currentDate);
 assert.equal(db.daybook[0].status,"已记录");
 assert.equal(db.entries[0].id,"older");
 assert.equal(db.life.habits[0].id,"h");
 const originalId=db.daybook[0].id;
 root.onclick({target:{closest:()=>({dataset:{dbAct:"edit",id:originalId}})}});
 assert.match(root.innerHTML,/保存修改/);
 submit({start:"09:00",end:"11:00",title:"论文与笔记",category:"科研",status:"已记录",note:""});
 assert.equal(db.daybook.length,1);
 assert.equal(db.daybook[0].end,"11:00");
 mod.renderDaybook(root,api,{compact:false});
 assert.match(root.innerHTML,/每日时间表/);
 root.onclick({target:{closest:()=>({dataset:{dbAct:"delete",id:originalId}})}});
 assert.equal(db.daybook.length,0);
 assert(snapshots.length>=3);
 console.log("PASS: minimalist daybook, time validation, CRUD, private document persistence and legacy compatibility");
}finally{
 globalThis.FormData=previousFormData;globalThis.confirm=previousConfirm;
}
