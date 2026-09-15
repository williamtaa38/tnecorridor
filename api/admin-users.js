import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!URL || !SERVICE) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(URL, SERVICE, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function requireAdmin(req, supabase) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new Error("Unauthorized");
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("officer_profiles")
    .select("role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile || profile.role !== "administrator" || profile.status === "inactive") {
    throw new Error("Forbidden");
  }

  return user;
}

function normalizeUser(authUser, staffProfile, publicProfile) {
  const metadata = authUser?.user_metadata || {};
  const role =
    staffProfile?.role ||
    publicProfile?.account_type ||
    metadata.account_type ||
    metadata.role ||
    "student";

  return {
    id: authUser.id,
    email: authUser.email || publicProfile?.email || staffProfile?.email || "",
    createdAt: authUser.created_at || publicProfile?.created_at || "",
    lastSignInAt: authUser.last_sign_in_at || "",
    emailConfirmedAt: authUser.email_confirmed_at || "",
    role,
    name:
      staffProfile?.full_name ||
      publicProfile?.full_name ||
      metadata.full_name ||
      "",
    universityId: staffProfile?.university_id || "",
    status:
      staffProfile?.status ||
      publicProfile?.account_status ||
      "active",
    onboardingCompleted: Boolean(publicProfile?.onboarding_completed),
    phone: publicProfile?.phone || "",
    nationality: publicProfile?.nationality || "",
    location: publicProfile?.location || "",
    preferredIntake: publicProfile?.preferred_intake || "",
    qualification: publicProfile?.qualification || "",
    completionYear: publicProfile?.completion_year || "",
    englishLevel: publicProfile?.english_level || "",
    englishScore: publicProfile?.english_score || "",
    studyInterest: publicProfile?.study_interest || "",
    wantsScholarship: publicProfile?.wants_scholarship || "",
    budgetRange: publicProfile?.budget_range || "",
    academicStrength: publicProfile?.academic_strength || "",
    needAccommodation: publicProfile?.need_accommodation || ""
  };
}

export default async function handler(req, res) {
  try {
    const supabase = adminClient();
    await requireAdmin(req, supabase);

    if (req.method === "GET") {
      const [authResult, staffResult, profileResult] = await Promise.all([
        supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        supabase.from("officer_profiles").select("*"),
        supabase.from("profiles").select("*")
      ]);

      if (authResult.error) throw authResult.error;
      if (staffResult.error) throw staffResult.error;
      if (profileResult.error) throw profileResult.error;

      const staffById = Object.fromEntries(
        (staffResult.data || []).map((row) => [row.id, row])
      );
      const profileById = Object.fromEntries(
        (profileResult.data || []).map((row) => [row.id, row])
      );

      const users = (authResult.data.users || []).map((user) =>
        normalizeUser(user, staffById[user.id], profileById[user.id])
      );

      return res.status(200).json({ users });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { action } = req.body || {};

    if (action === "create") {
      const {
        email,
        name,
        role,
        universityId,
        temporaryPassword,
        qualification
      } = req.body || {};

      if (
        !email ||
        !temporaryPassword ||
        !["administrator", "university_officer", "student"].includes(role)
      ) {
        throw new Error("Invalid account details");
      }

      if (role === "university_officer" && !universityId) {
        throw new Error("A university is required for a university officer account");
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name || "",
          account_type: role,
          role
        }
      });

      if (error) throw error;

      const userId = data.user.id;
      const normalizedEmail = String(email).trim().toLowerCase();

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email: normalizedEmail,
        full_name: name || "",
        account_type: role,
        account_status: "active",
        qualification: role === "student" ? qualification || "" : null,
        onboarding_completed: false,
        updated_at: new Date().toISOString()
      });

      if (profileError) throw profileError;

      if (role !== "student") {
        const { error: staffError } = await supabase
          .from("officer_profiles")
          .upsert({
            id: userId,
            full_name: name || "",
            email: normalizedEmail,
            role,
            university_id: role === "university_officer" ? universityId : null,
            status: "active"
          });

        if (staffError) throw staffError;
      }

      return res.status(200).json({ ok: true, userId });
    }

    if (action === "status") {
      const { userId, status } = req.body || {};

      if (!userId || !["active", "inactive"].includes(status)) {
        throw new Error("Invalid account status request");
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          ban_duration: status === "inactive" ? "876000h" : "none"
        }
      );

      if (authError) throw authError;

      const { error: publicProfileError } = await supabase
        .from("profiles")
        .update({
          account_status: status,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (publicProfileError) throw publicProfileError;

      const { error: staffStatusError } = await supabase
        .from("officer_profiles")
        .update({ status })
        .eq("id", userId);

      if (staffStatusError) throw staffStatusError;

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unsupported action" });
  } catch (error) {
    const message = error?.message || "Request failed";
    const statusCode =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;

    return res.status(statusCode).json({ error: message });
  }
}
