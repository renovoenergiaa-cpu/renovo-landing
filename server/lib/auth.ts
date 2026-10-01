import {AsyncLocalStorage} from 'node:async_hooks';
import {createHmac,createHash,timingSafeEqual,randomUUID} from 'node:crypto';
export const requestContext=new AsyncLocalStorage<Request>();
function secret(){const value=process.env.SESSION_SECRET;if(!value||value.length<32)throw Error('Configure SESSION_SECRET com pelo menos 32 caracteres.');return value;}
function signature(value:string){return createHmac('sha256',secret()).update(value).digest('base64url');}
export function verifySession(req:Request){const token=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('renovo_admin='))?.slice(13);if(!token)return false;try{const [payload,sig]=token.split('.');const wanted=signature(payload);if(!sig||sig.length!==wanted.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(wanted)))return false;const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.exp>Date.now()&&data.role==='admin';}catch{return false;}}
export function createSession(){const payload=Buffer.from(JSON.stringify({role:'admin',exp:Date.now()+12*3600000,nonce:randomUUID()})).toString('base64url');return payload+'.'+signature(payload);}
export function verifyPassword(password:unknown){const expected=process.env.ADMIN_PASSWORD;if(!expected||expected.length<12)throw Error('Configure ADMIN_PASSWORD com pelo menos 12 caracteres.');if(typeof password!=='string'||password.length>500)return false;return timingSafeEqual(createHash('sha256').update(password).digest(),createHash('sha256').update(expected).digest());}
export function cookie(token:string,req:Request,clear=false){const secure=new URL(req.url).protocol==='https:'||!!process.env.VERCEL;return `renovo_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:43200}${secure?'; Secure':''}`;}
