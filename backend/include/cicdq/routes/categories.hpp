#ifndef CICDQ_ROUTES_CATEGORIES_HPP
#define CICDQ_ROUTES_CATEGORIES_HPP

// =============================================================================
// Categories routes
//   GET    /api/categories                           — list all (public)
//   POST   /api/categories                           — create (admin)
//   PUT    /api/categories/:id                       — update (admin)
//   DELETE /api/categories/:id                       — delete (admin)
//   POST   /api/categories/:id/items                 — add item (admin)
//   PUT    /api/categories/:id/items/:itemId         — update item (admin)
//   DELETE /api/categories/:id/items/:itemId         — delete item (admin)
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


inline void register_category_routes(httplib::Server& server, Store& store,
                                      const std::string& secret)
{
    // =========================================================================
    // GET /api/categories  (public — guests need the questionnaire)
    // =========================================================================

    server.Get("/api/categories", [&store](const httplib::Request&,
                                            httplib::Response& res)
    {
        send_json(res, 200, nlohmann::json(store.find_all_categories()));
    });

    // =========================================================================
    // POST /api/categories  (admin)
    // =========================================================================

    server.Post("/api/categories", [&store, &secret](const httplib::Request& req,
                                                      httplib::Response&      res)
    {
        const auto user = extract_user(req, secret);
        if (!user)           { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)){ send_err(res, 403, "Admin access required.");   return; }

        const auto body  = parse_body(req);
        const auto title = body.value("title", "");
        if (title.empty()) { send_err(res, 400, "Category title is required."); return; }

        std::vector<QuestionItem> items;
        if (body.contains("items"))
            items = body.at("items").get<std::vector<QuestionItem>>();

        send_json(res, 201, nlohmann::json(store.create_category(title, items)));
    });

    // =========================================================================
    // PUT /api/categories/:id  (admin)
    // =========================================================================

    server.Put(R"(/api/categories/([^/]+)$)",
               [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)           { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)){ send_err(res, 403, "Admin access required.");   return; }

        const std::string id    = req.matches[1];
        const auto        body  = parse_body(req);
        const auto        title = body.value("title", "");

        const auto updated = store.update_category(id, title);
        if (!updated) { send_err(res, 404, "Category not found."); return; }

        send_json(res, 200, nlohmann::json(*updated));
    });

    // =========================================================================
    // DELETE /api/categories/:id  (admin)
    // =========================================================================

    server.Delete(R"(/api/categories/([^/]+)$)",
                  [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)           { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)){ send_err(res, 403, "Admin access required.");   return; }

        if (!store.remove_category(req.matches[1]))
        {
            send_err(res, 404, "Category not found.");
            return;
        }
        res.status = 204;
    });

    // =========================================================================
    // POST /api/categories/:id/items  (admin)
    // =========================================================================

    server.Post(R"(/api/categories/([^/]+)/items)",
                [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)           { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)){ send_err(res, 403, "Admin access required.");   return; }

        const std::string cat_id = req.matches[1];
        const auto        body   = parse_body(req);

        const auto label = body.value("label", "");
        const auto type  = body.value("type",  "");
        if (label.empty() || type.empty())
        {
            send_err(res, 400, "Item label and type are required.");
            return;
        }

        const auto item = store.add_category_item(
            cat_id, label, type, body.value("description", ""));

        if (!item) { send_err(res, 404, "Category not found."); return; }
        send_json(res, 201, nlohmann::json(*item));
    });

    // =========================================================================
    // PUT /api/categories/:id/items/:itemId  (admin)
    // =========================================================================

    server.Put(R"(/api/categories/([^/]+)/items/([^/]+))",
               [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)           { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)){ send_err(res, 403, "Admin access required.");   return; }

        const std::string cat_id  = req.matches[1];
        const std::string item_id = req.matches[2];
        const auto        body    = parse_body(req);

        const auto item = store.update_category_item(
            cat_id, item_id,
            body.value("label",       ""),
            body.value("type",        ""),
            body.value("description", ""));

        if (!item) { send_err(res, 404, "Category or item not found."); return; }
        send_json(res, 200, nlohmann::json(*item));
    });

    // =========================================================================
    // DELETE /api/categories/:id/items/:itemId  (admin)
    // =========================================================================

    server.Delete(R"(/api/categories/([^/]+)/items/([^/]+))",
                  [&store, &secret](const httplib::Request& req, httplib::Response& res)
    {
        const auto user = extract_user(req, secret);
        if (!user)           { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*user)){ send_err(res, 403, "Admin access required.");   return; }

        if (!store.remove_category_item(req.matches[1], req.matches[2]))
        {
            send_err(res, 404, "Category or item not found.");
            return;
        }
        res.status = 204;
    });
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_CATEGORIES_HPP
