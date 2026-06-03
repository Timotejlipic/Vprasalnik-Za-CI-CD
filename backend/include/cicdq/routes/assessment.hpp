#ifndef CICDQ_ROUTES_ASSESSMENT_HPP
#define CICDQ_ROUTES_ASSESSMENT_HPP

// =============================================================================
// Assessment evaluation route
//   POST /api/assessment/evaluate
//
// Public endpoint — guests can evaluate without logging in.
//
// Two evaluation modes (auto-detected from the request body):
//
//   New questionnaire mode  (preferred):
//     Body contains "questionnaire" key with a sections-based questionnaire.
//     Answers can be bool, string, number, or array values.
//     { "answers": {...}, "questionnaire": {...} }
//
//   Legacy flat-category mode  (backwards compat):
//     Body contains "categories" key with a flat Category list.
//     Answers are string values ("DA" / "NE" / "NA" / free text).
//     { "answers": {...}, "categories": [...] }
//
//   In both modes, "rules" is optional — omit to use the server's current rules.
// =============================================================================

#include <string>

#include <httplib.h>
#include <nlohmann/json.hpp>

#include "../assessment.hpp"
#include "../auth.hpp"
#include "../store.hpp"
#include "../types.hpp"


namespace cicdq
{
inline namespace v1
{


inline void register_assessment_routes(httplib::Server& server, Store& store)
{
    server.Post("/api/assessment/evaluate",
                [&store](const httplib::Request& req, httplib::Response& res)
    {
        const auto body = parse_body(req);

        if (!body.contains("answers") || !body.at("answers").is_object())
        {
            send_err(res, 400, "answers object is required.");
            return;
        }

        const auto& answers = body.at("answers");

        const auto rules = body.contains("rules")
            ? body.at("rules").get<std::vector<MaturityRule>>()
            : store.find_all_rules();

        AssessmentResult result;

        if (body.contains("questionnaire") && body.at("questionnaire").is_object())
        {
            // New hierarchical questionnaire format
            result = evaluate_from_questionnaire(body.at("questionnaire"), answers, rules);
        }
        else
        {
            // Legacy flat-category format
            const auto categories = body.contains("categories")
                ? body.at("categories").get<std::vector<Category>>()
                : store.find_all_categories();

            result = evaluate_assessment(answers, categories, rules);
        }

        send_json(res, 200, nlohmann::json(result));
    });
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_ASSESSMENT_HPP
