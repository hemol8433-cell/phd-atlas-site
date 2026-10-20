import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
async function load(f){return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(await readFile(new URL("../docs/"+f,import.meta.url),"utf8")))}
const [p,l,w]=await Promise.all([load("projectday.js"),load("life.js"),load("weekboard.js")]);
const original={setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,DateNow:Date.now,confirm:globalThis.confirm};
globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};globalThis.confirm=()=>true;
const stamp=original.DateNow();
let tick=stamp;
Date.now=()=>tick;
const db={version:1,year:2,entries:[],daybook:[],activityEvents:[]};
const saves=[];
const api={data:()=>db,save:()=>{saves.push(JSON.stringify(db))},toast:()=>{}};
const root={innerHTML:"",contains:()=>true,querySelector:()=>null};
const click=(type,key)=>root.onclick({target:{closest:()=>({dataset:{[key]:type}})}});
try {
 p.renderProjectDay(root,api);
 db.projectday.projects.push({id:"research-one",title:"模拟实验",status:"进行中"});
 db.projectday.timer.projectId="research-one";
 p.renderProjectDay(root,api);
 click("timer-toggle","pdAct");
 assert(Number.isFinite(db.projectday.timer.startedAt),"Research timer starts");
 let current=new Date(tick+60_000);
 let events=w.weekEvents(db,w.weekEvents?weekStart():weekStart(),current);
 assert(events.some(e=>e.source==="active"&&e.category==="科研"),"Starting research focus is visible in weekly view");
 tick+=3_000_000;
 click("timer-save","pdAct");
 assert.equal(db.projectday.sessions.length,1);
 assert.equal(db.projectday.sessions[0].segments.length,1);
 events=w.weekEvents(db,weekStart(),new Date(tick));
 assert(events.some(e=>e.source==="focus"&&e.category==="科研"),"Saved research focus becomes actual calendar block");
 const lifeRoot={innerHTML:"",contains:()=>true,querySelector:()=>null};
 l.renderLife(lifeRoot,api);
 lifeRoot.onchange({target:{dataset:{lfCheck:"habit",id:"starter-1"},checked:true}});
 events=w.weekEvents(db,weekStart(),new Date(tick));
 assert(events.some(e=>e.title.includes("运动与散步")&&e.instant),"Life habit auto synchronizes without made-up duration");
 lifeRoot.onclick({target:{closest:selector=>selector==="[data-lf-focus]"?{dataset:{lfFocus:"toggle"}}:null}});
 assert(Number.isFinite(db.life.timer.startedAt),"Life focus starts");
 tick+=2_000_000;
 lifeRoot.onclick({target:{closest:selector=>selector==="[data-lf-focus]"?{dataset:{lfFocus:"save"}}:null}});
 assert.equal(db.life.sessions.length,1);
 events=w.weekEvents(db,weekStart(),new Date(tick));
 assert(events.some(e=>e.source==="focus"&&e.category==="生活"),"Saved life focus synchronizes to calendar");
 assert(saves.length>=4,"Source module actions persist via owner workspace");
 console.log("PASS: auto-sync research focus start/save and life habits/focus to weekly calendar");
} finally {
 Date.now=original.DateNow;globalThis.setInterval=original.setInterval;globalThis.clearInterval=original.clearInterval;globalThis.confirm=original.confirm;
}
function weekStart(){
 const d=new Date();d.setDate(d.getDate()-(d.getDay()+6)%7);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
