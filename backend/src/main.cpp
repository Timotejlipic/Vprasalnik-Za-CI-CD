// cicdq — C++ Backend entry point
// Reads PORT and JWT_SECRET from the environment, sets up the HTTP server,
// registers all API routes, then listens.

#include <cstdlib>
#include <iostream>
#include <memory>
#include <string>
#include <fstream>

#define CPPHTTPLIB_THREAD_POOL_COUNT 8   // concurrent request threads
#include <httplib.h>

#include "cicdq/db.hpp"
#include "cicdq/store.hpp"
#include "cicdq/routes/auth.hpp"
#include "cicdq/routes/pipelines.hpp"
#include "cicdq/routes/categories.hpp"
#include "cicdq/routes/rules.hpp"
#include "cicdq/routes/assessment.hpp"
#include "cicdq/routes/questionnaire.hpp"
#include "cicdq/routes/assignments.hpp"


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
    const std::string db_url     = _s_env("DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/vprasalnik");

    // =========================================================================
    // Database  (PostgreSQL connection pool) + Store
    // =========================================================================

    std::unique_ptr<cicdq::Db> db;
    try
    {
        db = std::make_unique<cicdq::Db>(db_url);
    }
    catch (const std::exception& e)
    {
        std::cerr << "[cicdq C++] Could not connect to the database: " << e.what() << "\n"
                  << "[cicdq C++] Set DATABASE_URL and ensure PostgreSQL is running "
                     "with the schema loaded.\n";
        return 1;
    }

    cicdq::Store store(*db);

    // =========================================================================
    // Auto-seed default questionnaires
    // =========================================================================
    try
    {
        auto conn = db->acquire();
        pqxx::work txn(*conn);
        const auto r = txn.exec("SELECT COUNT(*) FROM questionnaire_items");
        const long item_count = r[0][0].as<long>();
        txn.commit();

        if (item_count == 0)
        {
            std::cout << "[cicdq C++] questionnaire_items table is empty, auto-seeding...\n";
            
            // Seed version 1.0
            std::ifstream f1("/app/questionnaire_config.json");
            if (f1.is_open())
            {
                nlohmann::json q1;
                f1 >> q1;
                store.import_questionnaire_version(q1);
                std::cout << "[cicdq C++] Successfully seeded questionnaire version 1.0\n";
            }
            else
            {
                std::cerr << "[cicdq C++] Warning: could not open /app/questionnaire_config.json for seeding\n";
            }

            // Seed version 2.0
            std::ifstream f2("/app/questionnaire2.json");
            if (f2.is_open())
            {
                nlohmann::json q2;
                f2 >> q2;
                store.import_questionnaire_version(q2);
                std::cout << "[cicdq C++] Successfully seeded questionnaire version 2.0\n";
            }
            else
            {
                std::cerr << "[cicdq C++] Warning: could not open /app/questionnaire2.json for seeding\n";
            }
        }
        else
        {
            std::cout << "[cicdq C++] questionnaire_items already has " << item_count << " rows, skipping seeding.\n";
        }
    }
    catch (const std::exception& e)
    {
        std::cerr << "[cicdq C++] Error during startup seeding: " << e.what() << "\n";
    }

    // =========================================================================
    // Auto-seed default rules configs
    // =========================================================================
    try
    {
        auto conn = db->acquire();
        pqxx::work txn(*conn);
        txn.exec(
            "CREATE TABLE IF NOT EXISTS rules_configs ("
            "  id BIGSERIAL PRIMARY KEY,"
            "  version VARCHAR(50) NOT NULL UNIQUE,"
            "  title VARCHAR(255) NOT NULL,"
            "  description TEXT,"
            "  levels JSONB NOT NULL DEFAULT '[]'::jsonb,"
            "  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,"
            "  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
            ")");
        txn.commit();

        pqxx::work txn2(*conn);
        const auto r_rules = txn2.exec("SELECT COUNT(*) FROM rules_configs");
        const long rules_count = r_rules[0][0].as<long>();
        txn2.commit();

        if (rules_count == 0)
        {
            std::cout << "[cicdq C++] rules_configs table is empty, auto-seeding...\n";
            
            // Seed v1.0 rules
            std::ifstream f1("/app/maturity_rules.json");
            if (!f1.is_open()) {
                f1.open("maturity_rules.json");
            }
            if (f1.is_open())
            {
                nlohmann::json r1;
                f1 >> r1;
                pqxx::work txn_s1(*conn);
                txn_s1.exec_params(
                    "INSERT INTO rules_configs (version, title, description, levels) VALUES ($1, $2, $3, $4)",
                    r1.value("version", "1.0"),
                    r1.value("title", "CI/CD Pravila v1.0"),
                    r1.value("description", ""),
                    r1.value("levels", nlohmann::json::array()).dump()
                );
                txn_s1.commit();
                std::cout << "[cicdq C++] Successfully seeded rules version 1.0\n";
            }

            // Seed v2.0 rules
            std::ifstream f2("/app/maturity_rules2.json");
            if (!f2.is_open()) {
                f2.open("maturity_rules2.json");
            }
            if (f2.is_open())
            {
                nlohmann::json r2;
                f2 >> r2;
                pqxx::work txn_s2(*conn);
                txn_s2.exec_params(
                    "INSERT INTO rules_configs (version, title, description, levels) VALUES ($1, $2, $3, $4)",
                    r2.value("version", "2.0"),
                    r2.value("title", "Agile & Scrum Pravila v2.0"),
                    r2.value("description", ""),
                    r2.value("levels", nlohmann::json::array()).dump()
                );
                txn_s2.commit();
                std::cout << "[cicdq C++] Successfully seeded rules version 2.0\n";
            }
        }
        else
        {
            std::cout << "[cicdq C++] rules_configs already has " << rules_count << " rows, skipping seeding.\n";
        }
    }
    catch (const std::exception& e)
    {
        std::cerr << "[cicdq C++] Error during rules_configs table migration/seeding: " << e.what() << "\n";
    }

    // =========================================================================
    // Auto-create groups & assignments tables (server-side assignment tracking)
    // =========================================================================
    try
    {
        auto conn = db->acquire();
        pqxx::work txn(*conn);
        // Allow the self-registered "member" role on existing databases.
        txn.exec("ALTER TABLE app_users DROP CONSTRAINT IF EXISTS chk_app_user_role");
        txn.exec("ALTER TABLE app_users ADD CONSTRAINT chk_app_user_role "
                 "CHECK (role IN ('user', 'admin', 'member'))");
        txn.exec(
            "CREATE TABLE IF NOT EXISTS user_groups ("
            "  id BIGSERIAL PRIMARY KEY,"
            "  name VARCHAR(255) NOT NULL,"
            "  user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,"
            "  github_repos JSONB NOT NULL DEFAULT '[]'::jsonb,"
            "  repo_configs JSONB NOT NULL DEFAULT '{}'::jsonb,"
            "  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
            ")");
        txn.exec(
            "CREATE TABLE IF NOT EXISTS assignments ("
            "  id BIGSERIAL PRIMARY KEY,"
            "  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,"
            "  user_email VARCHAR(255) NOT NULL DEFAULT '',"
            "  user_name VARCHAR(255) NOT NULL DEFAULT '',"
            "  group_id VARCHAR(255) NOT NULL DEFAULT '',"
            "  group_name VARCHAR(255) NOT NULL DEFAULT '',"
            "  repo_link TEXT NOT NULL,"
            "  repo_name VARCHAR(255) NOT NULL DEFAULT '',"
            "  status VARCHAR(50) NOT NULL DEFAULT 'pending',"
            "  score INT,"
            "  level INT,"
            "  pipeline_id VARCHAR(255) NOT NULL DEFAULT '',"
            "  answers JSONB,"
            "  form_version VARCHAR(50) NOT NULL DEFAULT '1.0',"
            "  rules_version VARCHAR(50) NOT NULL DEFAULT '1.0',"
            "  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,"
            "  completed_at TIMESTAMP"
            ")");
        txn.commit();
        std::cout << "[cicdq C++] user_groups & assignments tables ready.\n";
    }
    catch (const std::exception& e)
    {
        std::cerr << "[cicdq C++] Error creating groups/assignments tables: " << e.what() << "\n";
    }

    // =========================================================================
    // HTTP server
    // =========================================================================

    httplib::Server server;

    server.set_logger([](const httplib::Request& req, const httplib::Response& res) {
        std::cout << "[cicdq C++] " << req.method << " " << req.path << " -> " << res.status << std::endl;
    });

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
    cicdq::register_assignment_routes    (server, store, jwt_secret);

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
