export const POLICY_VERSION = '2';
export const CONTACT_TEXT = 'Autorizo o contato da equipe para informações sobre minha simulação.';
export const MARKETING_TEXT = 'Quero receber novidades e ofertas da Renovo por e-mail e WhatsApp e autorizo o uso dos meus dados para públicos de remarketing em plataformas de anúncios. Posso revogar a qualquer momento.';
export const ATTRIBUTION_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','fbclid','gclid','gbraid','wbraid','ttclid'] as const;
export function marketingAccepted(consent:unknown):boolean {
  try { const value = typeof consent === 'string' ? JSON.parse(consent) : consent;
    return (value as any)?.marketing?.accepted === true;
  } catch { return false; }
}
