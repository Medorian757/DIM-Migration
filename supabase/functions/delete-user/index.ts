import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed.",
      },
      405,
    );
  }

  try {
    const authorizationHeader =
      request.headers.get("Authorization");

    if (!authorizationHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          error: "You must be signed in.",
        },
        401,
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "Missing required Supabase environment variables.",
      );

      return jsonResponse(
        {
          error: "Server configuration error.",
        },
        500,
      );
    }

    /*
     * This client represents the signed-in caller.
     * The caller's access token is used to verify identity.
     */
    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization:
              authorizationHeader,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );

    const {
      data: {
        user: requestingUser,
      },
      error: authenticationError,
    } = await userClient.auth.getUser();

    if (
      authenticationError ||
      !requestingUser
    ) {
      console.error(
        "Authentication failed:",
        authenticationError,
      );

      return jsonResponse(
        {
          error:
            "Your login session is invalid or expired.",
        },
        401,
      );
    }

    /*
     * This server-only client may bypass RLS.
     * Every authorization rule must therefore be checked below.
     */
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );

    const {
      data: requestingProfile,
      error: requestingProfileError,
    } = await adminClient
      .from("profiles")
      .select(
        "id, role, organization_id",
      )
      .eq("id", requestingUser.id)
      .maybeSingle();

    if (
      requestingProfileError ||
      !requestingProfile
    ) {
      console.error(
        "Requesting profile lookup failed:",
        requestingProfileError,
      );

      return jsonResponse(
        {
          error:
            "Your DIM profile could not be found.",
        },
        403,
      );
    }

    if (
      requestingProfile.role !== "admin"
    ) {
      return jsonResponse(
        {
          error:
            "Only administrators can delete users.",
        },
        403,
      );
    }

    if (
      !requestingProfile.organization_id
    ) {
      return jsonResponse(
        {
          error:
            "Your account is not assigned to a dental office.",
        },
        403,
      );
    }

    let requestBody: {
      userId?: unknown;
    };

    try {
      requestBody =
        await request.json();
    } catch {
      return jsonResponse(
        {
          error:
            "The request body must contain valid JSON.",
        },
        400,
      );
    }

    const userId =
      typeof requestBody.userId === "string"
        ? requestBody.userId.trim()
        : "";

    if (!userId) {
      return jsonResponse(
        {
          error:
            "A valid user ID is required.",
        },
        400,
      );
    }

    if (
      userId === requestingUser.id
    ) {
      return jsonResponse(
        {
          error:
            "You cannot delete your own account.",
        },
        400,
      );
    }

    const {
      data: targetProfile,
      error: targetProfileError,
    } = await adminClient
      .from("profiles")
      .select(
        "id, role, organization_id",
      )
      .eq("id", userId)
      .maybeSingle();

    if (
      targetProfileError ||
      !targetProfile
    ) {
      console.error(
        "Target profile lookup failed:",
        targetProfileError,
      );

      return jsonResponse(
        {
          error:
            "The selected user could not be found.",
        },
        404,
      );
    }

    if (
      targetProfile.organization_id !==
      requestingProfile.organization_id
    ) {
      return jsonResponse(
        {
          error:
            "You cannot delete a user from another dental office.",
        },
        403,
      );
    }

    /*
     * Protect the office from losing its final administrator.
     */
    if (
      targetProfile.role === "admin"
    ) {
      const {
        count: administratorCount,
        error: administratorCountError,
      } = await adminClient
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "organization_id",
          requestingProfile.organization_id,
        )
        .eq("role", "admin");

      if (
        administratorCountError
      ) {
        console.error(
          "Admin count failed:",
          administratorCountError,
        );

        return jsonResponse(
          {
            error:
              "The administrator count could not be verified.",
          },
          500,
        );
      }

      if (
        (administratorCount ?? 0) <= 1
      ) {
        return jsonResponse(
          {
            error:
              "The final administrator in a dental office cannot be deleted.",
          },
          400,
        );
      }
    }

    /*
     * Permanently delete the Auth user.
     * A profile foreign key with ON DELETE CASCADE should
     * remove the matching profile automatically.
     */
    const {
      error: deleteError,
    } =
      await adminClient.auth.admin.deleteUser(
        userId,
        false,
      );

    if (deleteError) {
      console.error(
        "Auth user deletion failed:",
        deleteError,
      );

      return jsonResponse(
        {
          error:
            deleteError.message ||
            "The user could not be deleted.",
        },
        500,
      );
    }

    return jsonResponse({
      success: true,
      deletedUserId: userId,
    });
  } catch (error) {
    console.error(
      "Unexpected delete-user error:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      500,
    );
  }
});