import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type CreateOrganizationRequest = {
  organizationName?: unknown;
  firstName?: unknown;
  lastName?: unknown;
};

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
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function cleanText(
  value: unknown,
  maximumLength: number,
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

export default {
  fetch: withSupabase(
    { auth: "user" },

    async (request, context) => {
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

      let requestBody: CreateOrganizationRequest;

      try {
        requestBody = await request.json();
      } catch {
        return jsonResponse(
          {
            error:
              "The request body must contain valid JSON.",
          },
          400,
        );
      }

      const organizationName = cleanText(
        requestBody.organizationName,
        120,
      );

      const firstName = cleanText(
        requestBody.firstName,
        80,
      );

      const lastName = cleanText(
        requestBody.lastName,
        80,
      );

      if (organizationName.length < 2) {
        return jsonResponse(
          {
            error:
              "Enter a dental-office name containing at least two characters.",
          },
          400,
        );
      }

      const requestingUserId =
        context.userClaims?.id ??
        context.userClaims?.sub;

      const requestingUserEmail =
        typeof context.userClaims?.email === "string"
          ? context.userClaims.email
              .trim()
              .toLowerCase()
          : "";

      if (!requestingUserId) {
        return jsonResponse(
          {
            error: "You must be signed in.",
          },
          401,
        );
      }

      const adminClient =
        context.supabaseAdmin;

      let createdOrganizationId:
        | string
        | null = null;

      try {
        const {
          data: existingProfile,
          error: existingProfileError,
        } = await adminClient
          .from("profiles")
          .select(
            `
              id,
              email,
              first_name,
              last_name,
              role,
              organization_id
            `,
          )
          .eq("id", requestingUserId)
          .maybeSingle();

        if (existingProfileError) {
          console.error(
            "Unable to check the existing profile:",
            existingProfileError,
          );

          return jsonResponse(
            {
              error:
                "Your existing DIM profile could not be checked.",
            },
            500,
          );
        }

        if (existingProfile?.organization_id) {
          const {
            data: existingOrganization,
          } = await adminClient
            .from("organizations")
            .select("id, name")
            .eq(
              "id",
              existingProfile.organization_id,
            )
            .maybeSingle();

          return jsonResponse(
            {
              error:
                "Your account already belongs to a dental office.",
              organization:
                existingOrganization ?? {
                  id:
                    existingProfile.organization_id,
                },
            },
            409,
          );
        }

        const {
          data: organization,
          error: organizationError,
        } = await adminClient
          .from("organizations")
          .insert({
            name: organizationName,
          })
          .select("id, name, created_at")
          .single();

        if (
          organizationError ||
          !organization
        ) {
          console.error(
            "Unable to create organization:",
            organizationError,
          );

          return jsonResponse(
            {
              error:
                organizationError?.message ||
                "The dental office could not be created.",
            },
            500,
          );
        }

        createdOrganizationId =
          organization.id;

        const profilePayload: Record<
          string,
          unknown
        > = {
          id: requestingUserId,
          role: "admin",
          organization_id:
            organization.id,
          updated_at:
            new Date().toISOString(),
        };

        if (requestingUserEmail) {
          profilePayload.email =
            requestingUserEmail;
        }

        if (firstName) {
          profilePayload.first_name =
            firstName;
        }

        if (lastName) {
          profilePayload.last_name =
            lastName;
        }

        const {
          data: ownerProfile,
          error: ownerProfileError,
        } = await adminClient
          .from("profiles")
          .upsert(profilePayload, {
            onConflict: "id",
          })
          .select(
            `
              id,
              email,
              first_name,
              last_name,
              role,
              organization_id
            `,
          )
          .single();

        if (
          ownerProfileError ||
          !ownerProfile
        ) {
          throw new Error(
            ownerProfileError?.message ||
              "The owner profile could not be assigned.",
          );
        }

        const {
          data: presetCategories,
          error: presetCategoriesError,
        } = await adminClient
          .from("preset_categories")
          .select(
            `
              name,
              description,
              color,
              icon
            `,
          )
          .order("name", {
            ascending: true,
          });

        if (presetCategoriesError) {
          throw new Error(
            presetCategoriesError.message ||
              "Preset categories could not be loaded.",
          );
        }

        if (
          presetCategories &&
          presetCategories.length > 0
        ) {
          const categoryRows =
            presetCategories.map(
              (category) => ({
                name: category.name,
                description:
                  category.description,
                color: category.color,
                icon: category.icon,
                organization_id:
                  organization.id,
              }),
            );

          const {
            error:
              categoryInsertError,
          } = await adminClient
            .from("categories")
            .insert(categoryRows);

          if (categoryInsertError) {
            throw new Error(
              categoryInsertError.message ||
                "Preset categories could not be added.",
            );
          }
        }

        const {
          data: presetSuppliers,
          error: presetSuppliersError,
        } = await adminClient
          .from("preset_suppliers")
          .select(
            `
              name,
              contact_name,
              email,
              phone,
              address,
              website,
              lead_time_days,
              payment_terms,
              notes
            `,
          )
          .order("name", {
            ascending: true,
          });

        if (presetSuppliersError) {
          throw new Error(
            presetSuppliersError.message ||
              "Preset suppliers could not be loaded.",
          );
        }

        if (
          presetSuppliers &&
          presetSuppliers.length > 0
        ) {
          const supplierRows =
            presetSuppliers.map(
              (supplier) => ({
                name: supplier.name,
                contact_name:
                  supplier.contact_name,
                email: supplier.email,
                phone: supplier.phone,
                address:
                  supplier.address,
                website:
                  supplier.website,
                lead_time_days:
                  supplier.lead_time_days,
                payment_terms:
                  supplier.payment_terms,
                notes: supplier.notes,
                organization_id:
                  organization.id,
              }),
            );

          const {
            error:
              supplierInsertError,
          } = await adminClient
            .from("suppliers")
            .insert(supplierRows);

          if (supplierInsertError) {
            throw new Error(
              supplierInsertError.message ||
                "Preset suppliers could not be added.",
            );
          }
        }

        return jsonResponse(
          {
            success: true,
            message:
              "Dental office created successfully.",
            organization,
            owner: ownerProfile,
            presets: {
              categories:
                presetCategories?.length ??
                0,
              suppliers:
                presetSuppliers?.length ??
                0,
            },
          },
          201,
        );
      } catch (error) {
        console.error(
          "Create organization failed:",
          error,
        );

        if (createdOrganizationId) {
          const {
            error:
              profileRollbackError,
          } = await adminClient
            .from("profiles")
            .update({
              organization_id: null,
            })
            .eq("id", requestingUserId)
            .eq(
              "organization_id",
              createdOrganizationId,
            );

          if (profileRollbackError) {
            console.error(
              "Profile rollback failed:",
              profileRollbackError,
            );
          }

          const {
            error:
              organizationRollbackError,
          } = await adminClient
            .from("organizations")
            .delete()
            .eq(
              "id",
              createdOrganizationId,
            );

          if (
            organizationRollbackError
          ) {
            console.error(
              "Organization rollback failed:",
              organizationRollbackError,
            );
          }
        }

        return jsonResponse(
          {
            error:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred while creating the dental office.",
          },
          500,
        );
      }
    },
  ),
};