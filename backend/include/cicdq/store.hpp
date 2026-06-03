#ifndef CICDQ_STORE_HPP
#define CICDQ_STORE_HPP

// =============================================================================
// Store — PostgreSQL-backed repository (schema: vprasalnik.sql)
//
// This class keeps the SAME public interface the route handlers already use, so
// nothing above it (routes, types, auth) had to change. Only the storage backing
// moved from in-memory vectors to PostgreSQL via libpqxx.
//
// Mapping from the old domain model onto the SQL schema
// -----------------------------------------------------
//   User            -> app_users         (username is stored in the `email`
//                                          column, which is the UNIQUE key; the
//                                          `name` column gets the same value)
//   Pipeline        -> pipelines (+ pipeline_answers for the answers map)
//   Category        -> questionnaire_items at depth 1 (a "section")
//   QuestionItem    -> questionnaire_items at depth 2 (children of a section)
//   MaturityRule    -> maturity_levels    (minScore is derived — see note below)
//   questionnaire   -> questionnaire_configs + questionnaire_items + options
//
// IDs are BIGSERIAL in the database; they are surfaced to the API as decimal
// strings (e.g. "42") so the existing string-based JSON/JWT contract is kept.
//
// Things to know about this schema
// --------------------------------
//   * It ships with NO seed data. There is no admin account, no maturity levels,
//     and no questionnaire until you create them through the API (register a
//     user, POST /api/questionnaire, etc.). To get an admin you must either
//     register then flip the row's role in SQL, or insert one directly.
//   * Many tables require a questionnaire_config row (NOT NULL FK). When one is
//     needed and none exists, an empty "active" config is created on demand —
//     this is referential plumbing, not seed content.
//   * SCHEMA BUG: pipeline_answers.pipeline_id REFERENCES questionnaire_items(id)
//     but should reference pipelines(id). Answer persistence (create/update of a
//     pipeline's answers) will fail until that one FK is corrected. The code
//     below is written for the *intended* relationship.
//   * maturity_levels has no min-score column, so MaturityRule.min_score is
//     derived as (level_number - 1) * 25 (capped at 100) on read and is ignored
//     on update.
// =============================================================================

#include <algorithm>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include <pqxx/pqxx>

#include "crypto.hpp"
#include "db.hpp"
#include "types.hpp"


