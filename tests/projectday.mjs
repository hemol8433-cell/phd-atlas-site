import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const code = await readFile(new URL("../docs/projectday.js",import.meta.url),"utf-8");
const mod=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(code));
const original={FormData:globalThis.FormData,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,confirm:globalThis.confirm};
globalThis.FormData=class {constructor(form){this.values=form.values}get(k){return this.values[k]??null}};
globalThis.setInterval=()=>1;
globalThis.clearInterval=()=>{};
globalThis.confirm=()=>true;
const snapshots=[],messages=[];
const data={version:1,year:2,entries:[{id:"existing",text:"original",date:"2026-10-20"}]};
const api={data:()=>data,save:()=>snapshots.push(JSON.stringify(data)),toast:m=>messages.push(m)};
const root={innerHTML:"",contains:()=>true,querySelector:()=>null};
try {
 assert.deepEqual(mod.normalizeProjectDay(null).tasks,[]);
 mod.renderProjectDay(root,api);
 assert.match(root.innerHTML,/任务四象限/);
 assert.match(root.innerHTML,/今日重点/);
 assert.match(root.innerHTML,/专注计时/);
 assert.equal(data.entries[0].id,"existing");
 const submit=(name,values)=>{
   const f={dataset:{pdForm:name},values};
   f.closest=()=>f;
   root.onsubmit({target:f,preventDefault(){}});
 };
 submit("project",{title:"Transient cavity validation",category:"实验",description:"Four preprocessing modes",due:""});
 assert.equal(data.projectday.projects.length,1);
 const pid=data.projectday.projects[0].id;
 submit("task",{title:"Check four L2 curves",projectId:pid,quadrant:"Q2",due:"2026-10-25"});
 assert.equal(data.projectday.tasks.length,1);
 assert.equal(data.projectday.tasks[0].quadrant,"Q2");
 const taskId=data.projectday.tasks[0].id;
 root.onchange({target:{dataset:{pdChange:"task-done",id:taskId},checked:true}});
 assert.equal(data.projectday.tasks[0].done,true);
 submit("daily",{priority:"Verify PDE derivative",minimum:"Make one plot",reflection:"Keep seed fixed"});
 assert.equal(data.projectday.daily[Object.keys(data.projectday.daily)[0]].priority,"Verify PDE derivative");
 submit("session",{projectId:pid,minutes:"45",date:"2026-10-20",note:"Ran baseline"});
 assert.equal(data.projectday.sessions[0].seconds,2700);
 submit("idea",{text:"Check gradient conflict"});
 assert.equal(data.projectday.ideas[0].text,"Check gradient conflict");
 assert.equal(data.entries.length,1,"Existing PhD entries must be preserved");
 assert(snapshots.length>=5,"All changes should sync using existing private save");
 assert(!root.innerHTML.includes("PRIVATE_KEY"));
 console.log("PASS: ProjectDay layout, projects, quadrant tasks, checkbox, daily notes, sessions, ideas, backward compatibility");
} finally {
 Object.assign(globalThis,original);
}
