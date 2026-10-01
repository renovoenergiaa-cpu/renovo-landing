import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {apiHandler} from './http-adapter.js';
const root=resolve('dist');const mime:Record<string,string>={'.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'};
const server=createServer(async(req,res)=>{if(req.url?.startsWith('/api/'))return apiHandler(req,res);const pathname=new URL(req.url||'/','http://localhost').pathname;const filename=resolve(root,'.'+decodeURIComponent(pathname));if(!filename.startsWith(root+'/')&&filename!==root){res.statusCode=403;res.end();return;}try{const data=await readFile(filename);res.setHeader('Content-Type',mime[extname(filename)]||'application/octet-stream');res.end(data);}catch{try{res.setHeader('Content-Type','text/html');res.end(await readFile(resolve(root,'index.html')));}catch{res.statusCode=404;res.end('Execute npm run build ou abra o Vite com npm run dev.');}}});
const port=Number(process.env.PORT||3001);server.listen(port,'127.0.0.1',()=>console.log(`API e produção local: http://localhost:${port}`));
