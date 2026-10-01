import * as simulate from './routes/simulate.js';
import * as proposal from './routes/proposal.js';
import * as whatsapp from './routes/whatsapp.js';
import * as cep from './routes/cep.js';
import * as admin from './routes/admin.js';
import * as status from './routes/status.js';
import * as auth from './routes/auth.js';
import * as config from './routes/config.js';
import {requestContext} from './lib/auth.js';
const routes:Record<string,any>={simulate,proposal,whatsapp,cep,admin,status,auth,config};
export async function handleRequest(req:Request):Promise<Response>{return requestContext.run(req,async()=>{const name=new URL(req.url).pathname.replace(/^\/api\//,'').replace(/\/$/,'');const route=routes[name];if(!route)return Response.json({error:'Rota não encontrada.'},{status:404});const handler=route[req.method];if(!handler)return Response.json({error:'Método não permitido.'},{status:405});try{const response:Response=await handler(req);response.headers.set('Cache-Control','no-store');response.headers.set('X-Content-Type-Options','nosniff');return response;}catch(e){console.error('API failure',e);return Response.json({error:'Serviço indisponível. Tente novamente.'},{status:503});}});}