namespace cicdq
{
inline namespace v1
{


class Store
{
    Db& _db;

    // -------------------------------------------------------------------------
    // Small helpers
    // -------------------------------------------------------------------------

    // Read a possibly-NULL text field as a std::string ("" when NULL).
    static std::string _txt(const pqxx::field& f)
    {
        return f.is_null() ? std::string{} : f.as<std::string>();
    }

    static std::string _json_str(const nlohmann::json& j, const std::string& key, const std::string& fallback = "")
    {
        if (!j.contains(key)) return fallback;
        const auto& val = j.at(key);
        if (val.is_string()) return val.get<std::string>();
        if (val.is_number_integer()) return std::to_string(val.get<long long>());
        if (val.is_number_float()) {
            double d = val.get<double>();
            std::string s = std::to_string(d);
            s.erase(s.find_last_not_of('0') + 1, std::string::npos);
            if (s.back() == '.') s.pop_back();
            return s;
        }
        return fallback;
    }

    static long _to_long(const std::string& s)
    {
        try
        {
            return s.empty() ? 0L : std::stol(s);
        }
        catch (...)
        {
            return 0L;
        }
    }

    // The schema allows only these item types. Legacy "yes_no_na" maps to
    // "checkbox"; anything unrecognised falls back to "text".
    static std::string _norm_type(const std::string& t)
    {
        if (t == "yes_no_na")                       return "checkbox";
        if (t == "checkbox" || t == "multiselect"
         || t == "numeric"  || t == "text")         return t;
        return "text";
    }

    // Return the id of the active questionnaire config, creating an empty one if
    // none exists (needed because most tables FK to it with NOT NULL).
    static long _active_config_id(pqxx::work& txn)
    {
        const auto r = txn.exec(
            "SELECT id FROM questionnaire_configs "
            "ORDER BY is_active DESC, id ASC LIMIT 1");
        if (!r.empty())
            return r[0][0].as<long>();

        const auto ins = txn.exec_params(
            "INSERT INTO questionnaire_configs (version, title, description, is_active) "
            "VALUES ($1, $2, $3, TRUE) RETURNING id",
            "1.0", "CI/CD Pipeline Maturity Assessment", "");
        return ins[0][0].as<long>();
    }

    static long _config_id_by_version(pqxx::work& txn, const std::string& version)
    {
        if (!version.empty())
        {
            const auto r = txn.exec_params(
                "SELECT id FROM questionnaire_configs WHERE version = $1 LIMIT 1", version);
            if (!r.empty())
                return r[0][0].as<long>();
        }
        return _active_config_id(txn);
    }

    // Load a pipeline's answers as a JSON object { item_key: answer_value }.
    static nlohmann::json _load_answers(pqxx::work& txn, const std::string& pipeline_id)
    {
        nlohmann::json answers = nlohmann::json::object();
        const auto r = txn.exec_params(
            "SELECT qi.item_key AS k, pa.answer_value AS v "
            "FROM pipeline_answers pa "
            "JOIN questionnaire_items qi ON qi.id = pa.questionnaire_item_id "
            "WHERE pa.pipeline_id = $1",
            _to_long(pipeline_id));
        for (const auto& row : r)
            answers[row["k"].as<std::string>()] =
                nlohmann::json::parse(row["v"].as<std::string>());
        return answers;
    }

    // Replace a pipeline's answers. Resolves each answer's item_key to its
    // questionnaire_items.id within `cfg`; unknown keys are skipped.
    static void _save_answers(pqxx::work& txn, const std::string& pipeline_id,
                              long cfg, const nlohmann::json& answers)
    {
        txn.exec_params("DELETE FROM pipeline_answers WHERE pipeline_id = $1",
                        _to_long(pipeline_id));
        if (!answers.is_object()) return;

        for (auto it = answers.begin(); it != answers.end(); ++it)
        {
            const auto ir = txn.exec_params(
                "SELECT id FROM questionnaire_items "
                "WHERE questionnaire_config_id = $1 AND item_key = $2 LIMIT 1",
                cfg, it.key());
            if (ir.empty()) continue;   // answer for an unknown item — skip

            txn.exec_params(
                "INSERT INTO pipeline_answers (pipeline_id, questionnaire_item_id, answer_value) "
                "VALUES ($1, $2, $3::jsonb)",
                _to_long(pipeline_id), ir[0][0].as<long>(), it.value().dump());
        }
    }

    static Pipeline _row_to_pipeline(const pqxx::row& row, nlohmann::json answers)
    {
        Pipeline p;
        p.id        = row["id"].as<std::string>();
        p.user_id   = _txt(row["created_by_user_id"]);
        p.name      = _txt(row["name"]);
        p.repo_id   = _txt(row["project_name"]);
        p.repo_link = _txt(row["repository_url"]);
        p.date      = _txt(row["created_at"]).substr(0, 10);  // YYYY-MM-DD
        p.level     = row["current_maturity_level"].as<int>();
        p.score     = 0;   // no score column in the schema
        p.answers   = std::move(answers);
        p.version   = _txt(row["version"]);
        return p;
    }

    // Build a questionnaire item node (and its children/options) recursively.
    nlohmann::json _build_item(pqxx::work& txn, long item_id,
                               const std::unordered_map<long, std::vector<long>>& children,
                               const std::unordered_map<long, nlohmann::json>& nodes) const
    {
        nlohmann::json node = nodes.at(item_id);

        const auto opt = txn.exec_params(
            "SELECT value, label FROM questionnaire_item_options "
            "WHERE questionnaire_item_id = $1 ORDER BY sort_order, id", item_id);
        if (!opt.empty())
        {
            nlohmann::json options = nlohmann::json::array();
            for (const auto& o : opt)
                options.push_back({ {"value", o["value"].as<std::string>()},
                                    {"label", o["label"].as<std::string>()} });
            node["options"] = std::move(options);
        }

        nlohmann::json kids = nlohmann::json::array();
        const auto it = children.find(item_id);
        if (it != children.end())
            for (const long child_id : it->second)
                kids.push_back(_build_item(txn, child_id, children, nodes));
        node["items"] = std::move(kids);

        return node;
    }

    // Insert one questionnaire item node and recurse into its options/children.
    void _insert_item(pqxx::work& txn, long cfg, std::optional<long> parent_id,
                      const nlohmann::json& node, int depth, int sort_order) const
    {
        std::string key = node.value("id", node.value("key", std::string{}));
        if (key.empty()) key = generate_uuid4();

        const std::string label = node.value("label", "");
        const std::string desc  = node.value("description", "");
        const std::string type  = _norm_type(node.value("type", "text"));

        const auto r = txn.exec_params(
            "INSERT INTO questionnaire_items "
            "  (questionnaire_config_id, parent_id, item_key, label, description, type, depth, sort_order) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
            cfg, parent_id, key, label, desc, type, depth, sort_order);
        const long item_id = r[0][0].as<long>();

        if (node.contains("options") && node.at("options").is_array())
        {
            int os = 0;
            for (const auto& o : node.at("options"))
                txn.exec_params(
                    "INSERT INTO questionnaire_item_options "
                    "  (questionnaire_item_id, value, label, sort_order) VALUES ($1, $2, $3, $4)",
                    item_id, o.value("value", ""), o.value("label", ""), os++);
        }

        if (node.contains("items") && node.at("items").is_array())
        {
            int cs = 0;
            for (const auto& child : node.at("items"))
                _insert_item(txn, cfg, item_id, child, depth + 1, cs++);
        }
    }

    // Upsert one questionnaire item node (avoiding key conflict) and recurse into its options/children.
    void _upsert_item(pqxx::work& txn, long cfg, std::optional<long> parent_id,
                      const nlohmann::json& node, int depth, int sort_order,
                      const std::unordered_map<std::string, long>& existing_keys,
                      std::vector<long>& processed_ids) const
    {
        std::string key = node.value("id", node.value("key", std::string{}));
        if (key.empty()) key = generate_uuid4();

        const std::string label = node.value("label", "");
        const std::string desc  = node.value("description", "");
        const std::string type  = _norm_type(node.value("type", "text"));

        long item_id = 0;
        auto it = existing_keys.find(key);
        if (it != existing_keys.end())
        {
            item_id = it->second;
            // Update the existing item
            txn.exec_params(
                "UPDATE questionnaire_items SET "
                "  parent_id = $1, label = $2, description = $3, type = $4, depth = $5, sort_order = $6 "
                "WHERE id = $7",
                parent_id, label, desc, type, depth, sort_order, item_id);

            // Re-create options: delete first, then insert new ones
            txn.exec_params(
                "DELETE FROM questionnaire_item_options WHERE questionnaire_item_id = $1",
                item_id);
        }
        else
        {
            // Insert new item
            const auto r = txn.exec_params(
                "INSERT INTO questionnaire_items "
                "  (questionnaire_config_id, parent_id, item_key, label, description, type, depth, sort_order) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
                cfg, parent_id, key, label, desc, type, depth, sort_order);
            item_id = r[0][0].as<long>();
        }

        processed_ids.push_back(item_id);

        if (node.contains("options") && node.at("options").is_array())
        {
            int os = 0;
            for (const auto& o : node.at("options"))
                txn.exec_params(
                    "INSERT INTO questionnaire_item_options "
                    "  (questionnaire_item_id, value, label, sort_order) VALUES ($1, $2, $3, $4)",
                    item_id, o.value("value", ""), o.value("label", ""), os++);
        }

        if (node.contains("items") && node.at("items").is_array())
        {
            int cs = 0;
            for (const auto& child : node.at("items"))
                _upsert_item(txn, cfg, item_id, child, depth + 1, cs++, existing_keys, processed_ids);
        }
    }

public:

    explicit Store(Db& db) : _db(db) {}

    // =========================================================================
    // Users  (username <-> app_users.email)
    // =========================================================================

    _MV_NODISCARD std::optional<User> find_user_by_username(const std::string& username) const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params(
            "SELECT id, email, password_hash, role FROM app_users WHERE email = $1 LIMIT 1",
            username);
        txn.commit();
        if (r.empty()) return std::nullopt;
        return User{ r[0]["id"].as<std::string>(), r[0]["email"].as<std::string>(),
                     r[0]["password_hash"].as<std::string>(), r[0]["role"].as<std::string>() };
    }

    _MV_NODISCARD std::optional<User> find_user_by_id(const std::string& id) const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params(
            "SELECT id, email, password_hash, role FROM app_users WHERE id = $1 LIMIT 1",
            _to_long(id));
        txn.commit();
        if (r.empty()) return std::nullopt;
        return User{ r[0]["id"].as<std::string>(), r[0]["email"].as<std::string>(),
                     r[0]["password_hash"].as<std::string>(), r[0]["role"].as<std::string>() };
    }

