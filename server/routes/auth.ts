import {verifySession,verifyPassword,createSession,cookie} from '../lib/auth.js';
import {sameOrigin,fail,limit} from '../lib/server.js';
export async function GET(req:Request){return Response.json({authenticated:verifySession(req)});}
export async function POST(req:Request){try{sameOrigin(req);await limit(req);const data:any=await req.json();if(data.action==='logout')return Response.json({ok:true},{headers:{'Set-Cookie':cookie('',req,true)}});if(!verifyPassword(data.password))return fail(Error('Senha incorreta.'),401);return Response.json({ok:true},{headers:{'Set-Cookie':cookie(createSession(),req)}});}catch(e){return fail(e);}}
