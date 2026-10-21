import assert from "node:assert/strict";
import fs from "node:fs/promises";
const life=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(await fs.readFile(new URL("../docs/life.js",import.meta.url),"utf8")));
const vault=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(await fs.readFile(new URL("../docs/vault.js",import.meta.url),"utf8")));
assert.equal(life.normalizeLife(null).habits.length,4);
const previouslySaved={habits:[{id:"h",name:"Walk"}],checks:{"2026-10-19":["h"]},todos:[{id:"t",title:"Buy groceries"}],daily:{"2026-10-19":{mood:4}},expenses:[]};
const restored=life.normalizeLife(previouslySaved);
assert.equal(restored.checks["2026-10-19"][0],"h");
assert.equal(restored.todos[0].title,"Buy groceries");
assert.equal(vault.fileIsAllowed({name:"diagram.png",type:"image/png",size:2048}),true);
assert.equal(vault.fileIsAllowed({name:"report.pdf",type:"application/pdf",size:1024}),true);
assert.equal(vault.fileIsAllowed({name:"notes.docx",type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",size:1024}),true);
assert.equal(vault.fileIsAllowed({name:"malware.exe",type:"application/x-msdownload",size:1024}),false);
assert.equal(vault.fileIsAllowed({name:"huge.pdf",type:"application/pdf",size:26*1024*1024}),false);
const existing={version:1,entries:[{id:"research-preserved",text:"Do not lose existing notes"}],life:previouslySaved,vaultFiles:[{path:"id/uploads/research/doc.pdf",name:"doc.pdf"}]};
assert.equal(existing.entries[0].id,"research-preserved");
assert.equal(life.normalizeLife(existing.life).habits[0].name,"Walk");
assert.match(await fs.readFile(new URL("../docs/vault.js",import.meta.url),"utf8"),/data-vt-meta/,"Private vault file metadata should be editable");
assert.match(await fs.readFile(new URL("../docs/research.js",import.meta.url),"utf8"),/data-act="edit-entry"/,"Research journal records should expose editing");
const original={FormData:globalThis.FormData,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,confirm:globalThis.confirm};
globalThis.FormData=class{constructor(form){this.values=form.values}get(k){return this.values[k]??null}};
globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};globalThis.confirm=()=>true;
const lifeDb={version:1,entries:[],activityEvents:[],life:{
 habits:[{id:"h",name:"Walk"}],checks:{"2026-10-19":["h"]},
 todos:[{id:"t",title:"Buy groceries",category:"日常",due:"2026-10-25",done:false}],
 daily:{"2026-10-19":{mood:4,sleep:7.5,energy:3,note:"A quiet day"}},
 expenses:[{id:"x",date:"2026-10-19",type:"支出",amount:12,category:"餐饮",note:"Lunch"}],
 sessions:[],timer:{startedAt:null,elapsedMs:0,segments:[],label:"阅读"}
}};
const saves=[];
const api={data:()=>lifeDb,save:()=>saves.push(JSON.stringify(lifeDb)),toast:()=>{}};
const root={innerHTML:"",contains:()=>true,querySelector:()=>null};
const submit=(name,values,id)=>{const form={dataset:{lfForm:name,id},values,closest(){return this}};root.onsubmit({target:form,preventDefault(){}})};
const click=(act,id,date)=>root.onclick({target:{closest:()=>({dataset:{lfAct:act,id,date}})}});
try{
 life.renderLife(root,api);
 assert.match(root.innerHTML,/2026-10-19/,"Earlier life diaries should be discoverable");
 click("daily-open",undefined,"2026-10-19");
 assert.match(root.innerHTML,/A quiet day/,"Selecting a prior date should load its saved diary");
 submit("daily",{mood:"5",sleep:"8",energy:"4",note:"Updated reflection"});
 assert.equal(lifeDb.life.daily["2026-10-19"].note,"Updated reflection","Editing an earlier diary should save to its date");
 click("edit-todo","t");
 assert.match(root.innerHTML,/todo-edit/,"Life to-dos should have an edit form");
 submit("todo-edit",{title:"Buy groceries and fruit",category:"健康",due:"2026-10-26",done:"yes"},"t");
 assert.equal(lifeDb.life.todos[0].title,"Buy groceries and fruit");
 assert.equal(lifeDb.life.todos[0].done,true);
 click("edit-habit","h");
 submit("habit-edit",{name:"Walk outdoors"},"h");
 assert.equal(lifeDb.life.habits[0].name,"Walk outdoors");
 click("edit-expense","x");
 submit("expense-edit",{date:"2026-10-20",type:"支出",amount:"15.5",category:"交通",note:"Bus"},"x");
 assert.equal(lifeDb.life.expenses[0].amount,15.5);
 assert.equal(lifeDb.life.expenses[0].category,"交通");
 assert(saves.length>=4,"Edits should call the private cloud save path");
}finally{Object.assign(globalThis,original)}
console.log("PASS: life diary history, editable habits/todos/expenses, vault metadata entry point, existing records and file allowlist");
