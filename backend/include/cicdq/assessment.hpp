#ifndef CICDQ_ASSESSMENT_HPP
#define CICDQ_ASSESSMENT_HPP

// =============================================================================
// Assessment scoring
//
// Two evaluation modes:
//   evaluate_assessment         — flat Category list
//   evaluate_from_questionnaire — hierarchical questionnaire JSON
// =============================================================================

#include <algorithm>
#include <cmath>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "types.hpp"


namespace cicdq
{
inline namespace v1
{


// =============================================================================
// evaluate_assessment  (legacy flat-category path)
//
// answers: JSON object whose values are strings ("DA" / "NE" / "NA" / free text)
//          or any JSON value — strings are inspected for "DA"/"NA".
// =============================================================================

_MV_NODISCARD inline AssessmentResult
evaluate_assessment(const nlohmann::json&            answers,
                    const std::vector<Category>&     categories,
                    const std::vector<MaturityRule>& rules)
{
    int score         = 0;
    int effective_max = 0;
    std::vector<std::string> missing;

    for (const auto& cat : categories)
    {
        for (const auto& item : cat.items)
        {
            const std::string ans = answers.contains(item.id) &&
                                    answers.at(item.id).is_string()
                ? answers.at(item.id).get<std::string>() : std::string{};

            if (item.type == "yes_no_na")
            {
                if (ans == "NA") continue;
                effective_max += 10;
                if (ans == "DA")
                    score += 10;
                else
                    missing.push_back("Manjka v " + cat.title + ": " + item.label);
            }
            else if (item.type == "text")
            {
                effective_max += 10;
                if (!ans.empty()) score += 10;
            }
        }
    }

    const int max_possible     = effective_max == 0 ? 100 : effective_max;
    const int normalized_score = std::min(100,
        static_cast<int>(std::round(static_cast<double>(score) / max_possible * 100.0)));

    int         level      = 1;
    std::string level_name = rules.empty() ? "Začetna" : rules[0].name;

    for (int i = static_cast<int>(rules.size()) - 1; i >= 0; --i)
    {
        if (normalized_score >= rules[i].min_score)
        {
            level      = rules[i].level;
            level_name = rules[i].name;
            break;
        }
    }

    const auto next_it = std::find_if(rules.begin(), rules.end(),
        [&](const MaturityRule& r){ return r.level == level + 1; });

    std::vector<std::string> tips;
    if (next_it != rules.end())
        tips.push_back("Za dosego stopnje " + next_it->name +
                       " potrebujete še " + std::to_string(next_it->min_score - normalized_score) + " točk.");
    else
        tips.push_back("Ste na najvišji stopnji zrelosti!");

    for (auto& m : missing) tips.push_back(std::move(m));
    if (tips.size() > 15) tips.resize(15);

    return { normalized_score, level, std::move(level_name), std::move(tips) };
}


// =============================================================================
// evaluate_from_questionnaire  (new hierarchical questionnaire path)
//
// questionnaire: the questionnaire JSON object — must have a "sections" array.
// answers:       JSON object — values can be bool, string, number, or array.
//
// Walks every item in every section recursively and accumulates a score.
// Sub-items of a checkbox are always walked (matching frontend behaviour).
// =============================================================================

namespace detail
{

inline void score_items(const nlohmann::json&     items,
                         const nlohmann::json&    answers,
                         const std::string&       section_label,
                         int&                     score,
                         int&                     total,
                         std::vector<std::string>& missing)
{
    for (const auto& item : items)
    {
        const std::string id    = item.value("id",    "");
        const std::string label = item.value("label", "");
        const std::string type  = item.value("type",  "");

        const auto& val = answers.contains(id) ? answers.at(id) : nlohmann::json{};

        if (type == "checkbox" || type == "yes_no_na")
        {
            const bool is_yes = (val.is_boolean() && val.get<bool>()) ||
                                (val.is_string()  && val.get<std::string>() == "DA");
            const bool is_na  =  val.is_string()  && val.get<std::string>() == "NA";

            if (!is_na)
            {
                ++total;
                if (is_yes) ++score;
                else        missing.push_back(section_label + ": " + label);
            }
        }
        else if (type == "multiselect")
        {
            ++total;
            if (val.is_array() && !val.empty()) ++score;
            else missing.push_back(section_label + ": " + label);
        }
        else if (type == "text")
        {
            ++total;
            const std::string s = val.is_string() ? val.get<std::string>() : std::string{};
            if (!s.empty()) ++score;
            else missing.push_back(section_label + ": " + label);
        }
        else if (type == "numeric")
        {
            ++total;
            const double n = val.is_number() ? val.get<double>() : 0.0;
            if (n > 0.0) ++score;
        }

        // Recurse into nested sub-items regardless of parent state
        if (item.contains("items") && item.at("items").is_array())
            score_items(item.at("items"), answers, section_label, score, total, missing);
    }
}

} // namespace detail


_MV_NODISCARD inline AssessmentResult
evaluate_from_questionnaire(const nlohmann::json&            questionnaire,
                             const nlohmann::json&            answers,
                             const std::vector<MaturityRule>& rules)
{
    int score = 0, total = 0;
    std::vector<std::string> missing;

    if (questionnaire.contains("sections") && questionnaire.at("sections").is_array())
    {
        for (const auto& section : questionnaire.at("sections"))
        {
            const std::string label = section.value("label", section.value("title", ""));
            if (section.contains("items") && section.at("items").is_array())
                detail::score_items(section.at("items"), answers, label, score, total, missing);
        }
    }

    const int pct = total == 0 ? 0 :
        std::min(100, static_cast<int>(std::round(static_cast<double>(score) / total * 100.0)));

    int         level      = 1;
    std::string level_name = rules.empty() ? "Začetna" : rules[0].name;

    for (int i = static_cast<int>(rules.size()) - 1; i >= 0; --i)
    {
        if (pct >= rules[i].min_score)
        {
            level      = rules[i].level;
            level_name = rules[i].name;
            break;
        }
    }

    const auto next_it = std::find_if(rules.begin(), rules.end(),
        [&](const MaturityRule& r){ return r.level == level + 1; });

    std::vector<std::string> tips;
    if (next_it != rules.end())
        tips.push_back("Za dosego stopnje " + next_it->name +
                       " potrebujete še " + std::to_string(next_it->min_score - pct) + " točk.");
    else
        tips.push_back("Ste na najvišji stopnji zrelosti!");

    for (auto& m : missing) tips.push_back(std::move(m));
    if (tips.size() > 15) tips.resize(15);

    return { pct, level, std::move(level_name), std::move(tips) };
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ASSESSMENT_HPP
