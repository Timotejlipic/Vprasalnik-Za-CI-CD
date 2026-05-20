#ifndef CICDQ_ROUTES_PIPELINES_HPP
#define CICDQ_ROUTES_PIPELINES_HPP

// =============================================================================
// Pipeline routes  (all require authentication)
//   GET    /api/pipelines       — list pipelines for the current user
//   POST   /api/pipelines       — create a new pipeline assessment
//   GET    /api/pipelines/:id   — get one pipeline
//   PUT    /api/pipelines/:id   — update a pipeline
//   DELETE /api/pipelines/:id   — delete a pipeline
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


inline void register_pipeline_routes(httplib::Server& server, Store& store,
                                      const std::string& secret)
{
    // =========================================================================
    // GET /api/pipelines
    // =========================================================================

    server.Get("/api/pipelines", [&store, &secret](const httplib::Request& req,
                                                    httplib::Response&      res)
    {
        const auto user = extract_user(req, secret);
        if (!user) { send_err(res, 401, "Authentication required."); return; }

        const auto list = store.find_pipelines(user->id);
        send_json(res, 200, nlohmann::json(list));
    });

    // =========================================================================
    // POST /api/pipelines
    // =========================================================================

    server.Post("/api/pipelines", [&store, &secret](const httplib::Request& req,
                                                     httplib::Response&      res)
    {
        const auto user = extract_user(req, secret);
        if (!user) { send_err(res, 401, "Authentication required."); return; }

        const auto body = parse_body(req);

        const std::string name = body.value("name", "");
        if (name.empty()) { send_err(res, 400, "Pipeline name is required."); return; }

        Pipeline p;
        p.user_id   = user->id;
        p.name      = name;
        p.repo_id   = body.value("repoId",   "");
        p.assessor  = body.value("assessor", "");
        p.repo_link = body.value("repoLink", "");
        p.date      = body.value("date",     "");
        p.score     = body.value("score",    0);
        p.level     = body.value("level",    1);
        if (body.contains("answers"))
            p.answers = body.at("answers").get<std::map<std::string, std::string>>();

        const auto saved = store.create_pipeline(std::move(p));
        send_json(res, 201, nlohmann::json(saved));
    });

    // =========================================================================
    // GET /api/pipelines/:id
    // =========================================================================

    server.Get(R"(/api/pipelines/([^/]+))",
               [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user) { send_err(res, 401, "Authentication required."); return; }

        const std::string id = req.matches[1];
        const auto        p  = store.find_pipeline_by_id(id);

        if (!p)                        { send_err(res, 404, "Pipeline not found."); return; }
        if (p->user_id != user->id)    { send_err(res, 403, "Access denied.");      return; }

        send_json(res, 200, nlohmann::json(*p));
    });

    // =========================================================================
    // PUT /api/pipelines/:id
    // =========================================================================

    server.Put(R"(/api/pipelines/([^/]+))",
               [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user) { send_err(res, 401, "Authentication required."); return; }

        const std::string id       = req.matches[1];
        const auto        existing = store.find_pipeline_by_id(id);

        if (!existing)                        { send_err(res, 404, "Pipeline not found."); return; }
        if (existing->user_id != user->id)    { send_err(res, 403, "Access denied.");      return; }

        const auto body = parse_body(req);

        Pipeline fields;
        fields.name      = body.value("name",      "");
        fields.repo_id   = body.value("repoId",    "");
        fields.assessor  = body.value("assessor",  "");
        fields.repo_link = body.value("repoLink",  "");
        fields.date      = body.value("date",      "");
        fields.score     = body.value("score",     existing->score);
        fields.level     = body.value("level",     existing->level);
        if (body.contains("answers"))
            fields.answers = body.at("answers").get<std::map<std::string, std::string>>();

        const auto updated = store.update_pipeline(id, fields);
        send_json(res, 200, nlohmann::json(*updated));
    });

    // =========================================================================
    // DELETE /api/pipelines/:id
    // =========================================================================

    server.Delete(R"(/api/pipelines/([^/]+))",
                  [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user) { send_err(res, 401, "Authentication required."); return; }

        const std::string id       = req.matches[1];
        const auto        existing = store.find_pipeline_by_id(id);

        if (!existing)                        { send_err(res, 404, "Pipeline not found."); return; }
        if (existing->user_id != user->id)    { send_err(res, 403, "Access denied.");      return; }

        store.remove_pipeline(id);
        res.status = 204;
    });
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_PIPELINES_HPP
