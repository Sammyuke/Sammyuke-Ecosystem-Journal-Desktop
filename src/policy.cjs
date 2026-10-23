const {SITE_URL,SUPABASE_ORIGIN,AUTH_CALLBACK}=require('./config.cjs');
const ownOrigin=new URL(SITE_URL).origin;
function parsed(value){try{return new URL(value)}catch{return null}}
function own(value){const u=parsed(value);return !!u&&u.origin===ownOrigin&&!u.username&&!u.password}
function inside(value){const u=parsed(value);return !!u&&u.protocol==='https:'&&!u.username&&!u.password&&[ownOrigin,SUPABASE_ORIGIN,'https://js.paystack.co','https://checkout.paystack.com'].includes(u.origin)}
function external(value){const u=parsed(value);return !!u&&['https:','http:','mailto:'].includes(u.protocol)&&!u.username&&!u.password}
function oauth(value){const u=parsed(value);return !!u&&u.origin===SUPABASE_ORIGIN&&u.pathname==='/auth/v1/authorize'&&u.searchParams.get('provider')==='google'&&u.searchParams.get('redirect_to')===AUTH_CALLBACK&&u.searchParams.get('code_challenge_method')?.toLowerCase()==='s256'&&/^[\w-]{40,128}$/.test(u.searchParams.get('code_challenge')||'')}
function callback(value){const u=parsed(value);if(!u||u.protocol!=='ecosystemjournal:'||u.hostname!=='auth'||u.pathname!=='/callback'||u.username||u.password||u.port||u.hash)return null;const code=u.searchParams.get('code');if(code&&/^[a-zA-Z0-9._~-]{8,4096}$/.test(code))return {code};if(u.searchParams.has('error'))return {error:'Google sign-in was cancelled or unsuccessful.'};return null}
function microphone(permission,origin,types){return permission==='media'&&own(origin)&&Array.isArray(types)&&types.length>0&&types.every(t=>t==='audio')}
module.exports={own,inside,external,oauth,callback,microphone};
