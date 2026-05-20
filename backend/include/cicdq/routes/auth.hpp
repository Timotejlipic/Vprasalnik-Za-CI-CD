#ifndef CICDQ_ROUTES_AUTH_HPP
#define CICDQ_ROUTES_AUTH_HPP

// =============================================================================
// Auth routes
//   POST /api/auth/login     — verify credentials, return JWT
//   POST /api/auth/register  — create account, return JWT
// =============================================================================

#include <string>

#include <httplib.h>

#include "../auth.hpp"
#include "../crypto.hpp"
#include "../jwt.hpp"
#include "../store.hpp"


namespace cicdq
{
inline namespace v1
{


inline void register_auth_routes(httplib::Server& server, Store& store,
                                  const std::string& secret)
{
    // =========================================================================
    // POST /api/auth/login
    // =========================================================================

    server.Post("/api/auth/login", [&store, &secret](const httplib::Request& req,
                                                      httplib::Response&      res)
    {
        const auto body = parse_body(req);

        const std::string username = body.value("username", "");
        const std::string password = body.value("password", "");

        if (username.empty() || password.empty())
        {
            send_err(res, 400, "Username and password are required.");
            return;
        }

        const auto user_opt = store.find_user_by_username(username);
        if (!user_opt || !verify_password(password, user_opt->password_hash))
        {
            send_err(res, 401, "Invalid credentials.");
            return;
        }

        const JwtPayload payload{ user_opt->id, user_opt->username, user_opt->role };
        const std::string token = sign_token(payload, secret);

        send_json(res, 200, {
            {"token", token},
            {"user",  nlohmann::json{
                {"id",       user_opt->id},
                {"username", user_opt->username},
                {"role",     user_opt->role},
            }},
        });
    });

    // =========================================================================
    // POST /api/auth/register
    // =========================================================================

    server.Post("/api/auth/register", [&store, &secret](const httplib::Request& req,
                                                          httplib::Response&      res)
    {
        const auto body = parse_body(req);

        const std::string username = body.value("username", "");
        const std::string password = body.value("password", "");

        if (username.empty() || password.empty())
        {
            send_err(res, 400, "Username and password are required.");
            return;
        }
        if (password.size() < 6)
        {
            send_err(res, 400, "Password must be at least 6 characters.");
            return;
        }
        if (store.find_user_by_username(username))
        {
            send_err(res, 409, "Username is already taken.");
            return;
        }

        const std::string ph   = hash_password(password);
        const auto        user = store.create_user(username, ph, "user");
        const JwtPayload  payload{ user.id, user.username, user.role };
        const std::string token = sign_token(payload, secret);

        send_json(res, 201, {
            {"token", token},
            {"user",  nlohmann::json{
                {"id",       user.id},
                {"username", user.username},
                {"role",     user.role},
            }},
        });
    });
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_AUTH_HPP
