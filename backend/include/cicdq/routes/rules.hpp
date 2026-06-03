#ifndef CICDQ_ROUTES_RULES_HPP
#define CICDQ_ROUTES_RULES_HPP

// =============================================================================
// Maturity rules routes
//   GET /api/rules           — list all rules (public)
//   PUT /api/rules/:level    — update a rule by maturity level (admin)
// =============================================================================

#include <string>
#include <fstream>
#include <iostream>

#include <httplib.h>
#include <nlohmann/json.hpp>

#include "../auth.hpp"
#include "../store.hpp"
#include "../types.hpp"


namespace cicdq
{
inline namespace v1
{


inline void register_rules_routes(httplib::Server& server, Store& store,
                                   const std::string& secret)
{
    // =========================================================================
    // GET /api/rules  (public)
    // =========================================================================

    server.Get("/api/rules", [&store](const httplib::Request&, httplib::Response& res)
    {
        send_json(res, 200, nlohmann::json(store.find_all_rules()));
    });

    // =========================================================================
    // PUT /api/rules/:level  (admin)
    // =========================================================================

    server.Put(R"(/api/rules/(\d+))",
               [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)           { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)){ send_err(res, 403, "Admin access required.");   return; }

        const auto body = parse_body(req);

        if (!body.contains("name") || !body.contains("description") || !body.contains("minScore"))
        {
            send_err(res, 400, "name, description and minScore are required.");
            return;
        }

        const int level = std::stoi(std::string(req.matches[1]));
        const auto updated = store.update_rule(
            level,
            body.at("name").get<std::string>(),
            body.at("description").get<std::string>(),
            body.at("minScore").get<int>());

        if (!updated) { send_err(res, 404, "Maturity level not found."); return; }
        send_json(res, 200, nlohmann::json(*updated));
    });

    // =========================================================================
    // GET /api/rules/versions  — list all versions of rules (public)
    // =========================================================================

    server.Get("/api/rules/versions", [&store](const httplib::Request&, httplib::Response& res)
    {
        send_json(res, 200, nlohmann::json(store.get_all_rules_versions()));
    });

    // =========================================================================
    // GET /api/rules/versions/:version  — get rules by version
    // =========================================================================

    server.Get(R"(/api/rules/versions/([^/]+))", [&store](const httplib::Request& req, httplib::Response& res)
    {
        const std::string version = req.matches[1];
        const auto r = store.get_rules_by_version(version);
        if (r)
        {
            send_json(res, 200, *r);
        }
        else
        {
            send_err(res, 404, "Rules version not found.");
        }
    });

    // =========================================================================
    // POST /api/rules/versions  — upload / save rules version (admin)
    // =========================================================================

    server.Post("/api/rules/versions", [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }

        const auto body = parse_body(req);
        store.save_rules_version(body);
        send_json(res, 200, body);
    });

    // =========================================================================
    // DELETE /api/rules/versions/:version  — delete rules version (admin)
    // =========================================================================

    server.Delete(R"(/api/rules/versions/([^/]+))", [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }

        const std::string version = req.matches[1];
        if (store.delete_rules_version(version))
        {
            send_json(res, 200, {{"status", "deleted"}});
        }
        else
        {
            send_err(res, 404, "Rules version not found.");
        }
    });
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_RULES_HPP
