#ifndef CICDQ_TYPES_HPP
#define CICDQ_TYPES_HPP

// =============================================================================
// Domain types — plain structs with nlohmann::json (de)serialisation.
// =============================================================================

#include <map>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>


namespace cicdq
{
inline namespace v1
{


// =============================================================================
// User
// =============================================================================

struct User
{
    std::string id;
    std::string username;
    std::string password_hash;   // not serialised to JSON responses
    std::string role;            // "admin" | "user"
};

// Serialise without the password hash (safe for API responses)
inline void to_json(nlohmann::json& j, const User& u)
{
    j = nlohmann::json{ {"id", u.id}, {"username", u.username}, {"role", u.role} };
}


// =============================================================================
// Questionnaire item
// =============================================================================

struct QuestionItem
{
    std::string id;
    std::string label;
    std::string type;          // "yes_no_na" | "text"
    std::string description;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(QuestionItem, id, label, type, description)


// =============================================================================
// Questionnaire category
// =============================================================================

struct Category
{
    std::string              id;
    std::string              title;
    std::vector<QuestionItem> items;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(Category, id, title, items)


// =============================================================================
// Maturity rule
// =============================================================================

struct MaturityRule
{
    int         level;
    std::string name;
    std::string description;
    int         min_score;
};

// Custom (de)serialisation to match the camelCase field names the frontend expects
inline void to_json(nlohmann::json& j, const MaturityRule& r)
{
    j = nlohmann::json{
        {"level",       r.level},
        {"name",        r.name},
        {"description", r.description},
        {"minScore",    r.min_score},
    };
}

inline void from_json(const nlohmann::json& j, MaturityRule& r)
{
    j.at("level").get_to(r.level);
    j.at("name").get_to(r.name);
    j.at("description").get_to(r.description);
    j.at("minScore").get_to(r.min_score);
}


// =============================================================================
// Pipeline assessment
// =============================================================================

struct Pipeline
{
    std::string                        id;
    std::string                        user_id;
    std::string                        name;
    std::string                        repo_id;
    std::string                        assessor;
    std::string                        repo_link;
    std::string                        date;
    int            score{0};
    int            level{1};
    nlohmann::json answers;  // object: questionId -> bool | string | number | string[]
    std::string    version;
};

inline void to_json(nlohmann::json& j, const Pipeline& p)
{
    j = nlohmann::json{
        {"id",       p.id},
        {"userId",   p.user_id},
        {"name",     p.name},
        {"repoId",   p.repo_id},
        {"assessor", p.assessor},
        {"repoLink", p.repo_link},
        {"date",     p.date},
        {"score",    p.score},
        {"level",    p.level},
        {"answers",  p.answers},
        {"version",  p.version},
    };
}

inline void from_json(const nlohmann::json& j, Pipeline& p)
{
    j.at("id").get_to(p.id);
    if (j.contains("userId"))   j.at("userId").get_to(p.user_id);
    j.at("name").get_to(p.name);
    if (j.contains("repoId"))   j.at("repoId").get_to(p.repo_id);
    if (j.contains("assessor")) j.at("assessor").get_to(p.assessor);
    if (j.contains("repoLink")) j.at("repoLink").get_to(p.repo_link);
    if (j.contains("date"))     j.at("date").get_to(p.date);
    if (j.contains("score"))    j.at("score").get_to(p.score);
    if (j.contains("level"))    j.at("level").get_to(p.level);
    if (j.contains("answers") && j.at("answers").is_object())
        p.answers = j.at("answers");
    if (j.contains("version"))   j.at("version").get_to(p.version);
}


// =============================================================================
// Assessment result
// =============================================================================

struct AssessmentResult
{
    int                      score{0};
    int                      level{1};
    std::string              level_name;
    std::vector<std::string> missing;
};

inline void to_json(nlohmann::json& j, const AssessmentResult& r)
{
    j = nlohmann::json{
        {"score",     r.score},
        {"level",     r.level},
        {"levelName", r.level_name},
        {"missing",   r.missing},
    };
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_TYPES_HPP
