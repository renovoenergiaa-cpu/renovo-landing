import {createClient} from '@libsql/client/web';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {schema} from '../db/schema.js';
let client:ReturnType<typeof createClient>|undefined;
let local:DatabaseSync|undefined;
let initialization:Promise<void>|undefined;
const statements=schema.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
function remote(){return !!process.env.TURSO_DATABASE_URL;}
function localDb(){if(process.env.VERCEL)throw Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN na Vercel.');if(!local){const file=resolve(process.env.LOCAL_DB_PATH||'.data/renovo.sqlite');mkdirSync(dirname(file),{recursive:true});local=new DatabaseSync(file);local.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');}return local;}
function remoteDb(){if(!client)client=createClient({url:process.env.TURSO_DATABASE_URL!,authToken:process.env.TURSO_AUTH_TOKEN});return client;}
export async function initializeDatabase(){if(!initialization)initialization=(async()=>{if(remote())await remoteDb().batch(statements,'write');else for(const sql of statements)localDb().exec(sql);})();try{await initialization;}catch(e){initialization=undefined;throw e;}}
class Statement{args:any[]=[];constructor(public sql:string){}bind(...args:any[]){this.args=args;return this;}async first(){const r=await this.all();return r.results[0]??null;}async all():Promise<{results:any[]}>{await initializeDatabase();if(remote()){const r=await remoteDb().execute({sql:this.sql,args:this.args});return {results:r.rows.map(r=>Object.fromEntries(Object.entries(r)))};}return {results:localDb().prepare(this.sql).all(...this.args)};}async run(){await initializeDatabase();if(remote())return remoteDb().execute({sql:this.sql,args:this.args});return localDb().prepare(this.sql).run(...this.args);}}
export const database={prepare:(sql:string)=>new Statement(sql),async batch(items:Statement[]){await initializeDatabase();if(remote())return remoteDb().batch(items.map(i=>({sql:i.sql,args:i.args})),'write');const db=localDb();db.exec('BEGIN IMMEDIATE');try{const results=items.map(i=>db.prepare(i.sql).run(...i.args));db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
