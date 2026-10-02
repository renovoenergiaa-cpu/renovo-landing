import {createClient} from '@libsql/client/web';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

let client:ReturnType<typeof createClient>|undefined;
let local:DatabaseSync|undefined;
let initialization:Promise<void>|undefined;

// V4: cada item abaixo contém EXATAMENTE uma instrução SQL.
// Não dependemos de split de schema, executeMultiple() nem batch() para criar tabelas.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS equipment (
    id text PRIMARY KEY NOT NULL,
    data text NOT NULL,
    active integer NOT NULL,
    created text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tracking_events (
    id text PRIMARY KEY NOT NULL,
    lead_id text,
    name text NOT NULL,
    created text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id text PRIMARY KEY NOT NULL,
    request_id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    email text,
    status text NOT NULL,
    consent text NOT NULL,
    data text NOT NULL,
    created text NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS leads_request_id_unique ON leads (request_id)`,
  `CREATE TABLE IF NOT EXISTS webhook_outbox (
    id text PRIMARY KEY NOT NULL,
    payload text NOT NULL,
    status text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    updated text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    id text PRIMARY KEY NOT NULL,
    count integer NOT NULL,
    expires integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS calculator_settings (
    id text PRIMARY KEY NOT NULL,
    data text NOT NULL,
    updated text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS simulations (
    id text PRIMARY KEY NOT NULL,
    lead_id text NOT NULL,
    result text NOT NULL,
    created text NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_status ON webhook_outbox (status)`,
  `CREATE INDEX IF NOT EXISTS idx_simulations_lead_id ON simulations (lead_id)`
] as const;

function remote(){return !!process.env.TURSO_DATABASE_URL;}

function localDb(){
  if(process.env.VERCEL)throw Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN na Vercel.');
  if(!local){
    const file=resolve(process.env.LOCAL_DB_PATH||'.data/renovo.sqlite');
    mkdirSync(dirname(file),{recursive:true});
    local=new DatabaseSync(file);
    local.exec('PRAGMA foreign_keys=ON');
    local.exec('PRAGMA journal_mode=WAL');
  }
  return local;
}

function remoteDb(){
  if(!process.env.TURSO_DATABASE_URL)throw Error('TURSO_DATABASE_URL não configurada.');
  if(!process.env.TURSO_AUTH_TOKEN)throw Error('TURSO_AUTH_TOKEN não configurado.');
  if(!client)client=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
  return client;
}

export async function initializeDatabase(){
  if(!initialization)initialization=(async()=>{
    if(remote()){
      for(let i=0;i<SCHEMA_STATEMENTS.length;i++){
        try{
          await remoteDb().execute({sql:SCHEMA_STATEMENTS[i],args:[]});
        }catch(e:any){
          throw new Error(`TURSO_V4_INIT_${i+1}: ${e?.message||String(e)}`);
        }
      }
    }else{
      const db=localDb();
      for(const sql of SCHEMA_STATEMENTS)db.exec(sql);
    }
  })();
  try{await initialization;}catch(e){initialization=undefined;throw e;}
}

class Statement{
  args:any[]=[];
  constructor(public sql:string){}
  bind(...args:any[]){this.args=args;return this;}
  async first(){const r=await this.all();return r.results[0]??null;}
  async all():Promise<{results:any[]}>{
    await initializeDatabase();
    if(remote()){
      const r=await remoteDb().execute({sql:this.sql,args:this.args});
      return {results:r.rows.map(r=>Object.fromEntries(Object.entries(r)))};
    }
    return {results:localDb().prepare(this.sql).all(...this.args)};
  }
  async run(){
    await initializeDatabase();
    if(remote())return remoteDb().execute({sql:this.sql,args:this.args});
    return localDb().prepare(this.sql).run(...this.args);
  }
}

export const database={
  prepare:(sql:string)=>new Statement(sql),
  async batch(items:Statement[]){
    await initializeDatabase();
    if(remote()){
      // V4: executa uma instrução por chamada. Assim nenhuma string com múltiplos
      // comandos SQL é enviada ao Turso, inclusive durante a criação do lead.
      const results=[];
      for(let i=0;i<items.length;i++){
        const item=items[i];
        try{
          results.push(await remoteDb().execute({sql:item.sql,args:item.args}));
        }catch(e:any){
          throw new Error(`TURSO_V4_WRITE_${i+1}: ${e?.message||String(e)}`);
        }
      }
      return results;
    }
    const db=localDb();
    db.exec('BEGIN IMMEDIATE');
    try{
      const results=items.map(i=>db.prepare(i.sql).run(...i.args));
      db.exec('COMMIT');
      return results;
    }catch(e){
      db.exec('ROLLBACK');
      throw e;
    }
  }
};
