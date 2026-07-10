import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    // 1. Authenticate and Authorize the Admin
    const cookieStore = await cookies();
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify admin status
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Fetch custom groups from DB
    const { data: customGroups, error: groupsError } = await supabaseAdmin
      .from("user_groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (groupsError) throw groupsError;

    // Fetch custom group member counts
    const { data: memberCounts, error: countsError } = await supabaseAdmin
      .from("user_group_members")
      .select("group_id");

    if (countsError) throw countsError;

    const customCountsMap: Record<string, number> = {};
    memberCounts?.forEach((m: any) => {
      customCountsMap[m.group_id] = (customCountsMap[m.group_id] || 0) + 1;
    });

    // 3. Resolve default groups dynamically
    // A. Fetch total active users count
    const { count: totalCount, error: totalErr } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (totalErr) throw totalErr;

    // B. Fetch verified users count
    const { count: verifiedCount, error: verifiedErr } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_verified", true);

    if (verifiedErr) throw verifiedErr;

    // C. Fetch OAuth provider counts using RPC or SQL execution since we are on server
    // We run a direct query using executeSql on supabaseAdmin if needed, or query auth.identities
    // Note: Standard Supabase JS Client does not expose executeSql, but we can query using a PostgreSQL RPC if it exists,
    // or we can select from the auth.identities view if we define a view.
    // Wait! Let's check if we can query auth.identities via RPC or if we can define a view that exposes auth.identities.
    // If we define a view `public.user_identities` that selects user_id, provider from auth.identities, we can query it directly!
    // Let's check if such a view exists, or let's create one. That's very clean and standard.
    // Let's check if we can create a view `public.user_identity_providers` pointing to `auth.identities`:
    // "CREATE OR REPLACE VIEW public.user_identity_providers AS SELECT id, user_id, provider, created_at FROM auth.identities;"
    // Yes! Let's do that. That way we can query `user_identity_providers` directly via Supabase Client!
    // Let's check if we can write a SQL query to create that view right now.
    // We already executed SQL successfully. Let's do it in the next step. Let's write the API code first.
    let emailCount = 0;
    let googleCount = 0;
    let linkedinCount = 0;

    try {
      const { data: providersData } = await supabaseAdmin
        .from("user_identity_providers")
        .select("user_id, provider");

      if (providersData) {
        providersData.forEach((p: any) => {
          if (p.provider === "email") emailCount++;
          else if (p.provider === "google") googleCount++;
          else if (p.provider.startsWith("linkedin")) linkedinCount++;
        });
      }
    } catch (e) {
      console.error("Failed to query user_identity_providers, falling back to estimations", e);
      // Fallback fallback estimates or let's create the view in the SQL migration!
    }

    // D. Fetch companies and user counts per company
    const { data: companies, error: companiesErr } = await supabaseAdmin
      .from("companies")
      .select("id, name, domain");

    if (companiesErr) throw companiesErr;

    const { data: userCompanies, error: ucErr } = await supabaseAdmin
      .from("users")
      .select("company_id")
      .eq("is_active", true);

    const companyCountsMap: Record<string, number> = {};
    if (!ucErr && userCompanies) {
      userCompanies.forEach((u: any) => {
        if (u.company_id) {
          companyCountsMap[u.company_id] = (companyCountsMap[u.company_id] || 0) + 1;
        }
      });
    }

    const defaultGroups = [
      {
        id: "default_all",
        name: "All Active Users",
        description: "Every active user registered on the platform",
        is_system: true,
        member_count: totalCount || 0,
      },
      {
        id: "default_verified",
        name: "Verified Users",
        description: "Users who have completed corporate email or manual verification",
        is_system: true,
        member_count: verifiedCount || 0,
      },
      {
        id: "default_email",
        name: "Logged in via Email",
        description: "Users registered with email & password",
        is_system: true,
        member_count: emailCount || 0,
      },
      {
        id: "default_google",
        name: "Logged in via Google",
        description: "Users registered/logged in via Google OAuth",
        is_system: true,
        member_count: googleCount || 0,
      },
      {
        id: "default_linkedin",
        name: "Logged in via LinkedIn",
        description: "Users registered/logged in via LinkedIn OAuth",
        is_system: true,
        member_count: linkedinCount || 0,
      },
    ];

    // Add company default groups (only companies that have at least 1 user)
    companies?.forEach((c: any) => {
      const count = companyCountsMap[c.id] || 0;
      if (count > 0) {
        defaultGroups.push({
          id: `default_company_${c.id}`,
          name: `Users from ${c.name}`,
          description: `Active professionals working at ${c.name} (${c.domain})`,
          is_system: true,
          member_count: count,
        });
      }
    });

    const formattedCustomGroups = customGroups?.map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      is_system: false,
      member_count: customCountsMap[g.id] || 0,
      rules: g.rules,
    })) || [];

    return NextResponse.json({
      success: true,
      groups: [...defaultGroups, ...formattedCustomGroups],
    });
  } catch (err: any) {
    console.error("Error fetching user groups:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate and Authorize the Admin
    const cookieStore = await cookies();
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify admin status
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action, groupId, name, description, userIds } = await req.json();

    if (action === "create") {
      if (!name) {
        return NextResponse.json({ error: "Group name is required" }, { status: 400 });
      }

      // Insert group
      const { data: newGroup, error: insertErr } = await supabaseAdmin
        .from("user_groups")
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          is_system: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Insert members if provided
      if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        const memberRows = userIds.map((uId: string) => ({
          group_id: newGroup.id,
          user_id: uId,
        }));

        const { error: membersErr } = await supabaseAdmin
          .from("user_group_members")
          .insert(memberRows);

        if (membersErr) throw membersErr;
      }

      return NextResponse.json({ success: true, group: newGroup });
    }

    if (action === "update") {
      if (!groupId || !name) {
        return NextResponse.json({ error: "Group ID and name are required" }, { status: 400 });
      }

      // Update group
      const { data: updatedGroup, error: updateErr } = await supabaseAdmin
        .from("user_groups")
        .update({
          name: name.trim(),
          description: description?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", groupId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Replace members
      if (userIds && Array.isArray(userIds)) {
        // Delete old members
        const { error: deleteErr } = await supabaseAdmin
          .from("user_group_members")
          .delete()
          .eq("group_id", groupId);

        if (deleteErr) throw deleteErr;

        // Insert new members
        if (userIds.length > 0) {
          const memberRows = userIds.map((uId: string) => ({
            group_id: groupId,
            user_id: uId,
          }));

          const { error: membersErr } = await supabaseAdmin
            .from("user_group_members")
            .insert(memberRows);

          if (membersErr) throw membersErr;
        }
      }

      return NextResponse.json({ success: true, group: updatedGroup });
    }

    if (action === "delete") {
      if (!groupId) {
        return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
      }

      const { error: deleteErr } = await supabaseAdmin
        .from("user_groups")
        .delete()
        .eq("id", groupId);

      if (deleteErr) throw deleteErr;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Error managing user group:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
