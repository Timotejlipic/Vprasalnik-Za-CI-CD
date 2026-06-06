#ifndef CICDQ_ROUTES_AUTH_HPP
#define CICDQ_ROUTES_AUTH_HPP

// =============================================================================
// Auth routes
//   POST /api/auth/login     — verify credentials, return JWT
//   POST /api/auth/register  — create account, return JWT
// =============================================================================

#include <optional>
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
        std::string       email    = body.value("email", "");

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

        // E-mail is optional in the form; fall back to the username so the
        // NOT NULL UNIQUE email column stays populated.
        if (email.empty()) email = username;

        const std::string ph   = hash_password(password);
        // Self-registered accounts are "member": their own dashboard + new
        // assessments, but no admin panels and not a restricted assignee.
        const auto        user = store.create_user(username, email, ph, "member");
        const JwtPayload  payload{ user.id, user.username, user.role };
        const std::string token = sign_token(payload, secret);

        send_json(res, 201, {
            {"token", token},
            {"user",  nlohmann::json{
                {"id",       user.id},
                {"username", user.username},
                {"email",    user.email},
                {"role",     user.role},
            }},
        });
    });

    // =========================================================================
    // POST /api/auth/invite-login
    //   Link-based access: issue a JWT for an existing user identified by
    //   username or e-mail (no password). Mirrors the invite-link auto-login.
    // =========================================================================

    server.Post("/api/auth/invite-login", [&store, &secret](const httplib::Request& req,
                                                            httplib::Response&      res)
    {
        const auto body = parse_body(req);
        const std::string username = body.value("username", "");
        const std::string email    = body.value("email", "");

        if (username.empty() && email.empty())
        {
            send_err(res, 400, "username or email is required.");
            return;
        }

        std::optional<User> user_opt;
        if (!username.empty()) user_opt = store.find_user_by_username(username);
        if (!user_opt && !email.empty()) user_opt = store.find_user_by_email(email);
        if (!user_opt) { send_err(res, 404, "User not found."); return; }

        const JwtPayload  payload{ user_opt->id, user_opt->username, user_opt->role };
        const std::string token = sign_token(payload, secret);

        send_json(res, 200, {
            {"token", token},
            {"user",  nlohmann::json{
                {"id",       user_opt->id},
                {"username", user_opt->username},
                {"email",    user_opt->email},
                {"role",     user_opt->role},
            }},
        });
    });

    // =========================================================================
    // GET /api/users
    // =========================================================================
    server.Get("/api/users", [&store, &secret](const httplib::Request& req,
                                                httplib::Response&      res)
    {
        const auto admin_user = extract_user(req, secret);
        if (!admin_user) { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*admin_user)) { send_err(res, 403, "Admin access required."); return; }

        const auto users = store.find_all_users();
        nlohmann::json arr = nlohmann::json::array();
        for (const auto& u : users)
        {
            arr.push_back(nlohmann::json{
                {"id",       u.id},
                {"email",    u.email},
                {"name",     u.username},
                {"username", u.username},
                {"role",     u.role}
            });
        }
        send_json(res, 200, arr);
    });

    // =========================================================================
    // POST /api/users
    // =========================================================================
    server.Post("/api/users", [&store, &secret](const httplib::Request& req,
                                                 httplib::Response&      res)
    {
        const auto admin_user = extract_user(req, secret);
        if (!admin_user) { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*admin_user)) { send_err(res, 403, "Admin access required."); return; }

        const auto body = parse_body(req);

        const std::string email = body.value("email", "");
        const std::string password = body.value("password", "");
        const std::string role = body.value("role", "user");

        if (email.empty() || password.empty())
        {
            send_err(res, 400, "Email and password are required.");
            return;
        }
        if (store.find_user_by_username(email))
        {
            send_err(res, 409, "User with this email already exists.");
            return;
        }

        const std::string ph   = hash_password(password);
        // Admin-created accounts use the e-mail as the login username too.
        const auto        user = store.create_user(email, email, ph, role);

        send_json(res, 201, nlohmann::json{
            {"id",       user.id},
            {"email",    user.email},
            {"name",     user.username},
            {"username", user.username},
            {"role",     user.role}
        });
    });

    // =========================================================================
    // DELETE /api/users/:id
    // =========================================================================
    server.Delete(R"(/api/users/(\d+))", [&store, &secret](const httplib::Request& req,
                                                           httplib::Response&      res)
    {
        const auto admin_user = extract_user(req, secret);
        if (!admin_user) { send_err(res, 401, "Authentication required."); return; }
        if (!is_admin(*admin_user)) { send_err(res, 403, "Admin access required."); return; }

        const std::string id = req.matches[1];
        if (id == admin_user->id)
        {
            send_err(res, 400, "You cannot delete your own account.");
            return;
        }

        if (store.remove_user(id))
        {
            send_json(res, 200, {{"status", "ok"}});
        }
        else
        {
            send_err(res, 404, "User not found.");
        }
    });
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_ROUTES_AUTH_HPP
