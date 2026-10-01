import {config,fail} from '../lib/server.js';
export async function GET(){try{return Response.json({privacy:(await config()).privacy});}catch(e){return fail(e,503);}}
