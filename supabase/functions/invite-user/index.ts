import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type InviteRequest = {
  email?: unknown;
  role?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (request, context) => {
      if (request.method === "OPTIONS") {
        return new Response("ok", {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
              "authorization, x-client-info, apikey, content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });
      }

      if (request.method !== "POST") {
        return jsonResponse(
          { error: "Method not allowed." },
          405,
        );
      }

      try {
        /*
         * The authenticated caller's ID comes from the verified JWT.
         */
        const requestingUserId =
          context.userClaims?.id ??
          context.userClaims?.sub;

        if (!requestingUserId) {
          return jsonResponse(
            { error: "You must be signed in." },
            401,
          );
        }

        /*
         * supabaseAdmin bypasses RLS, so every authorization
         * check must be performed explicitly in this function.
         */
        const adminClient =
          context.supabaseAdmin;

        const {
          data: requestingProfile,
          error: requestingProfileError,
        } = await adminClient
          .from("profiles")
          .select(
            "id, email, role, organization_id",
          )
          .eq("id", requestingUserId)
          .maybeSingle();

        if (
          requestingProfileError ||
          !requestingProfile
        ) {
          console.error(
            "Caller profile lookup failed:",
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
                "Only administrators can invite users.",
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

        let requestBody: InviteRequest;

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

        const email =
          typeof requestBody.email === "string"
            ? requestBody.email
                .trim()
                .toLowerCase()
            : "";

        const requestedRole =
          typeof requestBody.role === "string"
            ? requestBody.role
                .trim()
                .toLowerCase()
            : "user";

        if (
          !email ||
          !email.includes("@")
        ) {
          return jsonResponse(
            {
              error:
                "A valid email address is required.",
            },
            400,
          );
        }

        if (
          requestedRole !== "user" &&
          requestedRole !== "admin"
        ) {
          return jsonResponse(
            {
              error:
                "Role must be either user or admin.",
            },
            400,
          );
        }

        /*
         * Prevent inviting an email that already has a profile.
         */
        const {
          data: existingProfile,
          error: existingProfileError,
        } = await adminClient
          .from("profiles")
          .select("id, organization_id")
          .ilike("email", email)
          .maybeSingle();

        if (existingProfileError) {
          console.error(
            "Existing profile lookup failed:",
            existingProfileError,
          );

          return jsonResponse(
            {
              error:
                "The email address could not be checked.",
            },
            500,
          );
        }

        if (existingProfile) {
          return jsonResponse(
            {
              error:
                "A user with this email address already exists.",
            },
            409,
          );
        }

        /*
         * Optional production redirect.
         *
         * Add INVITE_REDIRECT_URL as an Edge Function secret later,
         * for example:
         * https://dentalinventorymanagement.com/login
         */
        const inviteRedirectUrl =
          Deno.env.get(
            "INVITE_REDIRECT_URL",
          ) || undefined;

        const {
          data: invitationData,
          error: invitationError,
        } =
          await adminClient.auth.admin
            .inviteUserByEmail(email, {
              data: {
                role: requestedRole,
                organization_id:
                  requestingProfile.organization_id,
                invited_by:
                  requestingUserId,
              },
              ...(inviteRedirectUrl
                ? {
                    redirectTo:
                      inviteRedirectUrl,
                  }
                : {}),
            });

        if (
          invitationError ||
          !invitationData.user
        ) {
          console.error(
            "Invitation failed:",
            invitationError,
          );

          return jsonResponse(
            {
              error:
                invitationError?.message ||
                "The invitation could not be sent.",
            },
            400,
          );
        }

        const invitedUser =
          invitationData.user;

        /*
         * Ensure the invited user immediately has a profile
         * assigned to the caller's organization.
         *
         * This also safely updates a profile created by an
         * existing auth trigger.
         */
        const {
          error: profileUpsertError,
        } = await adminClient
          .from("profiles")
          .upsert(
            {
              id: invitedUser.id,
              email,
              role: requestedRole,
              organization_id:
                requestingProfile.organization_id,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "id",
            },
          );

        if (profileUpsertError) {
          console.error(
            "Invited profile creation failed:",
            profileUpsertError,
          );

          /*
           * Roll back the Auth invitation so the system does
           * not leave an unassigned user behind.
           */
          const {
            error: rollbackError,
          } =
            await adminClient.auth.admin
              .deleteUser(
                invitedUser.id,
                false,
              );

          if (rollbackError) {
            console.error(
              "Invitation rollback failed:",
              rollbackError,
            );
          }

          return jsonResponse(
            {
              error:
                "The invitation was not completed because the employee profile could not be created.",
            },
            500,
          );
        }

        return jsonResponse({
          success: true,
          message:
            "Invitation sent successfully.",
          user: {
            id: invitedUser.id,
            email,
            role: requestedRole,
            organization_id:
              requestingProfile.organization_id,
          },
        });
      } catch (error) {
        console.error(
          "Unexpected invite-user error:",
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
    },
  ),
};