// Suixu homepage atmosphere — deterministic daily copy + device-local daypart palette.
// No geolocation, browser storage, network calls, or private user data are needed.
const HEADLINES = [
  "今天，先从一件小事开始。",
  "给好奇心留一点位置。",
  "慢慢来，也是在向前走。",
  "让值得做的事，有自己的时间。",
  "在日常里，积累一点新的可能。",
  "不必填满每一个空白。",
  "今天的节奏，由你自己决定。",
  "认真投入，也记得抬头看看。",
  "让思考有深度，让生活有余地。",
  "把注意力留给真正重要的事。",
  "每一天，都可以有新的发现。",
  "用一点耐心，换一点清晰。",
  "一边探索，一边好好生活。",
  "把复杂的问题，交给清醒的自己。",
  "留一段安静，给新的想法。",
  "今天，也值得好好记录。",
  "向前一点点，就已经很好。",
  "在研究之外，也有辽阔的生活。",
  "先做好当下，再期待远方。",
  "允许计划，也允许意外的收获。",
  "有些答案，需要时间慢慢出现。",
  "今天的好奇，可能是明天的方向。",
  "让日子缓缓展开。",
  "做些有意义的事，也做些喜欢的事。",
  "一段专注，一份从容。",
  "给新的尝试一次机会。",
  "把平凡的一天，过得有些光亮。",
  "不赶时间，只认真经过。",
  "从真实的记录里，看见变化。",
  "停下来观察，也是一种前进。",
  "把灵感写下，把压力放轻。",
  "今天的生活，不只是一张待办清单。",
  "保持思考，也保持柔软。",
  "一步一步，找到自己的答案。",
  "为探索留白，为生活留光。",
  "把时间花在值得的地方。",
  "这一日，有你自己的故事。"
];
const PARTS=[
  {start:0,name:"night",label:"深夜"},
  {start:6,name:"morning",label:"清晨"},
  {start:10,name:"midday",label:"上午"},
  {start:13,name:"afternoon",label:"午后"},
  {start:17,name:"evening",label:"傍晚"},
  {start:20,name:"night",label:"夜间"}
];
const two=x=>String(x).padStart(2,"0");
export function localDateKey(date){
  return date.getFullYear()+"-"+two(date.getMonth()+1)+"-"+two(date.getDate());
}
export function dailyHeadline(date){
  // UTC ordinal of the *local calendar day*: stable across devices and DST.
  const ordinal=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
  return HEADLINES[((ordinal*11+3)%HEADLINES.length+HEADLINES.length)%HEADLINES.length];
}
export function dayPeriod(date){
  const hour=date.getHours();
  for(let i=PARTS.length-1;i>=0;i--)if(hour>=PARTS[i].start)return PARTS[i];
  return PARTS[0];
}
const weekLabels=["日","一","二","三","四","五","六"];
let mounted=false;
let lastSignature="";
function paint(){
  const title=document.getElementById("homeTitle");
  const overline=document.getElementById("homeTimeLabel");
  const date=document.getElementById("homeGreetingDate");
  if(!title||!overline||!date)return;
  const now=new Date(),part=dayPeriod(now);
  const key=localDateKey(now),signature=key+"|"+part.name+"|"+part.label;
  if(signature===lastSignature)return;
  lastSignature=signature;
  title.textContent=dailyHeadline(now);
  overline.textContent=part.label+" · SUIXU";
  date.textContent=now.getFullYear()+"年"+(now.getMonth()+1)+"月"+now.getDate()+"日 · 周"+weekLabels[now.getDay()];
  document.body.dataset.daypart=part.name;
  const theme=document.querySelector('meta[name="theme-color"]');
  if(theme)theme.setAttribute("content",{
    morning:"#f3f5e9",midday:"#fbf8e7",afternoon:"#edf4ed",
    evening:"#f4eaf0",night:"#edf0f7"
  }[part.name]);
}
export function mountHomeAtmosphere(){
  paint();
  if(mounted)return;
  mounted=true;
  // Minute-level refresh switches the color at a daypart boundary and the copy at midnight.
  setInterval(paint,60_000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)paint()});
  window.addEventListener("focus",paint);
}
