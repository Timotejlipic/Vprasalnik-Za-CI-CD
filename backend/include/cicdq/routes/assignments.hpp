#ifndef CICDQ_ROUTES_ASSIGNMENTS_HPP
#define CICDQ_ROUTES_ASSIGNMENTS_HPP

// =============================================================================
// Groups & Assignments routes
//   GET    /api/groups                      — list groups            (admin)
//   POST   /api/groups                      — create group           (admin)
//   DELETE /api/groups/:id                  — delete group           (admin)
//   POST   /api/groups/:id/members          — add member             (admin)
//   DELETE /api/groups/:id/members/:userId  — remove member          (admin)
//   POST   /api/groups/:id/repos            — add repo               (admin)
//   GET    /api/assignments                 — all (admin) / own (user)
//   GET    /api/assignments/me              — current user's assignments
//   POST   /api/assignments/accept-invite   — create own from invite link
//   POST   /api/assignments/:id/complete    — mark completed on submit
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


inline void register_assignment_routes(httplib::Server& server, Store& store,
                                        const std::string& secret)
{
    // =========================================================================
    // GET /api/groups
    // =========================================================================
    server.Get("/api/groups", [&store, &secret](const httplib::Request& req,
                                                 httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }
        send_json(res, 200, store.list_groups());
    });

    // =========================================================================
    // POST /api/groups
    // =========================================================================
    server.Post("/api/groups", [&store, &secret](const httplib::Request& req,
                                                  httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }

        const auto body = parse_body(req);
        const std::string name = body.value("name", "");
        if (name.empty()) { send_err(res, 400, "Group name is required."); return; }

        const nlohmann::json user_ids = (body.contains("userIds") && body["userIds"].is_array())
                                        ? body["userIds"] : nlohmann::json::array();
        const nlohmann::json repos    = (body.contains("githubRepos") && body["githubRepos"].is_array())
                                        ? body["githubRepos"] : nlohmann::json::array();
        const std::string fv = body.value("formVersion",  "1.0");
        const std::string rv = body.value("rulesVersion", "1.0");

        send_json(res, 201, store.create_group(name, user_ids, repos, fv, rv));
    });

    // =========================================================================
    // DELETE /api/groups/:id
    // =========================================================================
    server.Delete(R"(/api/groups/([^/]+))", [&store, &secret](const httplib::Request& req,
                                                              httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }
        store.delete_group(req.matches[1]);
        send_json(res, 200, {{"status", "ok"}});
    });

    // =========================================================================
    // POST /api/groups/:id/members
    // =========================================================================
    server.Post(R"(/api/groups/([^/]+)/members)", [&store, &secret](const httplib::Request& req,
                                                                    httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }

        const auto body = parse_body(req);
        const std::string user_id = body.value("userId", "");
        if (user_id.empty()) { send_err(res, 400, "userId is required."); return; }

        const auto g = store.add_group_member(req.matches[1], user_id);
        if (g.is_null()) { send_err(res, 404, "Group not found."); return; }
        send_json(res, 200, g);
    });

    // =========================================================================
    // DELETE /api/groups/:id/members/:userId
    // =========================================================================
    server.Delete(R"(/api/groups/([^/]+)/members/([^/]+))", [&store, &secret](const httplib::Request& req,
                                                                             httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }

        const auto g = store.remove_group_member(req.matches[1], req.matches[2]);
        if (g.is_null()) { send_err(res, 404, "Group not found."); return; }
        send_json(res, 200, g);
    });

    // =========================================================================
    // POST /api/groups/:id/repos
    // =========================================================================
    server.Post(R"(/api/groups/([^/]+)/repos)", [&store, &secret](const httplib::Request& req,
                                                                  httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)            { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)) { send_err(res, 403, "Admin access required.");   return; }

        const auto body = parse_body(req);
        const std::string repo_link = body.value("repoLink", "");
        if (repo_link.empty()) { send_err(res, 400, "repoLink is required."); return; }

        const auto g = store.add_group_repo(req.matches[1], repo_link,
                                            body.value("formVersion",  "1.0"),
                                            body.value("rulesVersion", "1.0"));
        if (g.is_null()) { send_err(res, 404, "Group not found."); return; }
        send_json(res, 200, g);
    });

    // =========================================================================
    // GET /api/assignments  (admin = all, user = own)
    // =========================================================================
    server.Get("/api/assignments", [&store, &secret](const httplib::Request& req,
                                                      httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user) { send_err(res, 401, "Authentication required."); return; }
        if (is_admin(*user)) send_json(res, 200, store.list_assignments());
        else                 send_json(res, 200, store.list_user_assignments(user->id));
    });

    // =========================================================================
    // GET /api/assignments/me
    // =========================================================================
    server.Get("/api/assignments/me", [&store, &secret](const httplib::Request& req,
                                                         httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user) { send_err(res, 401, "Authentication required."); return; }
        send_json(res, 200, store.list_user_assignments(user->id));
    });

    // =========================================================================
    // POST /api/assignments/accept-invite
    // =========================================================================
    server.Post("/api/assignments/accept-invite", [&store, &secret](const httplib::Request& req,
                                                                     httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user) { send_err(res, 401, "Authentication required."); return; }

        const auto body = parse_body(req);
        const nlohmann::json repos = (body.contains("repos") && body["repos"].is_array())
                                     ? body["repos"] : nlohmann::json::array();
        send_json(res, 200, store.accept_invite(user->id, repos));
    });

    // =========================================================================
    // POST /api/assignments/:id/complete
    // =========================================================================
    server.Post(R"(/api/assignments/([^/]+)/complete)", [&store, &secret](const httplib::Request& req,
                                                                          httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user) { send_err(res, 401, "Authentication required."); return; }

        const auto body = parse_body(req);
        const int   score       = body.value("score", 0);
        const int   level       = body.value("level", 1);
        const std::string pipe  = body.value("pipelineId", "");
        const nlohmann::json answers = (body.contains("answers") && body["answers"].is_object())
                                       ? body["answers"] : nlohmann::json::object();

        const auto a = store.complete_assignment(req.matches[1], score, level, pipe, answers);
        if (a.is_null()) { send_err(res, 404, "Assignment not found."); return; }
        send_json(res, 200, a);
    });
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_ASSIGNMENTS_HPP
