import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("../docs/home-atmosphere.js",import.meta.url),"utf8");
const atmosphere=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));

const day=(offset,hour=12,minute=0)=>{
 const d=new Date(2026,9,20,hour,minute);
 d.setDate(d.getDate()+offset);
 return d;
};
const messages=Array.from({length:37},(_,i)=>atmosphere.dailyHeadline(day(i)));
assert.equal(new Set(messages).size,37,"37 consecutive days should all have distinct headlines");
for(let offset=0;offset<100;offset++){
 const a=atmosphere.dailyHeadline(day(offset,7));
 const b=atmosphere.dailyHeadline(day(offset,23));
 assert.equal(a,b,"Headline must remain stable throughout a calendar day");
 if(offset>0)assert.notEqual(a,atmosphere.dailyHeadline(day(offset-1,12)),"Adjacent days must differ");
}
assert.equal(atmosphere.localDateKey(day(0)),"2026-10-20");
for(const [hour,label,name] of [
 [0,"深夜","night"],[5,"深夜","night"],[6,"清晨","morning"],
 [9,"清晨","morning"],[10,"上午","midday"],[12,"上午","midday"],
 [13,"午后","afternoon"],[16,"午后","afternoon"],[17,"傍晚","evening"],
 [19,"傍晚","evening"],[20,"夜间","night"],[23,"夜间","night"]
]){
 const actual=atmosphere.dayPeriod(day(0,hour));
 assert.equal(actual.label,label);
 assert.equal(actual.name,name);
}
// Browser mocked: verifies actual mounted headline and daypart, and a single timer.
const old={document:globalThis.document,window:globalThis.window,setInterval:globalThis.setInterval};
let timers=0;
const title={textContent:""},label={textContent:""},date={textContent:""};
const theme={setAttribute:(key,val)=>{assert.equal(key,"content");assert(/^#[a-f0-9]{6}$/i.test(val));}};
const body={dataset:{}};
globalThis.document={
 body,
 getElementById:id=>({homeTitle:title,homeTimeLabel:label,homeGreetingDate:date})[id],
 querySelector:selector=>selector==='meta[name="theme-color"]'?theme:null,
 addEventListener:()=>{}
};
globalThis.window={addEventListener:()=>{}};
globalThis.setInterval=(fn,ms)=>{assert.equal(ms,60000);timers++;return 1;};
try{
 atmosphere.mountHomeAtmosphere();
 atmosphere.mountHomeAtmosphere();
 assert.equal(timers,1,"Homepage updates should only install one interval");
 assert(title.textContent.length>5);
 assert(label.textContent.includes("SUIXU"));
 assert(/年.*月.*日/.test(date.textContent));
 assert(["morning","midday","afternoon","evening","night"].includes(body.dataset.daypart));
}finally{
 Object.assign(globalThis,old);
}
console.log("PASS: unique daily headlines, local daypart palette, DOM painting, idempotent minute updates");
