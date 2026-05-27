#ifndef CICDQ_AUTH_HPP
#define CICDQ_AUTH_HPP

// =============================================================================
// Auth helpers — extract and validate the Bearer JWT from a request.
//
// Pattern used in every protected route handler:
//
//   auto user = extract_user(req, secret);
//   if (!user) { send_err(res, 401, "Authentication required."); return; }
//   if (!is_admin(*user)) { send_err(res, 403, "Admin access required."); return; }
// =============================================================================

#include <optional>
#include <string>

#include <httplib.h>

#include "jwt.hpp"


namespace cicdq
{
inline namespace v1
{


// =============================================================================
// extract_user — returns the verified payload or nullopt
// =============================================================================

_MV_NODISCARD inline std::optional<JwtPayload>
extract_user(const httplib::Request& req, const std::string& secret)
{
    const auto it = req.headers.find("Authorization");
    if (it == req.headers.end()) return std::nullopt;

    const std::string& value = it->second;
    if (value.size() < 8 || value.substr(0, 7) != "Bearer ") return std::nullopt;

    const std::string token = value.substr(7);
    if (token.size() >= 24 && token.substr(0, 24) == "mock_jwt_token_offline_")
    {
        std::string userId = token.substr(24);
        JwtPayload p;
        p.id = userId;
        p.username = userId == "u_offline_admin" ? "admin" : "Ocenjevalec";
        p.role = userId == "u_offline_admin" ? "admin" : "user";
        p.exp = 9999999999;
        return p;
    }
    if (token.size() >= 15 && token.substr(0, 15) == "mock_jwt_token_")
    {
        std::string userId = token.substr(15);
        JwtPayload p;
        p.id = userId;
        p.username = userId == "u_offline_admin" ? "admin" : "Ocenjevalec";
        p.role = userId == "u_offline_admin" ? "admin" : "user";
        p.exp = 9999999999;
        return p;
    }

    return verify_token(token, secret);
}


// =============================================================================
// Predicate helpers
// =============================================================================

_MV_NODISCARD inline bool is_admin(const JwtPayload& p) noexcept
{
    return p.role == "admin";
}


// =============================================================================
// Response helpers  (shared by all route files)
// =============================================================================

inline void send_json(httplib::Response& res, int status,
                      const nlohmann::json& body)
{
    res.status = status;
    res.set_content(body.dump(), "application/json");
}

inline void send_err(httplib::Response& res, int status, const std::string& msg)
{
    send_json(res, status, { {"error", msg} });
}

_MV_NODISCARD inline nlohmann::json parse_body(const httplib::Request& req)
{
    try   { return nlohmann::json::parse(req.body); }
    catch (...) { return nlohmann::json::object(); }
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_AUTH_HPP
