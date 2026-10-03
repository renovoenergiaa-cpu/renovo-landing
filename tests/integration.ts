import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'node:http';
import {once} from 'node:events';
mkdirSync('.data',{recursive:true});const dir=mkdtempSync('.data/test-');process.env.LOCAL_DB_PATH=resolve(dir,'test.sqlite');delete process.env.TURSO_DATABASE_URL;delete process.env.VERCEL;process.env.ADMIN_PASSWORD='teste-seguro-12345';process.env.SESSION_SECRET='a'.repeat(64);process.env.AUTOMATION_API_TOKEN='automation-test-token';process.env.RENOVO_WHATSAPP='5515991699585';
const {handleRequest}=await import('../server/router.js');const {apiHandler}=await import('../server/http-adapter.js');const {database}=await import('../server/lib/database.js');const {generationTable,calculate,defaults,monthlyGeneration}=await import('../server/lib/calculator.js');
for(const [panels,gen] of Object.entries(generationTable)){assert.equal(monthlyGeneration(+panels),gen);const r=calculate(gen*defaults.tariff,defaults);assert.equal(r.modules,+panels);assert.equal(r.cost,10990+(+panels-6)*1000);}
assert.equal(calculate(50,defaults).modules,6);assert.equal(calculate(473.5*defaults.tariff,defaults).cost,11990);
const base='http://localhost:3001';const input={request_id:crypto.randomUUID(),nome:'João Teste',whatsapp:'15999998888',email:'joao@example.com',consentimento:true,valor_conta:406*.95,tipo_imovel:'Residência',imovel_proprio:'Sim',tipo_telhado:'Cerâmico',cep:'18000000',cidade:'Sorocaba',estado:'SP',tracking:{utm_source:'meta',utm_campaign:'teste'}};
const request=(path:string,body?:any,cookie='')=>handleRequest(new Request(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',origin:base,...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)}));
assert.equal((await request('/api/simulate',{...input,consentimento:false})).status,400);
const response=await request('/api/simulate',input);assert.equal(response.status,200);const lead:any=await response.json();assert.equal(lead.result.modules,6);assert.equal(lead.result.cost,10990);assert.match(lead.lead_id,/^SOL-[A-F0-9]{10}$/);
const repeat:any=await(await request('/api/simulate',input)).json();assert.equal(repeat.lead_id,lead.lead_id);assert.equal((await database.prepare('SELECT * FROM leads').all()).results.length,1);
assert.equal((await request('/api/admin')).status,403);assert.equal((await request('/api/auth',{password:'senha-incorreta'})).status,401);
const login=await request('/api/auth',{password:process.env.ADMIN_PASSWORD});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];assert(login.headers.get('set-cookie')!.includes('HttpOnly'));
const list:any=await(await request('/api/admin',undefined,cookie)).json();assert.equal(list.leads.length,1);assert.equal(JSON.parse(list.leads[0].data).utm_source,'meta');

// Marketing defaults to false and cannot be forged by arbitrary attribution fields.
assert.equal(list.leads[0].marketing_consent,false);
assert.equal((await request('/api/export')).status,403);
assert.equal((await request('/api/export',undefined,'renovo_admin=forged')).status,403);
const emptyCsv=await request('/api/export',undefined,cookie);
assert.equal(emptyCsv.status,200);assert.equal(emptyCsv.headers.get('cache-control'),'no-store');
assert(!(await emptyCsv.text()).includes('joao@example.com'));
assert.equal((await request('/api/simulate',{...input,request_id:crypto.randomUUID(),consentimento_marketing:'true'})).status,400);
const marketingInput={...input,request_id:crypto.randomUUID(),nome:'=Contato Teste',consentimento_marketing:true,tracking:{utm_source:'google',utm_campaign:'Campanha "Solar",\nNova',fbclid:'fb-test',gclid:'g-test',gbraid:'gb-test',wbraid:'wb-test',ttclid:'tt-test',utm_medium:'cpc',utm_content:'banner',utm_term:'solar',utm_id:'campaign-id',consentimento_marketing:'false',nome:'Sobrescrito'}};
const marketingResponse=await request('/api/simulate',marketingInput);assert.equal(marketingResponse.status,200);
const marketingLead:any=await marketingResponse.json();
const saved=await database.prepare('SELECT * FROM leads WHERE id=?').bind(marketingLead.lead_id).first();
const savedData=JSON.parse(saved.data),savedConsent=JSON.parse(saved.consent);
assert.equal(savedData.nome,'=Contato Teste');assert.equal(savedData.consentimento_marketing,true);
assert.equal(savedConsent.marketing.accepted,true);assert.equal(savedConsent.marketing.policy,'2');assert(savedConsent.marketing.at);
for(const key of ['fbclid','gclid','gbraid','wbraid','ttclid','utm_id'])assert.equal(savedData[key],marketingInput.tracking[key as keyof typeof marketingInput.tracking]);
await request('/api/simulate',{...marketingInput,consentimento_marketing:false});
assert.equal(JSON.parse((await database.prepare('SELECT consent FROM leads WHERE id=?').bind(marketingLead.lead_id).first()).consent).marketing.accepted,true);
const csvResponse=await request('/api/export',undefined,cookie);const csv=await csvResponse.text();
assert.equal(csvResponse.headers.get('content-type'),'text/csv; charset=utf-8');assert(csvResponse.headers.get('content-disposition')!.includes('attachment'));
assert(csv.includes(marketingLead.lead_id));assert(!csv.includes(lead.lead_id));assert(csv.includes("\"'=Contato Teste\""));assert(csv.includes('Campanha ""Solar"",\nNova'));assert(csv.includes('tt-test'));
assert.equal((await request('/api/export',{},cookie)).status,405);
// Legacy consent is never interpreted as marketing authorization.
await database.prepare('UPDATE leads SET consent=? WHERE id=?').bind(JSON.stringify({accepted:true,policy:'1'}),marketingLead.lead_id).run();
assert(!(await(await request('/api/export',undefined,cookie)).text()).includes(marketingLead.lead_id));
assert.equal((await request('/api/admin',{action:'delete',id:marketingLead.lead_id},cookie)).status,200);

assert.equal((await request('/api/admin',{action:'settings',data:{...list.settings,tariff:1.0}},cookie)).status,200);
const form=new URLSearchParams({lead_id:lead.lead_id,request_id:input.request_id});const pdf=await handleRequest(new Request(base+'/api/proposal',{method:'POST',headers:{origin:base},body:form}));assert.equal(pdf.status,200);assert(pdf.headers.get('content-disposition')!.includes('attachment'));assert.equal(pdf.headers.get('content-type'),'application/pdf');assert(Buffer.from(await pdf.arrayBuffer()).toString('latin1').startsWith('%PDF-1.4'));
assert.equal((await request('/api/proposal',{lead_id:lead.lead_id,request_id:crypto.randomUUID()})).status,404);
const wa:any=await(await request('/api/whatsapp',{lead_id:lead.lead_id,request_id:input.request_id})).json();assert(wa.url.startsWith('https://wa.me/5515991699585'));const message=new URL(wa.url).searchParams.get('text')!;for(const text of ['João Teste','6 placas','10.990','site da Renovo','Geração anual','25 anos','Estrutura em alumínio'])assert(message.includes(text));assert(!message.includes('Ligação elétrica'));
assert.equal((await request('/api/status',{lead_id:lead.lead_id,status:'qualificado'})).status,401);const statusReq=()=>handleRequest(new Request(base+'/api/status',{method:'POST',headers:{'Content-Type':'application/json',authorization:'Bearer automation-test-token'},body:JSON.stringify({lead_id:lead.lead_id,status:'qualificado'})}));assert.equal((await statusReq()).status,200);assert.equal((await statusReq()).status,200);assert.equal((await database.prepare('SELECT * FROM tracking_events WHERE name=?').bind('QualifiedLead').all()).results.length,1);
assert.equal((await request('/api/admin',{action:'settings',data:list.settings},'renovo_admin=forged')).status,400);
const hostile=await handleRequest(new Request(base+'/api/whatsapp',{method:'POST',headers:{origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({lead_id:lead.lead_id,request_id:input.request_id})}));assert.equal(hostile.status,400);
const server=createServer(apiHandler);server.listen(0,'127.0.0.1');await once(server,'listening');const port=(server.address() as any).port;const native=await fetch('http://127.0.0.1:'+port+'/api/proposal',{method:'POST',body:form});assert.equal(native.status,200);assert.equal(native.headers.get('content-type'),'application/pdf');assert((await native.arrayBuffer()).byteLength>1000);await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
assert.equal((await request('/api/admin',{action:'delete',id:lead.lead_id},cookie)).status,200);assert.equal((await database.prepare('SELECT * FROM leads').all()).results.length,0);
const home=readFileSync('src/Home.tsx','utf8');assert(!home.includes('Monofásico'));assert(!home.includes('className="result-grid"'));assert(home.includes('action="/api/proposal"'));console.log('PASS: geração/preços, captura, consentimento, UTMs, idempotência, admin/sessão, PDF nativo, WhatsApp, status, CSRF e exclusão.');