    User create_user(const std::string& username, const std::string& password_hash,
                     const std::string& role = "user")
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params(
            "INSERT INTO app_users (name, email, password_hash, role) "
            "VALUES ($1, $2, $3, $4) RETURNING id",
            username, username, password_hash, role);
        txn.commit();
        return User{ r[0]["id"].as<std::string>(), username, password_hash, role };
    }

    _MV_NODISCARD std::vector<User> find_all_users() const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec(
            "SELECT id, email, password_hash, role FROM app_users ORDER BY id");
        std::vector<User> out;
        out.reserve(r.size());
        for (const auto& row : r)
            out.push_back(User{ row["id"].as<std::string>(), row["email"].as<std::string>(),
                                 row["password_hash"].as<std::string>(), row["role"].as<std::string>() });
        txn.commit();
        return out;
    }

    bool remove_user(const std::string& id)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params("DELETE FROM app_users WHERE id = $1", _to_long(id));
        txn.commit();
        return r.affected_rows() > 0;
    }

    // =========================================================================
    // Pipelines
    // =========================================================================

    _MV_NODISCARD std::vector<Pipeline> find_pipelines(const std::string& user_id) const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params(
            "SELECT p.id, p.created_by_user_id, p.name, p.project_name, p.repository_url, "
            "       p.current_maturity_level, p.created_at, qc.version "
            "FROM pipelines p "
            "LEFT JOIN questionnaire_configs qc ON qc.id = p.questionnaire_config_id "
            "WHERE p.created_by_user_id = $1 ORDER BY p.id",
            _to_long(user_id));

        std::vector<Pipeline> out;
        out.reserve(r.size());
        for (const auto& row : r)
            out.push_back(_row_to_pipeline(row, _load_answers(txn, row["id"].as<std::string>())));
        txn.commit();
        return out;
    }

    _MV_NODISCARD std::vector<Pipeline> find_all_pipelines() const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec(
            "SELECT p.id, p.created_by_user_id, p.name, p.project_name, p.repository_url, "
            "       p.current_maturity_level, p.created_at, qc.version "
            "FROM pipelines p "
            "LEFT JOIN questionnaire_configs qc ON qc.id = p.questionnaire_config_id "
            "ORDER BY p.id");

        std::vector<Pipeline> out;
        out.reserve(r.size());
        for (const auto& row : r)
            out.push_back(_row_to_pipeline(row, _load_answers(txn, row["id"].as<std::string>())));
        txn.commit();
        return out;
    }

    _MV_NODISCARD std::optional<Pipeline> find_pipeline_by_id(const std::string& id) const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params(
            "SELECT p.id, p.created_by_user_id, p.name, p.project_name, p.repository_url, "
            "       p.current_maturity_level, p.created_at, qc.version "
            "FROM pipelines p "
            "LEFT JOIN questionnaire_configs qc ON qc.id = p.questionnaire_config_id "
            "WHERE p.id = $1 LIMIT 1",
            _to_long(id));
        if (r.empty()) { txn.commit(); return std::nullopt; }
        Pipeline p = _row_to_pipeline(r[0], _load_answers(txn, r[0]["id"].as<std::string>()));
        txn.commit();
        return p;
    }

    Pipeline create_pipeline(Pipeline p)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const long cfg = _config_id_by_version(txn, p.version);

        std::optional<long> owner;
        if (!p.user_id.empty()) owner = _to_long(p.user_id);

        const auto r = txn.exec_params(
            "INSERT INTO pipelines "
            "  (questionnaire_config_id, name, project_name, repository_url, "
            "   current_maturity_level, created_by_user_id) "
            "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at",
            cfg, p.name, p.repo_id, p.repo_link, p.level, owner);

        p.id   = r[0]["id"].as<std::string>();
        p.date = r[0]["created_at"].as<std::string>().substr(0, 10);

        _save_answers(txn, p.id, cfg, p.answers);
        txn.commit();
        return p;
    }

    _MV_NODISCARD std::optional<Pipeline> update_pipeline(const std::string& id, const Pipeline& fields)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        const auto exists = txn.exec_params(
            "SELECT questionnaire_config_id FROM pipelines WHERE id = $1 LIMIT 1", _to_long(id));
        if (exists.empty()) { txn.commit(); return std::nullopt; }
        long cfg = exists[0][0].as<long>();
        if (!fields.version.empty()) {
            cfg = _config_id_by_version(txn, fields.version);
        }

        // Patch only provided string fields; always set level/answers/config.
        txn.exec_params(
            "UPDATE pipelines SET "
            "  name           = COALESCE(NULLIF($2, ''), name), "
            "  project_name   = COALESCE(NULLIF($3, ''), project_name), "
            "  repository_url = COALESCE(NULLIF($4, ''), repository_url), "
            "  current_maturity_level = $5, "
            "  questionnaire_config_id = $6 "
            "WHERE id = $1",
            _to_long(id), fields.name, fields.repo_id, fields.repo_link, fields.level, cfg);

        _save_answers(txn, id, cfg, fields.answers);

        const auto r = txn.exec_params(
            "SELECT p.id, p.created_by_user_id, p.name, p.project_name, p.repository_url, "
            "       p.current_maturity_level, p.created_at, qc.version "
            "FROM pipelines p "
            "LEFT JOIN questionnaire_configs qc ON qc.id = p.questionnaire_config_id "
            "WHERE p.id = $1",
            _to_long(id));
        Pipeline p = _row_to_pipeline(r[0], _load_answers(txn, id));
        txn.commit();
        return p;
    }

    bool remove_pipeline(const std::string& id)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params("DELETE FROM pipelines WHERE id = $1", _to_long(id));
        txn.commit();
        return r.affected_rows() > 0;
    }

    // =========================================================================
    // Categories  (depth-1 questionnaire_items) and their items (depth-2)
    // =========================================================================

    _MV_NODISCARD std::vector<Category> find_all_categories() const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const long cfg = _active_config_id(txn);

        const auto cats = txn.exec_params(
            "SELECT id, label FROM questionnaire_items "
            "WHERE questionnaire_config_id = $1 AND depth = 1 ORDER BY sort_order, id", cfg);

        std::vector<Category> out;
        out.reserve(cats.size());
        for (const auto& c : cats)
        {
            Category cat;
            cat.id    = c["id"].as<std::string>();
            cat.title = c["label"].as<std::string>();

            const auto items = txn.exec_params(
                "SELECT item_key, label, type, description FROM questionnaire_items "
                "WHERE parent_id = $1 ORDER BY sort_order, id", c["id"].as<long>());
            for (const auto& i : items)
                cat.items.push_back(QuestionItem{ _txt(i["item_key"]),
                                                  _txt(i["label"]), _txt(i["type"]),
                                                  _txt(i["description"]) });
            out.push_back(std::move(cat));
        }
        txn.commit();
        return out;
    }

    _MV_NODISCARD std::optional<Category> find_category_by_id(const std::string& id) const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto c = txn.exec_params(
            "SELECT id, label FROM questionnaire_items WHERE (id = $1 OR item_key = $2) AND depth = 1 LIMIT 1",
            _to_long(id), id);
        if (c.empty()) { txn.commit(); return std::nullopt; }

        const long actual_cat_id = c[0]["id"].as<long>();

        Category cat;
        cat.id    = c[0]["id"].as<std::string>();
        cat.title = c[0]["label"].as<std::string>();
        const auto items = txn.exec_params(
            "SELECT item_key, label, type, description FROM questionnaire_items "
            "WHERE parent_id = $1 ORDER BY sort_order, id", actual_cat_id);
        for (const auto& i : items)
            cat.items.push_back(QuestionItem{ _txt(i["item_key"]),
                                              _txt(i["label"]), _txt(i["type"]),
                                              _txt(i["description"]) });
        txn.commit();
        return cat;
    }

    Category create_category(const std::string& title,
                             const std::vector<QuestionItem>& items = {})
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const long cfg = _active_config_id(txn);

        const auto so = txn.exec_params(
            "SELECT COALESCE(MAX(sort_order) + 1, 0) FROM questionnaire_items "
            "WHERE questionnaire_config_id = $1 AND depth = 1", cfg);
        const int sort_order = so[0][0].as<int>();

        const auto r = txn.exec_params(
            "INSERT INTO questionnaire_items "
            "  (questionnaire_config_id, parent_id, item_key, label, description, type, depth, sort_order) "
            "VALUES ($1, NULL, $2, $3, '', 'text', 1, $4) RETURNING id",
            cfg, generate_uuid4(), title, sort_order);

        Category cat;
        cat.id    = r[0][0].as<std::string>();
        cat.title = title;

        int cs = 0;
        for (const auto& item : items)
        {
            const std::string key = item.id.empty() ? generate_uuid4() : item.id;
            const auto ir = txn.exec_params(
                "INSERT INTO questionnaire_items "
                "  (questionnaire_config_id, parent_id, item_key, label, description, type, depth, sort_order) "
                "VALUES ($1, $2, $3, $4, $5, $6, 2, $7) RETURNING id",
                cfg, _to_long(cat.id), key, item.label, item.description,
                _norm_type(item.type), cs++);
            cat.items.push_back(QuestionItem{ key,
                                              item.label, _norm_type(item.type), item.description });
        }
        txn.commit();
        return cat;
    }

    _MV_NODISCARD std::optional<Category> update_category(const std::string& id,
                                                          const std::string& title)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params(
            "UPDATE questionnaire_items SET label = COALESCE(NULLIF($3, ''), label) "
            "WHERE (id = $1 OR item_key = $2) AND depth = 1 RETURNING id, label",
            _to_long(id), id, title);
        if (r.empty()) { txn.commit(); return std::nullopt; }

        const long actual_cat_id = r[0]["id"].as<long>();

        Category cat;
        cat.id    = r[0]["id"].as<std::string>();
        cat.title = r[0]["label"].as<std::string>();
        const auto items = txn.exec_params(
            "SELECT item_key, label, type, description FROM questionnaire_items "
            "WHERE parent_id = $1 ORDER BY sort_order, id", actual_cat_id);
        for (const auto& i : items)
            cat.items.push_back(QuestionItem{ _txt(i["item_key"]),
                                              _txt(i["label"]), _txt(i["type"]),
                                              _txt(i["description"]) });
        txn.commit();
        return cat;
    }

    bool remove_category(const std::string& id)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params(
            "DELETE FROM questionnaire_items WHERE (id = $1 OR item_key = $2) AND depth = 1",
            _to_long(id), id);
        txn.commit();
        return r.affected_rows() > 0;
    }

    // -------------------------------------------------------------------------
    // Category item sub-operations
    // -------------------------------------------------------------------------

    _MV_NODISCARD std::optional<QuestionItem> add_category_item(const std::string& cat_id,
                                                                const std::string& label,
                                                                const std::string& type,
                                                                const std::string& description = "")
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        const auto cat = txn.exec_params(
            "SELECT id, questionnaire_config_id FROM questionnaire_items "
            "WHERE (id = $1 OR item_key = $2) AND depth = 1 LIMIT 1",
            _to_long(cat_id), cat_id);
        if (cat.empty()) { txn.commit(); return std::nullopt; }
        const long actual_cat_id = cat[0]["id"].as<long>();
        const long cfg = cat[0]["questionnaire_config_id"].as<long>();

        const auto so = txn.exec_params(
            "SELECT COALESCE(MAX(sort_order) + 1, 0) FROM questionnaire_items WHERE parent_id = $1",
            actual_cat_id);

        const auto r = txn.exec_params(
            "INSERT INTO questionnaire_items "
            "  (questionnaire_config_id, parent_id, item_key, label, description, type, depth, sort_order) "
            "VALUES ($1, $2, $3, $4, $5, $6, 2, $7) RETURNING id, item_key",
            cfg, actual_cat_id, generate_uuid4(), label, description,
            _norm_type(type), so[0][0].as<int>());
        txn.commit();
        return QuestionItem{ r[0]["item_key"].as<std::string>(), label, _norm_type(type), description };
    }

    _MV_NODISCARD std::optional<QuestionItem>
    update_category_item(const std::string& cat_id, const std::string& item_id,
                         const std::string& label, const std::string& type,
                         const std::string& description)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        // Find parent category actual ID
        const auto cat = txn.exec_params(
            "SELECT id FROM questionnaire_items WHERE (id = $1 OR item_key = $2) AND depth = 1 LIMIT 1",
            _to_long(cat_id), cat_id);
        if (cat.empty()) { txn.commit(); return std::nullopt; }
        const long actual_cat_id = cat[0]["id"].as<long>();

        const auto r = txn.exec_params(
            "UPDATE questionnaire_items SET "
            "  label       = COALESCE(NULLIF($4, ''), label), "
            "  type        = COALESCE(NULLIF($5, ''), type), "
            "  description = COALESCE(NULLIF($6, ''), description) "
            "WHERE (id = $2 OR item_key = $3) AND parent_id = $1 RETURNING id, item_key, label, type, description",
            actual_cat_id, _to_long(item_id), item_id,
            label,
            type.empty() ? std::string{} : _norm_type(type),
            description);
        if (r.empty()) { txn.commit(); return std::nullopt; }
        QuestionItem item{ r[0]["item_key"].as<std::string>(), _txt(r[0]["label"]),
                           _txt(r[0]["type"]), _txt(r[0]["description"]) };
        txn.commit();
        return item;
    }

    bool remove_category_item(const std::string& cat_id, const std::string& item_id)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        // Find parent category actual ID
        const auto cat = txn.exec_params(
            "SELECT id FROM questionnaire_items WHERE (id = $1 OR item_key = $2) AND depth = 1 LIMIT 1",
            _to_long(cat_id), cat_id);
        if (cat.empty()) { txn.commit(); return false; }
        const long actual_cat_id = cat[0]["id"].as<long>();

        const auto r = txn.exec_params(
            "DELETE FROM questionnaire_items WHERE (id = $2 OR item_key = $3) AND parent_id = $1",
            actual_cat_id, _to_long(item_id), item_id);
        txn.commit();
        return r.affected_rows() > 0;
    }

    // =========================================================================
    // Maturity rules  (maturity_levels; min_score derived, see header note)
    // =========================================================================

    _MV_NODISCARD std::vector<MaturityRule> find_all_rules() const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const long cfg = _active_config_id(txn);
        const auto r = txn.exec_params(
            "SELECT level_number, name, description FROM maturity_levels "
            "WHERE questionnaire_config_id = $1 ORDER BY level_number", cfg);

        std::vector<MaturityRule> out;
        out.reserve(r.size());
        for (const auto& row : r)
        {
            const int level = row["level_number"].as<int>();
            const int min_score = std::min(100, (level - 1) * 25);  // derived
            out.push_back(MaturityRule{ level, _txt(row["name"]),
                                        _txt(row["description"]), min_score });
        }
        txn.commit();
        return out;
    }

    _MV_NODISCARD std::optional<MaturityRule>
    update_rule(int level, const std::string& name,
                const std::string& description, int /*min_score — no column*/)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const long cfg = _active_config_id(txn);
        const auto r = txn.exec_params(
            "UPDATE maturity_levels SET name = $3, description = $4 "
            "WHERE questionnaire_config_id = $1 AND level_number = $2 "
            "RETURNING level_number, name, description",
            cfg, level, name, description);
        if (r.empty()) { txn.commit(); return std::nullopt; }
        const int lvl = r[0]["level_number"].as<int>();
        MaturityRule rule{ lvl, _txt(r[0]["name"]), _txt(r[0]["description"]),
                           std::min(100, (lvl - 1) * 25) };
        txn.commit();
        return rule;
    }

    // =========================================================================
    // Questionnaire  (configs + hierarchical items + options)
    // =========================================================================

    _MV_NODISCARD nlohmann::json get_questionnaire() const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        const auto cfg = txn.exec(
            "SELECT id, version, title, description FROM questionnaire_configs "
            "ORDER BY is_active DESC, id ASC LIMIT 1");
        if (cfg.empty())
        {
            txn.commit();
            return { {"version", "1.0"},
                     {"title", "CI/CD Pipeline Maturity Assessment"},
                     {"description", ""},
                     {"sections", nlohmann::json::array()} };
        }

        const long cfg_id = cfg[0]["id"].as<long>();

        // Pull every item for the config, then assemble the tree in memory.
        const auto rows = txn.exec_params(
            "SELECT id, parent_id, item_key, label, description, type, depth, sort_order "
            "FROM questionnaire_items WHERE questionnaire_config_id = $1 "
            "ORDER BY depth, sort_order, id", cfg_id);

        std::unordered_map<long, nlohmann::json>      nodes;
        std::unordered_map<long, std::vector<long>>   children;
        std::vector<long>                             roots;

        for (const auto& row : rows)
        {
            const long id = row["id"].as<long>();
            nodes[id] = { {"id",          row["item_key"].as<std::string>()},
                          {"label",       _txt(row["label"])},
                          {"description", _txt(row["description"])},
                          {"type",        _txt(row["type"])} };
            if (row["parent_id"].is_null())
                roots.push_back(id);
            else
                children[row["parent_id"].as<long>()].push_back(id);
        }

        nlohmann::json sections = nlohmann::json::array();
        for (const long root : roots)
            sections.push_back(_build_item(txn, root, children, nodes));

        nlohmann::json out = { {"version",     _txt(cfg[0]["version"])},
                               {"title",       _txt(cfg[0]["title"])},
                               {"description", _txt(cfg[0]["description"])},
                               {"sections",    std::move(sections)} };
        txn.commit();
        return out;
    }

    void set_questionnaire(const nlohmann::json& q)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const long cfg = _active_config_id(txn);

        txn.exec_params(
            "UPDATE questionnaire_configs SET "
            "  version     = COALESCE(NULLIF($2, ''), version), "
            "  title       = COALESCE(NULLIF($3, ''), title), "
            "  description = $4 "
            "WHERE id = $1",
            cfg, q.value("version", ""), q.value("title", ""), q.value("description", ""));

        // Fetch existing items for this configuration
        const auto rows = txn.exec_params(
            "SELECT id, item_key FROM questionnaire_items WHERE questionnaire_config_id = $1", cfg);
        std::unordered_map<std::string, long> existing_keys;
        for (const auto& row : rows)
        {
            existing_keys[row["item_key"].as<std::string>()] = row["id"].as<long>();
        }

        std::vector<long> processed_ids;
        if (q.contains("sections") && q.at("sections").is_array())
        {
            int s = 0;
            for (const auto& section : q.at("sections"))
                _upsert_item(txn, cfg, std::nullopt, section, 1, s++, existing_keys, processed_ids);
        }

        // Clean up any items that were not updated/processed
        for (const auto& pair : existing_keys)
        {
            if (std::find(processed_ids.begin(), processed_ids.end(), pair.second) == processed_ids.end())
            {
                txn.exec_params("DELETE FROM questionnaire_items WHERE id = $1", pair.second);
            }
        }
        txn.commit();
    }

    void import_questionnaire_version(const nlohmann::json& q)
    {
        const std::string version = _json_str(q, "version", "");
        if (version.empty()) return;

        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        // Find or create the configuration by version
        long cfg_id = 0;
        const auto exists = txn.exec_params(
            "SELECT id FROM questionnaire_configs WHERE version = $1 LIMIT 1", version);
        if (!exists.empty())
        {
            cfg_id = exists[0][0].as<long>();
            txn.exec_params(
                "UPDATE questionnaire_configs SET title = $2, description = $3 "
                "WHERE id = $1",
                cfg_id, q.value("title", ""), q.value("description", ""));
        }
        else
        {
            const auto ins = txn.exec_params(
                "INSERT INTO questionnaire_configs (version, title, description, is_active) "
                "VALUES ($1, $2, $3, TRUE) RETURNING id",
                version, q.value("title", ""), q.value("description", ""));
            cfg_id = ins[0][0].as<long>();
        }

        // Fetch existing items for this configuration
        const auto rows = txn.exec_params(
            "SELECT id, item_key FROM questionnaire_items WHERE questionnaire_config_id = $1", cfg_id);
        std::unordered_map<std::string, long> existing_keys;
        for (const auto& row : rows)
        {
            existing_keys[row["item_key"].as<std::string>()] = row["id"].as<long>();
        }

        std::vector<long> processed_ids;
        if (q.contains("sections") && q.at("sections").is_array())
        {
            int s = 0;
            for (const auto& section : q.at("sections"))
                _upsert_item(txn, cfg_id, std::nullopt, section, 1, s++, existing_keys, processed_ids);
        }

        // Clean up any items that were not updated/processed
        for (const auto& pair : existing_keys)
        {
            if (std::find(processed_ids.begin(), processed_ids.end(), pair.second) == processed_ids.end())
            {
                txn.exec_params("DELETE FROM questionnaire_items WHERE id = $1", pair.second);
            }
        }
        txn.commit();
    }

    _MV_NODISCARD std::vector<nlohmann::json> get_all_questionnaire_versions() const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        const auto cfgs = txn.exec(
            "SELECT id, version, title, description FROM questionnaire_configs "
            "ORDER BY version ASC, id ASC");

        std::vector<nlohmann::json> out;
        for (const auto& cfg : cfgs)
        {
            const long cfg_id = cfg["id"].as<long>();
            const auto rows = txn.exec_params(
                "SELECT id, parent_id, item_key, label, description, type, depth, sort_order "
                "FROM questionnaire_items WHERE questionnaire_config_id = $1 "
                "ORDER BY depth, sort_order, id", cfg_id);

            std::unordered_map<long, nlohmann::json>      nodes;
            std::unordered_map<long, std::vector<long>>   children;
            std::vector<long>                             roots;

            for (const auto& row : rows)
            {
                const long id = row["id"].as<long>();
                nodes[id] = { {"id",          row["item_key"].as<std::string>()},
                              {"label",       _txt(row["label"])},
                              {"description", _txt(row["description"])},
                              {"type",        _txt(row["type"])} };
                if (row["parent_id"].is_null())
                    roots.push_back(id);
                else
                    children[row["parent_id"].as<long>()].push_back(id);
            }

            nlohmann::json sections = nlohmann::json::array();
            for (const long root : roots)
                sections.push_back(_build_item(txn, root, children, nodes));

            out.push_back({
                {"version",     _txt(cfg["version"])},
                {"title",       _txt(cfg["title"])},
                {"description", _txt(cfg["description"])},
                {"sections",    std::move(sections)}
            });
        }
        txn.commit();
        return out;
    }

    _MV_NODISCARD std::vector<nlohmann::json> get_all_rules_versions() const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        const auto rows = txn.exec(
            "SELECT version, title, description, levels FROM rules_configs "
            "ORDER BY version ASC");

        std::vector<nlohmann::json> out;
        for (const auto& row : rows)
        {
            out.push_back({
                {"version",     _txt(row["version"])},
                {"title",       _txt(row["title"])},
                {"description", _txt(row["description"])},
                {"levels",      nlohmann::json::parse(_txt(row["levels"]))}
            });
        }
        txn.commit();
        return out;
    }

    _MV_NODISCARD std::optional<nlohmann::json> get_rules_by_version(const std::string& version) const
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        const auto rows = txn.exec_params(
            "SELECT version, title, description, levels FROM rules_configs "
            "WHERE version = $1 LIMIT 1", version);

        if (rows.empty())
        {
            txn.commit();
            return std::nullopt;
        }

        nlohmann::json out = {
            {"version",     _txt(rows[0]["version"])},
            {"title",       _txt(rows[0]["title"])},
            {"description", _txt(rows[0]["description"])},
            {"levels",      nlohmann::json::parse(_txt(rows[0]["levels"]))}
        };
        txn.commit();
        return out;
    }

    void save_rules_version(const nlohmann::json& r)
    {
        const std::string version = _json_str(r, "version", "");
        if (version.empty()) return;

        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        txn.exec_params(
            "INSERT INTO rules_configs (version, title, description, levels) "
            "VALUES ($1, $2, $3, $4) "
            "ON CONFLICT (version) DO UPDATE SET "
            "  title = EXCLUDED.title, "
            "  description = EXCLUDED.description, "
            "  levels = EXCLUDED.levels, "
            "  updated_at = CURRENT_TIMESTAMP",
            version,
            r.value("title", ""),
            r.value("description", ""),
            r.value("levels", nlohmann::json::array()).dump()
        );
        txn.commit();
    }

    bool delete_questionnaire_version(const std::string& version)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);

        // Find config id
        const auto r = txn.exec_params(
            "SELECT id FROM questionnaire_configs WHERE version = $1 LIMIT 1", version);
        if (r.empty()) { txn.commit(); return false; }

        const long cfg_id = r[0][0].as<long>();

        try
        {
            txn.exec_params("DELETE FROM questionnaire_configs WHERE id = $1", cfg_id);
            txn.commit();
            return true;
        }
        catch (const std::exception& e)
        {
            throw std::runtime_error("Tega vprašalnika ni mogoče izbrisati, ker ga uporabljajo obstoječi cevovodi.");
        }
    }

    bool delete_rules_version(const std::string& version)
    {
        auto conn = _db.acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec_params(
            "DELETE FROM rules_configs WHERE version = $1", version);
        txn.commit();
        return r.affected_rows() > 0;
    }

}; // class Store


} // namespace v1
} // namespace cicdq

#endif // CICDQ_STORE_HPP
