import {admin,db,fail} from '../lib/server.js';
import {ATTRIBUTION_KEYS,marketingAccepted} from '../../shared/remarketing.js';
// Quote every cell and neutralize spreadsheet formulas, including leading whitespace.
export function csvCell(value:unknown){
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"','""') + '"';
}
export async function GET(){
  try { await admin(); } catch(e) { return fail(e,403); }
  try {
    const {results} = await db().prepare('SELECT id,name,phone,email,status,consent,data,created FROM leads ORDER BY created DESC').all();
    const headers = ['lead_id','nome','whatsapp','email','cidade','estado','valor_conta','status','data_criacao','marketing_consentimento','marketing_data','politica_versao',...ATTRIBUTION_KEYS];
    const rows = results.filter((lead:any)=>marketingAccepted(lead.consent)).map((lead:any)=>{
      const data=JSON.parse(lead.data), consent=JSON.parse(lead.consent);
      return [lead.id,lead.name,lead.phone,lead.email,data.cidade,data.estado,data.valor_conta,lead.status,lead.created,true,consent.marketing.at,consent.marketing.policy,...ATTRIBUTION_KEYS.map(key=>data[key])];
    });
    return new Response('\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n', {headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="renovo-marketing.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  } catch(e) { console.error('CSV export failed',e); return Response.json({error:'Não foi possível exportar os contatos.'},{status:500}); }
}
