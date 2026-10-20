import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const base="../docs/";
async function load(file){const data=await readFile(new URL(base+file,import.meta.url),"utf8");return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(data));}
const [week,project,life]=await Promise.all([load("weekboard.js"),load("projectday.js"),load("life.js")]);
const x=(year,month,day,hour,minute)=>new Date(year,month-1,day,hour,minute).getTime();
const db={
 version:1,year:2,
 entries:[{id:"journal1",kind:"实验",text:"实验结果分析",created:new Date(x(2026,10,20,14,15)).toISOString()}],
 daybook:[{id:"plan1",date:"2026-10-20",start:"09:00",end:"10:30",title:"阅读论文",category:"科研",status:"计划",note:""}],
 projectday:{
   projects:[{id:"project1",title:"PINN 对照实验"}],
   sessions:[{id:"session1",projectId:"project1",date:"2026-10-20",seconds:5400,segments:[{start:x(2026,10,20,10,0),end:x(2026,10,20,11,30)}]}],
   timer:{projectId:"project1",startedAt:x(2026,10,20,12,0),elapsedMs:0,segments:[]}
 },
 life:{
  sessions:[{id:"life1",label:"散步",date:"2026-10-20",seconds:1800,segments:[{start:x(2026,10,20,18,0),end:x(2026,10,20,18,30)}]}],
  timer:{label:"阅读",startedAt:null,elapsedMs:0,segments:[]}
 },
 activityEvents:[{id:"hab1",at:new Date(x(2026,10,20,7,15)).toISOString(),category:"生活",source:"life",title:"完成生活习惯：早起"}]
};
const list=week.weekEvents(db,"2026-10-19",new Date(x(2026,10,20,12,10)));
assert(list.some(e=>e.title==="阅读论文"&&e.status==="计划"),"Existing manual schedule retained");
assert(list.some(e=>e.title==="PINN 对照实验"&&e.start==="10:00"&&e.end==="11:30"),"Actual research focus synced");
assert(list.some(e=>e.title==="PINN 对照实验"&&e.status==="进行中"&&e.end==="12:10"),"Active focus visible");
assert(list.some(e=>e.title==="散步"&&e.start==="18:00"&&e.category==="生活"),"Life focus synced");
assert(list.some(e=>e.title.includes("早起")&&e.instant&&e.end===""),"Habit has instant timestamp, not fake duration");
assert(list.some(e=>e.title==="实验日志"&&e.instant),"Journal displays real recording moment");
assert(!list.some(e=>e.date==="2026-10-26"),"Week has exactly 7 dates");
assert.equal(week.validateWeeklyEntry({date:"2026-10-20",start:"08:00",end:"09:00",title:"早晨安排",category:"生活",status:"计划",note:""}),null);
assert.match(week.validateWeeklyEntry({date:"2026-10-20",start:"11:00",end:"09:00",title:"无效",category:"生活",status:"计划"}),/结束/);

const old={FormData:globalThis.FormData,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,confirm:globalThis.confirm};
const messages=[];
globalThis.FormData=class{constructor(f){this.values=f.values}get(n){return this.values[n]??null}};
globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};globalThis.confirm=()=>true;
const context={data:()=>db,save:()=>messages.push("save"),toast:t=>messages.push(t)};
const root={innerHTML:"",contains:()=>true,querySelector:()=>null};
try{
 week.renderWeekboard(root,context);
 assert.match(root.innerHTML,/周一/);
 assert.match(root.innerHTML,/周日/);
 assert.match(root.innerHTML,/生活/);
 const form={id:"wk-form",values:{date:"2026-10-21",start:"15:00",end:"16:30",category:"科研",title:"归档训练结果",status:"已记录",note:"对比 L2"}};
 root.onsubmit({target:form,preventDefault(){}});
 assert.equal(db.daybook.length,2);
 assert(db.daybook.some(x=>x.title==="归档训练结果"));
 const savedId=db.daybook.find(x=>x.title==="归档训练结果").id;
 root.onclick({target:{closest:()=>({dataset:{wkEdit:savedId}})}});
 assert.match(root.innerHTML,/保存修改/);
 form.values.end="17:00";
 root.onsubmit({target:form,preventDefault(){}});
 assert.equal(db.daybook.find(x=>x.id===savedId).end,"17:00");
 root.onclick({target:{closest:()=>({dataset:{wkDelete:savedId}})}});
 assert.equal(db.daybook.length,1);
 assert(db.projectday.sessions.length===1,"Existing research sessions unaffected");
 assert(db.life.sessions.length===1,"Existing life sessions unaffected");
 assert(messages.filter(x=>x==="save").length>=3,"New schedule events sync to owner cloud document");
 console.log("PASS: weekly display, schedule CRUD and real-time research/life synchronization");
}finally{
 Object.assign(globalThis,old);
}
