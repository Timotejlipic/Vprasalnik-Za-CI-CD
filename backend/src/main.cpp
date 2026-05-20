// cicdq — C++ Backend entry point
// Reads PORT and JWT_SECRET from the environment, sets up the HTTP server,
// registers all API routes, then listens.

#include <cstdlib>
#include <iostream>
#include <string>

#define CPPHTTPLIB_THREAD_POOL_COUNT 8   // concurrent request threads
#include <httplib.h>

#include "cicdq/store.hpp"
#include "cicdq/routes/auth.hpp"
#include "cicdq/routes/pipelines.hpp"
#include "cicdq/routes/categories.hpp"
#include "cicdq/routes/rules.hpp"
#include "cicdq/routes/assessment.hpp"
#include "cicdq/routes/questionnaire.hpp"


// =============================================================================
// Helpers
// =============================================================================

static std::string _s_env(const char* name, const char* fallback) noexcept
{
    const char* val = std::getenv(name);
    return val ? std::string{val} : std::string{fallback};
}


// =============================================================================
// main
// =============================================================================

int main()
{
    const int         port       = std::stoi(_s_env("PORT",       "3002"));
    const std::string jwt_secret = _s_env("JWT_SECRET", "dev_secret_change_in_prod");
    const std::string origin     = _s_env("FRONTEND_ORIGIN", "http://localhost:5173");

    // =========================================================================
    // Store  (in-memory, seeded with initial data)
    // =========================================================================

    cicdq::Store store;

    // =========================================================================
    // HTTP server
    // =========================================================================

    httplib::Server server;

    // -------------------------------------------------------------------------
    // CORS pre-flight  — must be registered before any route handler
    // -------------------------------------------------------------------------
    server.set_pre_routing_handler(
        [&origin](const httplib::Request& req, httplib::Response& res)
        -> httplib::Server::HandlerResponse
    {
        res.set_header("Access-Control-Allow-Origin",  origin);
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.set_header("Access-Control-Max-Age",       "86400");

        if (req.method == "OPTIONS")
        {
            res.status = 204;
            return httplib::Server::HandlerResponse::Handled;
        }
        return httplib::Server::HandlerResponse::Unhandled;
    });

    // -------------------------------------------------------------------------
    // Global exception handler
    // -------------------------------------------------------------------------
    server.set_exception_handler(
        [](const httplib::Request&, httplib::Response& res, std::exception_ptr ep)
    {
        try { std::rethrow_exception(ep); }
        catch (const std::exception& e)
        {
            res.status = 500;
            res.set_content(
                nlohmann::json{{"error", e.what()}}.dump(),
                "application/json");
        }
        catch (...)
        {
            res.status = 500;
            res.set_content(R"({"error":"Internal server error."})", "application/json");
        }
    });

    // -------------------------------------------------------------------------
    // Health check
    // -------------------------------------------------------------------------
    server.Get("/health", [](const httplib::Request&, httplib::Response& res)
    {
        res.set_content(R"({"status":"ok"})", "application/json");
    });

    // =========================================================================
    // Routes
    // =========================================================================

    cicdq::register_auth_routes          (server, store, jwt_secret);
    cicdq::register_pipeline_routes      (server, store, jwt_secret);
    cicdq::register_category_routes      (server, store, jwt_secret);
    cicdq::register_rules_routes         (server, store, jwt_secret);
    cicdq::register_assessment_routes    (server, store);
    cicdq::register_questionnaire_routes (server, store, jwt_secret);

    // =========================================================================
    // Listen
    // =========================================================================

    std::cout << "[cicdq C++] Backend listening on "
              << "http://localhost:" << port << "\n";

    if (!server.listen("0.0.0.0", port))
    {
        std::cerr << "[cicdq C++] Failed to bind port " << port << "\n";
        return 1;
    }

    return 0;
}
