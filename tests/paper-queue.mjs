import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const source=await readFile(new URL("../docs/paper-queue.js",import.meta.url),"utf8");
const module=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
const p=(id,title)=>({id,title,abstract:"English source abstract",published:"2026-10-19",url:"https://arxiv.org/abs/"+id,pdf:"https://arxiv.org/pdf/"+id});
const grounded={
 problem:"重构稀疏观测中的流动状态存在严重欠定性，需要物理约束。",
 method:"联合 Fourier 特征与 Navier–Stokes 方程约束提升恢复能力。",
 results:"摘要报告在 Re=100 算例上达到较高的相似度；未提供误差数值。",
 inspiration:"可对比固定传感器位置变化下的 PerTime 统计代表性。",
 caveat:"必须阅读原文误差表进一步确认。",
 relevance:"直接相关",
 basis:"abstract_assisted"
};
assert.equal(module.paperResearchLens({analysis:grounded}).ready,true);
assert.equal(module.paperResearchLens({analysis:null}).ready,false);
assert.equal(module.paperResearchLens({analysis:{...grounded,basis:"unverified"}}).ready,false);
const feed={
 generated_at:"2026-10-19T09:30:29Z",
 today_ids:["a","b"],
 papers:[{...p("a","Fluid physics-informed neural networks"),analysis:grounded},p("b","Neural operators for flow"),p("c","Older archive")]
};
const queue=module.normalizePaperQueue(null);
assert.equal(module.updatePaperQueue(queue,feed,"2026-10-20"),2);
assert.equal(module.overdueDays("2026-10-19","2026-10-20"),1);
assert.equal(module.overdueDays("2026-10-18","2026-10-20"),2);
assert.equal(module.overdueDays("","2026-10-20"),null);
assert.equal(queue.records.a.status,"未读");
assert.equal(queue.records.a.firstRecommended,"2026-10-19");
queue.records.a.status="已读";queue.records.a.readAt="2026-10-20T12:00:00Z";queue.records.a.notes="Useful for sparse flow";
const next={
 generated_at:"2026-10-20T02:00:00Z",
 today_ids:["b","d"],
 papers:[p("a","Fluid physics-informed neural networks"),p("b","Neural operators for flow"),p("c","Older archive"),p("d","New AI fluid paper")]
};
assert.equal(module.updatePaperQueue(queue,next,"2026-10-20"),1);
assert.equal(queue.records.a.status,"已读","Previous marked read item must remain read");
assert.equal(queue.records.a.notes,"Useful for sparse flow");
assert.equal(queue.records.b.firstRecommended,"2026-10-19","Re-recommendation must not reset age");
assert.equal(queue.records.d.firstRecommended,"2026-10-20");
assert.equal(queue.records.c,undefined,"Historical archive paper has no invented recommendation date");
const db={version:1,entries:[{id:"existing"}],paperQueue:module.normalizePaperQueue(null)};
const saves=[];
const api={data:()=>db,feed:()=>feed,save:()=>saves.push(JSON.stringify(db)),toast:()=>{}};
const root={innerHTML:"",contains:()=>true};
module.renderPaperQueue(root,api);
assert.match(root.innerHTML,/积压 \d+ 天/);
assert.match(root.innerHTML,/最近一期/);
assert.match(root.innerHTML,/解决什么问题/);
assert.match(root.innerHTML,/采用什么方法/);
assert.match(root.innerHTML,/取得什么效果/);
assert.match(root.innerHTML,/对我的研究有什么启发/);
assert.match(root.innerHTML,/Re=100/);
assert.match(root.innerHTML,/研究解读待补充/,"Unverified papers should not receive invented analysis");
assert.match(root.innerHTML,/摘要解读/,"Research claims must identify the evidence level");

assert.equal(Object.keys(db.paperQueue.records).length,2);
const click=(action,id)=>root.onclick({target:{closest:()=>({dataset:{pqAct:action,id}})}});
click("read","a");
assert.equal(db.paperQueue.records.a.status,"已读");
click("start","b");
assert.equal(db.paperQueue.records.b.status,"在读");
click("unread","a");
assert.equal(db.paperQueue.records.a.status,"未读");
assert.equal(db.entries[0].id,"existing");
assert(saves.length>=4);
console.log("PASS: real recommendation date aging, retained backlog, read/in-progress/unread, archive isolation, private state saving");
