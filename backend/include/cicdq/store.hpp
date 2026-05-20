#ifndef CICDQ_STORE_HPP
#define CICDQ_STORE_HPP

// =============================================================================
// In-memory store
//
// All public methods are thread-safe via a shared_mutex:
//   - reads  → shared_lock   (concurrent reads allowed)
//   - writes → unique_lock   (exclusive)
// =============================================================================

#include <algorithm>
#include <chrono>
#include <mutex>
#include <optional>
#include <shared_mutex>
#include <string>
#include <vector>

#include "crypto.hpp"
#include "types.hpp"


namespace cicdq
{
inline namespace v1
{


class Store
{
    // =========================================================================
    // Private data
    // =========================================================================

    mutable std::shared_mutex _mutex;

    std::vector<User>         _users;
    std::vector<Pipeline>     _pipelines;
    std::vector<Category>     _categories;
    std::vector<MaturityRule> _rules;
    nlohmann::json            _questionnaire;  // full uploaded questionnaire blob

    // =========================================================================
    // Private helpers
    // =========================================================================

    static std::string _s_today() noexcept
    {
        const auto now = std::chrono::system_clock::now();
        const auto t   = std::chrono::system_clock::to_time_t(now);
        char buf[11]{};
        std::strftime(buf, sizeof(buf), "%Y-%m-%d", std::gmtime(&t));
        return buf;
    }

    void _m_seed_users()
    {
        User admin;
        admin.id            = generate_uuid4();
        admin.username      = "admin";
        admin.password_hash = hash_password("password");
        admin.role          = "admin";
        _users.push_back(std::move(admin));
    }

    void _m_seed_categories()
    {
        _categories = {
            {
                "cat_build", "Build", {
                    { "b_manual",       "Manual trigger",                                       "yes_no_na", "Ali je cevovod mogoče sprožiti ročno prek uporabniškega vmesnika?" },
                    { "b_triggers",     "Other triggers (Push, PR, Sched, API)",                "text",      "Naštejte ostale načine proženja."                                  },
                    { "b_dedicated",    "Uses dedicated build server (outside GitHub runner)",  "yes_no_na", "Ali za gradnjo uporabljate lastne/dedicirane strežnike?"            },
                    { "b_logging",      "Explicit build logging",                               "yes_no_na", "Ali so logi gradnje podrobno beleženi in dostopni?"                },
                    { "b_cache",        "Dependency caching",                                   "yes_no_na", "Ali se pri gradnji uporablja predpomnjenje odvisnosti?"            },
                    { "b_artifacts",    "Build artifacts are stored",                           "yes_no_na", "Ali se zgrajeni paketi/artefakti varno shranijo?"                  },
                    { "b_versioning",   "Automatic artifact versioning",                        "yes_no_na", ""                                                                  },
                    { "b_notification", "Build success/failure notification",                   "yes_no_na", ""                                                                  },
                    { "b_report",       "Build report creation",                                "yes_no_na", ""                                                                  },
                    { "b_concurrency",  "Concurrency (multiple builds simultaneously)",         "yes_no_na", ""                                                                  },
                    { "b_standardized", "Build process is standardized for all environments",  "yes_no_na", ""                                                                  },
                    { "b_only_changed", "Build only changed components",                        "yes_no_na", ""                                                                  },
                    { "b_other",        "Other features",                                       "text",      ""                                                                  },
                }
            },
            {
                "cat_unit_testing", "Unit Testing", {
                    { "ut_manual",       "Manual trigger",                             "yes_no_na", "" },
                    { "ut_triggers",     "Other triggers",                             "text",      "" },
                    { "ut_dedicated",    "Uses dedicated test server",                 "yes_no_na", "" },
                    { "ut_new_build",    "Requires new build to run",                  "yes_no_na", "" },
                    { "ut_logging",      "Explicit test logging",                      "yes_no_na", "" },
                    { "ut_report",       "Test report creation",                       "yes_no_na", "" },
                    { "ut_artifacts",    "Test artifacts are stored",                  "yes_no_na", "" },
                    { "ut_notification", "Test success/failure notification",          "yes_no_na", "" },
                    { "ut_terminate",    "Pipeline terminates if tests fail",          "yes_no_na", "" },
                    { "ut_issue",        "Automatic issue creation on test failure",   "yes_no_na", "" },
                }
            },
            {
                "cat_analysis", "Analysis (SonarQube, Linting...)", {
                    { "an_manual",     "Manual trigger",                                         "yes_no_na", "" },
                    { "an_depends",    "Depends on (Build, Test...)",                            "text",      "" },
                    { "an_static",     "Includes static code analysis",                         "yes_no_na", "" },
                    { "an_gate_fail",  "Pipeline terminates if quality gate fails",             "yes_no_na", "" },
                    { "an_security",   "Includes security analysis",                            "yes_no_na", "" },
                    { "an_vuln",       "Includes dependency vulnerability check",               "yes_no_na", "" },
                    { "an_report",     "Analysis report creation",                              "yes_no_na", "" },
                    { "an_license",    "Includes license check",                                "yes_no_na", "" },
                    { "an_compliance", "Includes standards / regulations compliance check",     "yes_no_na", "" },
                    { "an_linting",    "Includes linting",                                      "yes_no_na", "" },
                    { "an_pr_review",  "Automated PR review",                                   "yes_no_na", "" },
                    { "an_gate_notif", "Quality / security gate success/failure notification",  "yes_no_na", "" },
                    { "an_artifacts",  "Analysis results/artifacts are stored",                 "yes_no_na", "" },
                }
            },
            {
                "cat_deploy", "Deploy", {
                    { "dp_manual",        "Manual trigger",                                       "yes_no_na", "" },
                    { "dp_depends",       "Depends on",                                          "text",      "" },
                    { "dp_logging",       "Explicit deploy logging",                             "yes_no_na", "" },
                    { "dp_test",          "Test deploy",                                         "yes_no_na", "" },
                    { "dp_staging",       "Staging deploy",                                      "yes_no_na", "" },
                    { "dp_prod",          "Production deploy",                                   "yes_no_na", "" },
                    { "dp_standardized",  "Deploy process is standardized for all environments", "yes_no_na", "" },
                    { "dp_check",         "Deploy success check",                                "yes_no_na", "" },
                    { "dp_rollback",      "Automated rollback",                                  "yes_no_na", "" },
                    { "dp_infra",         "Infrastructure provisioning",                         "yes_no_na", "" },
                    { "dp_db",            "Automated database migration / preparation",          "yes_no_na", "" },
                    { "dp_zero_downtime", "Zero-downtime deploy",                                "yes_no_na", "" },
                }
            },
        };
    }

    void _m_seed_rules()
    {
        _rules = {
            { 1, "Začetna",                  "Ad-hoc procesi.",                                               0  },
            { 2, "Upravljana",               "Osnovna gradnja in ročni testi.",                              25 },
            { 3, "Definirana",               "Avtomatizirano testiranje in analiza.",                        50 },
            { 4, "Kvantitativno upravljana", "Uveljavljena kakovostna vrata, avtomatizirano testno okolje.", 75 },
            { 5, "Optimizacijska",           "Brez izpadov, samodejna povrnitev, močna varnost.",           90 },
        };
    }

    // Seed questionnaire as an empty shell — admin must POST /api/questionnaire
    // to replace it with a full questionnaire_config.json upload.
    void _m_seed_questionnaire()
    {
        _questionnaire = {
            {"version",     "1.0"},
            {"title",       "CI/CD Pipeline Maturity Assessment"},
            {"description", ""},
            {"sections",    nlohmann::json::array()},
        };
    }

public:

    Store()
    {
        _m_seed_users();
        _m_seed_categories();
        _m_seed_rules();
        _m_seed_questionnaire();
    }

    // =========================================================================
    // Users
    // =========================================================================

    _MV_NODISCARD std::optional<User> find_user_by_username(const std::string& username) const
    {
        std::shared_lock lock(_mutex);
        for (const auto& u : _users)
            if (u.username == username) return u;
        return std::nullopt;
    }

    _MV_NODISCARD std::optional<User> find_user_by_id(const std::string& id) const
    {
        std::shared_lock lock(_mutex);
        for (const auto& u : _users)
            if (u.id == id) return u;
        return std::nullopt;
    }

    User create_user(const std::string& username, const std::string& password_hash,
                     const std::string& role = "user")
    {
        std::unique_lock lock(_mutex);
        User u{ generate_uuid4(), username, password_hash, role };
        _users.push_back(u);
        return u;
    }

    // =========================================================================
    // Pipelines
    // =========================================================================

    _MV_NODISCARD std::vector<Pipeline> find_pipelines(const std::string& user_id) const
    {
        std::shared_lock lock(_mutex);
        std::vector<Pipeline> out;
        for (const auto& p : _pipelines)
            if (p.user_id == user_id) out.push_back(p);
        return out;
    }

    _MV_NODISCARD std::optional<Pipeline> find_pipeline_by_id(const std::string& id) const
    {
        std::shared_lock lock(_mutex);
        for (const auto& p : _pipelines)
            if (p.id == id) return p;
        return std::nullopt;
    }

    Pipeline create_pipeline(Pipeline p)
    {
        std::unique_lock lock(_mutex);
        p.id   = generate_uuid4();
        if (p.date.empty()) p.date = _s_today();
        _pipelines.push_back(p);
        return p;
    }

    _MV_NODISCARD std::optional<Pipeline> update_pipeline(const std::string& id, const Pipeline& fields)
    {
        std::unique_lock lock(_mutex);
        for (auto& p : _pipelines)
        {
            if (p.id != id) continue;
            // Patch only provided fields; keep id and user_id
            if (!fields.name.empty())      p.name      = fields.name;
            if (!fields.repo_id.empty())   p.repo_id   = fields.repo_id;
            if (!fields.assessor.empty())  p.assessor  = fields.assessor;
            if (!fields.repo_link.empty()) p.repo_link = fields.repo_link;
            if (!fields.date.empty())      p.date      = fields.date;
            p.score   = fields.score;
            p.level   = fields.level;
            p.answers = fields.answers;
            return p;
        }
        return std::nullopt;
    }

    bool remove_pipeline(const std::string& id)
    {
        std::unique_lock lock(_mutex);
        const auto before = _pipelines.size();
        _pipelines.erase(std::remove_if(_pipelines.begin(), _pipelines.end(),
                         [&](const Pipeline& p){ return p.id == id; }),
                         _pipelines.end());
        return _pipelines.size() < before;
    }

    // =========================================================================
    // Categories
    // =========================================================================

    _MV_NODISCARD std::vector<Category> find_all_categories() const
    {
        std::shared_lock lock(_mutex);
        return _categories;
    }

    _MV_NODISCARD std::optional<Category> find_category_by_id(const std::string& id) const
    {
        std::shared_lock lock(_mutex);
        for (const auto& c : _categories)
            if (c.id == id) return c;
        return std::nullopt;
    }

    Category create_category(const std::string& title,
                             const std::vector<QuestionItem>& items = {})
    {
        std::unique_lock lock(_mutex);
        Category c{ generate_uuid4(), title, items };
        _categories.push_back(c);
        return c;
    }

    _MV_NODISCARD std::optional<Category> update_category(const std::string& id,
                                                           const std::string& title)
    {
        std::unique_lock lock(_mutex);
        for (auto& c : _categories)
        {
            if (c.id != id) continue;
            if (!title.empty()) c.title = title;
            return c;
        }
        return std::nullopt;
    }

    bool remove_category(const std::string& id)
    {
        std::unique_lock lock(_mutex);
        const auto before = _categories.size();
        _categories.erase(std::remove_if(_categories.begin(), _categories.end(),
                          [&](const Category& c){ return c.id == id; }),
                          _categories.end());
        return _categories.size() < before;
    }

    // ---------------------------------------------------------------------------
    // Category item sub-operations
    // ---------------------------------------------------------------------------

    _MV_NODISCARD std::optional<QuestionItem> add_category_item(const std::string& cat_id,
                                                                 const std::string& label,
                                                                 const std::string& type,
                                                                 const std::string& description = "")
    {
        std::unique_lock lock(_mutex);
        for (auto& c : _categories)
        {
            if (c.id != cat_id) continue;
            QuestionItem item{ generate_uuid4(), label, type, description };
            c.items.push_back(item);
            return item;
        }
        return std::nullopt;
    }

    _MV_NODISCARD std::optional<QuestionItem>
    update_category_item(const std::string& cat_id, const std::string& item_id,
                         const std::string& label,  const std::string& type,
                         const std::string& description)
    {
        std::unique_lock lock(_mutex);
        for (auto& c : _categories)
        {
            if (c.id != cat_id) continue;
            for (auto& i : c.items)
            {
                if (i.id != item_id) continue;
                if (!label.empty())       i.label       = label;
                if (!type.empty())        i.type        = type;
                if (!description.empty()) i.description = description;
                return i;
            }
        }
        return std::nullopt;
    }

    bool remove_category_item(const std::string& cat_id, const std::string& item_id)
    {
        std::unique_lock lock(_mutex);
        for (auto& c : _categories)
        {
            if (c.id != cat_id) continue;
            const auto before = c.items.size();
            c.items.erase(std::remove_if(c.items.begin(), c.items.end(),
                          [&](const QuestionItem& i){ return i.id == item_id; }),
                          c.items.end());
            return c.items.size() < before;
        }
        return false;
    }

    // =========================================================================
    // Maturity rules
    // =========================================================================

    _MV_NODISCARD std::vector<MaturityRule> find_all_rules() const
    {
        std::shared_lock lock(_mutex);
        return _rules;
    }

    _MV_NODISCARD std::optional<MaturityRule>
    update_rule(int level, const std::string& name,
                const std::string& description, int min_score)
    {
        std::unique_lock lock(_mutex);
        for (auto& r : _rules)
        {
            if (r.level != level) continue;
            r.name        = name;
            r.description = description;
            r.min_score   = min_score;
            return r;
        }
        return std::nullopt;
    }

    // =========================================================================
    // Questionnaire  (opaque JSON blob — full questionnaire_config.json format)
    // =========================================================================

    _MV_NODISCARD nlohmann::json get_questionnaire() const
    {
        std::shared_lock lock(_mutex);
        return _questionnaire;
    }

    void set_questionnaire(const nlohmann::json& q)
    {
        std::unique_lock lock(_mutex);
        _questionnaire = q;
    }

}; // class Store


} // namespace v1
} // namespace cicdq

#endif // CICDQ_STORE_HPP
