import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient(){
  if(!URL || !SERVICE) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(URL, SERVICE, { auth:{ persistSession:false, autoRefreshToken:false } });
}
async function requireAdmin(req, supabase){
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i,'');
  if(!token) throw new Error('Unauthorized');
  const { data:{ user }, error } = await supabase.auth.getUser(token);
  if(error || !user) throw new Error('Unauthorized');
  const { data:profile } = await supabase.from('officer_profiles').select('role,status').eq('id',user.id).maybeSingle();
  if(!profile || profile.role !== 'administrator' || profile.status === 'inactive') throw new Error('Forbidden');
  return user;
}
export default async function handler(req,res){
  try{
    const supabase = adminClient();
    await requireAdmin(req,supabase);
    if(req.method === 'GET'){
      const { data, error } = await supabase.auth.admin.listUsers({ page:1, perPage:1000 });
      if(error) throw error;
      const { data:staff } = await supabase.from('officer_profiles').select('*');
      const profileById = Object.fromEntries((staff||[]).map(x=>[x.id,x]));
      return res.status(200).json({ users:(data.users||[]).map(u=>({
        id:u.id,email:u.email,createdAt:u.created_at,lastSignInAt:u.last_sign_in_at,
        role:profileById[u.id]?.role || u.user_metadata?.role || 'student',
        name:profileById[u.id]?.full_name || u.user_metadata?.full_name || '',
        universityId:profileById[u.id]?.university_id || '',
        status:profileById[u.id]?.status || 'active'
      })) });
    }
    if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
    const { action } = req.body || {};
    if(action === 'create'){
      const { email, name, role, universityId, temporaryPassword } = req.body;
      if(!email || !temporaryPassword || !['administrator','university_officer','student'].includes(role)) throw new Error('Invalid account details');
      const { data, error } = await supabase.auth.admin.createUser({
        email, password:temporaryPassword, email_confirm:true,
        user_metadata:{ full_name:name || '', role }
      });
      if(error) throw error;
      if(role !== 'student'){
        const { error:pe } = await supabase.from('officer_profiles').upsert({ id:data.user.id, full_name:name||'', email, role, university_id:universityId||null, status:'active' });
        if(pe) throw pe;
      }
      return res.status(200).json({ok:true,userId:data.user.id});
    }
    if(action === 'status'){
      const { userId, status } = req.body;
      const { error } = await supabase.auth.admin.updateUserById(userId,{ ban_duration: status === 'inactive' ? '876000h' : 'none' });
      if(error) throw error;
      await supabase.from('officer_profiles').update({status}).eq('id',userId);
      return res.status(200).json({ok:true});
    }
    return res.status(400).json({error:'Unsupported action'});
  }catch(error){
    const msg = error?.message || 'Request failed';
    return res.status(msg==='Unauthorized'?401:msg==='Forbidden'?403:400).json({error:msg});
  }
}
