#ifndef CICDQ_ROUTES_QUESTIONNAIRE_HPP
#define CICDQ_ROUTES_QUESTIONNAIRE_HPP

// =============================================================================
// Questionnaire routes
//   GET  /api/questionnaire   — return the active questionnaire (public)
//   POST /api/questionnaire   — upload / replace the entire questionnaire (admin)
//   PUT  /api/questionnaire   — save in-browser edits back to the store (admin)
//
// The questionnaire body must follow the questionnaire_config.json format:
//   {
//     "version":     "1.0",
//     "title":       "...",
//     "description": "...",
//     "sections": [
//       {
//         "id": "...", "label": "...", "type": "checkbox",
//         "description": "...",
//         "items": [
//           {
//             "id": "...", "label": "...", "type": "checkbox|multiselect|text|numeric",
//             "description": "...",
//             "options": [{"value":"...", "label":"..."}],   // multiselect only
//             "items":   [...]                               // nested sub-items
//           }
//         ]
//       }
//     ]
//   }
// =============================================================================

#include <string>

#include <httplib.h>
#include <nlohmann/json.hpp>

#include "../auth.hpp"
#include "../store.hpp"


namespace cicdq
{
inline namespace v1
{


inline void register_questionnaire_routes(httplib::Server& server, Store& store,
                                           const std::string& secret)
{
    // =========================================================================
    // GET /api/questionnaire  — public (guests need the form definition)
    // =========================================================================

    server.Get("/api/questionnaire",
               [&store](const httplib::Request&, httplib::Response& res)
    {
        send_json(res, 200, store.get_questionnaire());
    });

    // =========================================================================
    // POST /api/questionnaire  — admin: upload / replace the questionnaire
    // =========================================================================

    server.Post("/api/questionnaire",
                [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }

        const auto body = parse_body(req);

        if (!body.contains("sections") || !body.at("sections").is_array())
        {
            send_err(res, 400, "Body must contain a 'sections' array.");
            return;
        }

        store.import_questionnaire_version(body);
        send_json(res, 200, body);
    });

    // =========================================================================
    // PUT /api/questionnaire  — admin: save browser edits (same semantics as POST)
    // =========================================================================

    server.Put("/api/questionnaire",
               [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }

        const auto body = parse_body(req);

        if (!body.contains("sections") || !body.at("sections").is_array())
        {
            send_err(res, 400, "Body must contain a 'sections' array.");
            return;
        }

        store.import_questionnaire_version(body);
        send_json(res, 200, body);
    });

    // =========================================================================
    // GET /api/questionnaire/versions  — list all versions (public)
    // =========================================================================

    server.Get("/api/questionnaire/versions",
               [&store](const httplib::Request&, httplib::Response& res)
    {
        send_json(res, 200, nlohmann::json(store.get_all_questionnaire_versions()));
    });

    // =========================================================================
    // GET /api/questionnaire/versions/:version  — get questionnaire by version
    // =========================================================================

    server.Get(R"(/api/questionnaire/versions/([^/]+))",
               [&store](const httplib::Request& req, httplib::Response& res)
    {
        const std::string version = req.matches[1];
        const auto versions = store.get_all_questionnaire_versions();
        for (const auto& q : versions)
        {
            if (q.value("version", "") == version)
            {
                send_json(res, 200, q);
                return;
            }
        }
        send_err(res, 404, "Questionnaire version not found.");
    });

    // =========================================================================
    // DELETE /api/questionnaire/versions/:version  — delete questionnaire version (admin)
    // =========================================================================

    server.Delete(R"(/api/questionnaire/versions/([^/]+))",
                  [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }

        const std::string version = req.matches[1];
        try
        {
            if (store.delete_questionnaire_version(version))
            {
                send_json(res, 200, {{"status", "deleted"}});
            }
            else
            {
                send_err(res, 404, "Questionnaire version not found.");
            }
        }
        catch (const std::exception& e)
        {
            send_err(res, 400, e.what());
        }
    });
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_QUESTIONNAIRE_HPP
