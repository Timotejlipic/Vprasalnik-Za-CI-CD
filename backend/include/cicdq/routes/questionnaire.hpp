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
    // GET /api/questionnaire/versions  — public (guests need all version details)
    // =========================================================================

    server.Get("/api/questionnaire/versions",
               [&store](const httplib::Request&, httplib::Response& res)
    {
        send_json(res, 200, nlohmann::json(store.get_all_questionnaire_versions()));
    });

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

        store.set_questionnaire(body);
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

        store.set_questionnaire(body);
        send_json(res, 200, body);
    });
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_QUESTIONNAIRE_HPP
