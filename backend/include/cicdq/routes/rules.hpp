#ifndef CICDQ_ROUTES_RULES_HPP
#define CICDQ_ROUTES_RULES_HPP

// =============================================================================
// Maturity rules routes
//   GET /api/rules           — list all rules (public)
//   PUT /api/rules/:level    — update a rule by maturity level (admin)
// =============================================================================

#include <string>

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
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_RULES_HPP
