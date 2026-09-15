document.addEventListener("DOMContentLoaded", async function(){
  "use strict";
  const supabase = window.tneSupabase;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  let users = [], universities = [], applications = [];
  let directoryLoadWarnings = [];
  let editingUniversityId = null;
  function toast(m){ const e=$("adminToast"); if(!e) return; e.textContent=m; e.classList.add("show"); clearTimeout(window.__at); window.__at=setTimeout(()=>e.classList.remove("show"),3000); }
  function openModal(id){ if($(id)) $(id).hidden=false; }
  function closeModal(btn){ const m=btn.closest('.modal'); if(m) m.hidden=true; }
  function setUniversityFormMode(university=null){
    editingUniversityId=university?.id || null;
    $("universityForm")?.reset();
    if($("uniModalKicker")) $("uniModalKicker").textContent=university ? 'PARTNER SETTINGS' : 'NEW PARTNER';
    if($("uniModalTitle")) $("uniModalTitle").textContent=university ? 'Edit University' : 'Add University';
    if($("uniSubmitBtn")) $("uniSubmitBtn").textContent=university ? 'Update University' : 'Add University';
    if($("uniCodeHint")) $("uniCodeHint").textContent=university ? 'University code is locked after creation because it is used by related courses, scholarships and applications.' : 'Short code must be unique. Example: NUMED, UOSM or UORM.';
    if($("uniCode")) $("uniCode").readOnly=Boolean(university);
    if(university){
      $("uniName").value=university.name || '';
      $("uniCode").value=university.id || '';
      $("uniLocation").value=university.location || '';
    }
  }
  function openUniversityModal(university=null){ setUniversityFormMode(university); openModal('universityModal'); }
  function openOfficerModal(){
    const active=universities.filter(u=>u.status==='active');
    if(!active.length){
      toast('No active universities are available. Go to Universities and activate one first.');
      return;
    }
    openModal('officerModal');
  }
  document.querySelectorAll('[data-open-modal]').forEach(b=>b.addEventListener('click',()=>{
    if(b.dataset.openModal==='universityModal') openUniversityModal();
    else if(b.dataset.openModal==='officerModal') openOfficerModal();
    else openModal(b.dataset.openModal);
  }));
  document.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',()=>closeModal(b)));

  if(!supabase){ location.href='/pages/staff-login.html'; return; }
  const { data:{ session } } = await supabase.auth.getSession();
  if(!session){ location.href='/pages/staff-login.html'; return; }
  const { data:me } = await supabase.from('officer_profiles').select('*').eq('id',session.user.id).maybeSingle();
  if(!me || me.role !== 'administrator' || me.status === 'inactive'){ await supabase.auth.signOut(); location.href='/pages/staff-login.html'; return; }
  $("adminName").textContent=me.full_name || 'Administrator'; $("adminEmail").textContent=me.email || session.user.email || '';

  async function api(body){
    const {data:{session:latestSession}}=await supabase.auth.getSession();
    const token=latestSession?.access_token;
    if(!token) throw new Error('Your administrator session has expired. Please sign in again.');

    let r;
    try{
      r=await fetch('https://rppmrmaadchjrofmdkwp.supabase.co/functions/v1/tne-admin-users',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${token}`,
          'apikey':'sb_publishable_3SwHa4P3MlKtl0Wr3Hsu3g_o8Id5D4S'
        },
        body:JSON.stringify(body||{})
      });
    }catch(err){
      throw new Error('Could not reach the Supabase account service. Please check your internet connection and try again.');
    }

    let j={};
    try{ j=await r.json(); }catch(_){ /* friendly fallback below */ }
    if(!r.ok){
      const raw=j.error || `Account service returned ${r.status}`;
      if(r.status===401) throw new Error('Your administrator session is invalid or expired. Sign out, sign in again, then retry.');
      if(r.status===403) throw new Error('This account is not authorized as an active TNE Administrator.');
      throw new Error(raw);
    }
    return j;
  }
  function normalizeDirectoryUser(profile={}, staff=null){
    const role=staff?.role || profile.account_type || 'student';
    return {
      id:profile.id || staff?.id || '',
      email:staff?.email || profile.email || '',
      role,
      name:staff?.full_name || profile.full_name || '',
      universityId:staff?.university_id || '',
      status:staff?.status || profile.account_status || 'active',
      onboardingCompleted:Boolean(profile.onboarding_completed),
      phone:profile.phone || '',
      nationality:profile.nationality || '',
      location:profile.location || '',
      preferredIntake:profile.preferred_intake || '',
      qualification:profile.qualification || '',
      completionYear:profile.completion_year || '',
      englishLevel:profile.english_level || '',
      englishScore:profile.english_score || '',
      studyInterest:profile.study_interest || '',
      wantsScholarship:profile.wants_scholarship || '',
      budgetRange:profile.budget_range || '',
      academicStrength:profile.academic_strength || '',
      needAccommodation:profile.need_accommodation || ''
    };
  }
  async function load(){
    directoryLoadWarnings=[];
    const [ur, ar, pr, sr] = await Promise.all([
      supabase.from('universities').select('*').order('name'),
      supabase.from('student_applications').select('*').order('updated_at',{ascending:false}),
      supabase.from('profiles').select('*').order('created_at',{ascending:false}),
      supabase.from('officer_profiles').select('*')
    ]);

    if(ur.error){
      universities=[];
      directoryLoadWarnings.push(`Universities could not be loaded: ${ur.error.message}`);
    }else universities=ur.data||[];

    if(ar.error){
      applications=[];
      directoryLoadWarnings.push(`Applications could not be loaded: ${ar.error.message}`);
    }else applications=ar.data||[];

    const profiles=pr.error ? [] : (pr.data||[]);
    const staff=sr.error ? [] : (sr.data||[]);
    if(pr.error) directoryLoadWarnings.push(`Student accounts could not be loaded: ${pr.error.message}`);
    if(sr.error) directoryLoadWarnings.push(`Officer accounts could not be loaded: ${sr.error.message}`);

    const profileById=Object.fromEntries(profiles.map(row=>[row.id,row]));
    const staffById=Object.fromEntries(staff.map(row=>[row.id,row]));
    const ids=new Set([...Object.keys(profileById),...Object.keys(staffById)]);
    users=[...ids].map(id=>normalizeDirectoryUser(profileById[id]||{id},staffById[id]||null));

    render();
    if(directoryLoadWarnings.length) toast(directoryLoadWarnings[0]);
  }
  function render(){
    $("statUniversities").textContent=universities.length;
    $("statOfficers").textContent=users.filter(u=>u.role==='university_officer').length;
    $("statStudents").textContent=users.filter(u=>u.role==='student').length;
    $("statApplications").textContent=applications.length;
    const activeUniversities=universities.filter(u=>u.status==='active');
    const universitySelect=$("officerUniversity");
    if(universitySelect){
      universitySelect.innerHTML=activeUniversities.length
        ? '<option value="">Select an active university</option>'+activeUniversities.map(u=>`<option value="${esc(u.id)}">${esc(u.name)} (${esc(u.id)})</option>`).join('')
        : '<option value="">No active universities available</option>';
      universitySelect.disabled=!activeUniversities.length;
    }
    const officerSubmit=$("officerForm")?.querySelector('button[type="submit"]');
    if(officerSubmit) officerSubmit.disabled=!activeUniversities.length;
    $("universityTable").innerHTML=universities.map(u=>`<tr><td><strong>${esc(u.name)}</strong></td><td>${esc(u.id)}</td><td>${esc(u.location||'—')}</td><td><span class="status ${u.status==='active'?'accepted':'inactive'}">${esc(u.status)}</span></td><td><button class="btn-small" data-edit-university="${esc(u.id)}">Edit</button> <button class="btn-small" data-toggle-university="${esc(u.id)}">${u.status==='active'?'Deactivate':'Activate'}</button></td></tr>`).join('') || '<tr><td colspan="5">No universities could be loaded.</td></tr>';
    renderOfficers(); renderStudents(); renderApplications();
  }
  function renderOfficers(){
    const q=($("officerSearch").value||'').toLowerCase();
    const rows=users.filter(u=>u.role==='university_officer' && (!q || `${u.name} ${u.email} ${u.universityId}`.toLowerCase().includes(q)));
    $("officerTable").innerHTML=rows.map(u=>`<tr><td><strong>${esc(u.name||'Officer')}</strong><br><small>${esc(u.email)}</small></td><td>${esc(universities.find(x=>x.id===u.universityId)?.name||u.universityId||'—')}</td><td>University Officer</td><td><span class="status ${u.status==='active'?'accepted':'inactive'}">${esc(u.status)}</span></td><td><button class="btn-small" data-reset-email="${esc(u.email)}">Reset Password</button> <button class="btn-small" data-user-status="${esc(u.id)}" data-next-status="${u.status==='active'?'inactive':'active'}">${u.status==='active'?'Deactivate':'Activate'}</button></td></tr>`).join('') || '<tr><td colspan="5">No officer accounts found.</td></tr>';
  }
  function renderStudents(){
    const q=($("studentSearch").value||'').toLowerCase();
    const rows=users.filter(u=>u.role==='student' && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q)));
    $("studentTable").innerHTML=rows.map(u=>{const count=applications.filter(a=>a.user_id===u.id || String(a.email||'').toLowerCase()===String(u.email||'').toLowerCase()).length; const onboarding=u.onboardingCompleted?'Onboarding complete':'Onboarding pending'; return `<tr><td><strong>${esc(u.name||'Student')}</strong><br><small>${esc(u.email)}</small><br><small>${esc(onboarding)}</small></td><td>${esc(u.qualification||'—')}</td><td><span class="status ${u.status==='active'?'accepted':'inactive'}">${esc(u.status)}</span></td><td>${count}</td><td><button class="btn-small" data-reset-email="${esc(u.email)}">Reset Password</button> <button class="btn-small" data-user-status="${esc(u.id)}" data-next-status="${u.status==='active'?'inactive':'active'}">${u.status==='active'?'Deactivate':'Activate'}</button></td></tr>`}).join('') || '<tr><td colspan="5">No student accounts found.</td></tr>';
  }
  function renderApplications(){
    const q=($("applicationSearch").value||'').toLowerCase(), st=$("applicationStatus").value;
    const rows=applications.filter(a=>(!st||a.status===st)&&(!q||`${a.full_name} ${a.email} ${a.selected_university} ${a.selected_course}`.toLowerCase().includes(q)));
    $("applicationTable").innerHTML=rows.map(a=>`<tr><td><strong>${esc(a.full_name||'Student')}</strong><br><small>${esc(a.email||'')}</small></td><td>${esc(universities.find(u=>u.id===a.selected_university)?.name||a.selected_university||'—')}</td><td>${esc(a.selected_course||'—')}</td><td>${esc(a.qualification||'—')}</td><td><span class="status ${esc(a.status)}">${esc(a.status)}</span></td><td>${esc((a.updated_at||'').slice(0,10))}</td></tr>`).join('') || '<tr><td colspan="6">No applications found.</td></tr>';
  }

  $("adminNav")?.addEventListener('click',e=>{const b=e.target.closest('button[data-panel]'); if(!b)return; document.querySelectorAll('#adminNav button').forEach(x=>x.classList.toggle('active',x===b)); document.querySelectorAll('.adm-panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${b.dataset.panel}`));});
  $("officerSearch")?.addEventListener('input',renderOfficers); $("studentSearch")?.addEventListener('input',renderStudents); $("applicationSearch")?.addEventListener('input',renderApplications); $("applicationStatus")?.addEventListener('change',renderApplications);

  $("universityForm")?.addEventListener('submit',async e=>{
    e.preventDefault();
    const name=$("uniName").value.trim();
    const id=$("uniCode").value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
    const location=$("uniLocation").value.trim();
    if(!name || !id){ toast('University name and short code are required.'); return; }

    const codeMatch=universities.find(u=>String(u.id||'').toUpperCase()===id && u.id!==editingUniversityId);
    const nameMatch=universities.find(u=>String(u.name||'').trim().toLowerCase()===name.toLowerCase() && u.id!==editingUniversityId);
    const duplicate=codeMatch || nameMatch;
    if(duplicate){
      const state=duplicate.status==='inactive' ? ' It is currently inactive, so use Activate instead of adding it again.' : '';
      toast(`University already exists: ${duplicate.name} (${duplicate.id}).${state}`);
      return;
    }

    let error=null;
    if(editingUniversityId){
      ({error}=await supabase.from('universities').update({
        name,
        short_name:id,
        location
      }).eq('id',editingUniversityId));
    }else{
      ({error}=await supabase.from('universities').insert({
        id,
        name,
        short_name:id,
        location,
        status:'active'
      }));
    }
    if(error){
      if(error.code==='23505' || /duplicate key|unique constraint/i.test(error.message||'')){
        toast('This university already exists. Use Edit or Activate instead of creating a duplicate.');
      }else{
        toast(error.message);
      }
      return;
    }
    $("universityModal").hidden=true;
    await load();
    toast(editingUniversityId ? 'University updated.' : 'University added.');
    editingUniversityId=null;
  });
  $("officerForm")?.addEventListener('submit',async e=>{
    e.preventDefault();
    const universityId=$("officerUniversity").value;
    if(!universityId){ toast('Choose an active university before creating the officer login.'); return; }
    try{
      await api({action:'create',email:$("officerEmail").value.trim().toLowerCase(),name:$("officerName").value.trim(),role:'university_officer',universityId,temporaryPassword:$("officerPassword").value});
      $("officerModal").hidden=true;
      await load();
      toast('University officer login created.');
    }catch(err){toast(err.message)}
  });
  $("studentForm")?.addEventListener('submit',async e=>{e.preventDefault(); const temporaryPassword=$("newStudentPassword").value; try{await api({action:'create',email:$("newStudentEmail").value.trim().toLowerCase(),name:$("newStudentName").value.trim(),role:'student',qualification:$("newStudentQualification").value,temporaryPassword}); $("studentModal").hidden=true; await load(); toast('Student account created. The account is stored in Supabase Auth and public.profiles.');}catch(err){toast(err.message)}});

  document.addEventListener('click',async e=>{
    const reset=e.target.closest('[data-reset-email]'); if(reset){ try{window.tneMarkPasswordRecoveryRequested?.(); const {error}=await supabase.auth.resetPasswordForEmail(reset.dataset.resetEmail,{redirectTo:(window.tneAuthRedirects?.passwordReset || "https://tnecorridor.com/pages/reset-password.html")}); if(error)throw error; toast('Password reset email sent.');}catch(err){toast(err.message)} return; }
    const ub=e.target.closest('[data-user-status]'); if(ub){try{await api({action:'status',userId:ub.dataset.userStatus,status:ub.dataset.nextStatus}); await load(); toast('Account status updated.');}catch(err){toast(err.message)} return;}
    const eu=e.target.closest('[data-edit-university]'); if(eu){const u=universities.find(x=>x.id===eu.dataset.editUniversity); if(u)openUniversityModal(u); return;}
    const tu=e.target.closest('[data-toggle-university]'); if(tu){const u=universities.find(x=>x.id===tu.dataset.toggleUniversity); if(!u)return; const {error}=await supabase.from('universities').update({status:u.status==='active'?'inactive':'active'}).eq('id',u.id); if(error)toast(error.message); else {await load(); toast('University status updated.');}}
  });
  $("adminResetPasswordBtn")?.addEventListener('click',async()=>{window.tneMarkPasswordRecoveryRequested?.(); const {error}=await supabase.auth.resetPasswordForEmail(session.user.email,{redirectTo:(window.tneAuthRedirects?.passwordReset || "https://tnecorridor.com/pages/reset-password.html")}); toast(error?error.message:'Password reset email sent.');});
  $("adminLogoutBtn")?.addEventListener('click',async()=>{await supabase.auth.signOut(); sessionStorage.removeItem('tneStaffSessionV1'); location.href='/pages/staff-login.html';});
  try{await load();}catch(err){toast(err.message);}
});
