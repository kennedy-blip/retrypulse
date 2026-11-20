import { bodyOf, deadLetters, json, policies, type Policy } from "./_lib/store";
type Input = { policyId?:string; targetUpstream?:string; failRatePct?:number; payload?:unknown; replayDeadLetterId?:string };
function delayFor(base:number, attempt:number, mode:string) { const cap=Math.min(30000,base*2**(attempt-1)); if(mode==="none") return cap; if(mode==="equal") return Math.round(cap/2+Math.random()*cap/2); return Math.round(Math.random()*cap); }
export default async function handler(req:Request):Promise<Response> {
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 const input=await bodyOf<Input>(req);
 const replay=input.replayDeadLetterId ? deadLetters.find(x=>x.id===input.replayDeadLetterId) : undefined;
 const policy=policies.find(p=>p.id===(input.policyId||replay?.policyId)) || policies.find(p=>p.targetUpstream===input.targetUpstream);
 if(!policy) return json({error:"Policy not found. Create a policy first."},404);
 if(policy.circuitState==="OPEN" && !replay) return json({attempts:[],totalElapsedDelayMs:0,circuitState:"OPEN",dlqStatus:"BLOCKED",error:"Circuit is OPEN. Requests are rejected before reaching the upstream."},409);
 const rate=Math.min(100,Math.max(0,input.failRatePct ?? 50));
 const logs:{attempt:number;delayMs:number;outcome:"FAILED"|"SUCCESS";httpStatus:number;timestamp:string}[]=[];
 let elapsed=0, recovered=false, consecutive=policy.consecutiveFailures;
 for(let attempt=1;attempt<=policy.maxRetries+1;attempt++){
  if(attempt>1){ const wait=delayFor(policy.baseDelayMs,attempt-1,policy.jitterMode); elapsed+=wait; }
  const failed=Math.random()*100<rate;
  logs.push({attempt,delayMs:attempt===1?0:elapsed-logs.slice(0,-1).reduce((s,x)=>s+x.delayMs,0),outcome:failed?"FAILED":"SUCCESS",httpStatus:failed?(Math.random()<.7?503:504):200,timestamp:new Date().toISOString()});
  if(!failed){recovered=true; consecutive=0;break;}
  consecutive++;
  if(consecutive>=policy.failureThreshold) policy.circuitState="OPEN";
 }
 policy.consecutiveFailures=consecutive;
 policy.rollingErrorRate=Math.round((logs.filter(x=>x.outcome==="FAILED").length/logs.length)*1000)/10;
 if(policy.circuitState==="OPEN" && consecutive<policy.failureThreshold) policy.circuitState="HALF_OPEN";
 let dlqStatus:"NONE"|"ENQUEUED"|"REPLAYED"="NONE", deadLetterId:string|undefined;
 if(recovered && replay){ const idx=deadLetters.findIndex(x=>x.id===replay.id); if(idx>=0) deadLetters.splice(idx,1); dlqStatus="REPLAYED"; }
 else if(!recovered){ if(replay){dlqStatus="ENQUEUED";} else { const item={id:crypto.randomUUID(),policyId:policy.id,targetUpstream:policy.targetUpstream,payload:input.payload ?? {sample:"retry-payload",createdAt:new Date().toISOString()},reason:"Retry budget exhausted — upstream unavailable",createdAt:new Date().toISOString(),attempts:logs.length}; deadLetters.unshift(item); deadLetterId=item.id; dlqStatus="ENQUEUED"; } }
 return json({attempts:logs,totalElapsedDelayMs:elapsed,circuitState:policy.circuitState,dlqStatus,deadLetterId,recovered,policy});
}