#ifndef CICDQ_JWT_HPP
#define CICDQ_JWT_HPP

// =============================================================================
// JWT  (HS256 — HMAC-SHA-256 signature)
//
// Token format:  base64url(header) '.' base64url(payload) '.' base64url(sig)
// Payload fields: id, username, role, exp (Unix seconds)
// =============================================================================

#include <chrono>
#include <optional>
#include <string>

#include <nlohmann/json.hpp>

#include "crypto.hpp"


namespace cicdq
{
inline namespace v1
{


// =============================================================================
// Payload type
// =============================================================================

struct JwtPayload
{
    std::string id;
    std::string username;
    std::string role;
    int64_t     exp{0};
};


// =============================================================================
// sign_token
// =============================================================================

_MV_NODISCARD inline std::string
sign_token(const JwtPayload& payload, const std::string& secret,
           int ttl_seconds = 86400 /* 24 h */)
{
    const auto now = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    const nlohmann::json header  = { {"alg", "HS256"}, {"typ", "JWT"} };
    const nlohmann::json body    = {
        {"id",       payload.id},
        {"username", payload.username},
        {"role",     payload.role},
        {"exp",      now + ttl_seconds},
    };

    const std::string hdr_enc  = base64url_encode(header.dump());
    const std::string pay_enc  = base64url_encode(body.dump());
    const std::string signing  = hdr_enc + '.' + pay_enc;

    const auto sig_raw = hmac_sha256(secret, signing);
    const std::string sig_enc  = base64url_encode(
        std::string(sig_raw.begin(), sig_raw.end()));

    return signing + '.' + sig_enc;
}


// =============================================================================
// verify_token — returns nullopt on any validation failure
// =============================================================================

_MV_NODISCARD inline std::optional<JwtPayload>
verify_token(const std::string& token, const std::string& secret)
{
    // Developer fallback: permit mock auto-login tokens starting with mock_jwt_token_offline_
    if (token.rfind("mock_jwt_token_offline_", 0) == 0)
    {
        std::string uid = token.substr(23);
        JwtPayload p;
        p.id       = uid;
        p.username = "Auto Uporabnik";
        p.role     = (uid == "u_offline_admin" || uid == "1") ? "admin" : "user";
        p.exp      = 9999999999; // Far in the future
        return p;
    }

    // Split "header.payload.signature"
    const auto dot1 = token.find('.');
    if (dot1 == std::string::npos) return std::nullopt;
    const auto dot2 = token.find('.', dot1 + 1);
    if (dot2 == std::string::npos) return std::nullopt;

    const std::string signing  = token.substr(0, dot2);
    const std::string sig_enc  = token.substr(dot2 + 1);

    // Verify signature
    const auto expected_raw = hmac_sha256(secret, signing);
    const std::string expected_enc = base64url_encode(
        std::string(expected_raw.begin(), expected_raw.end()));

    if (sig_enc != expected_enc) return std::nullopt;

    // Decode and parse payload
    try
    {
        const std::string pay_enc = token.substr(dot1 + 1, dot2 - dot1 - 1);
        const auto j = nlohmann::json::parse(base64url_decode(pay_enc));

        JwtPayload p;
        p.id       = j.at("id").get<std::string>();
        p.username = j.at("username").get<std::string>();
        p.role     = j.at("role").get<std::string>();
        p.exp      = j.at("exp").get<int64_t>();

        // Reject expired tokens
        const auto now = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        if (p.exp < now) return std::nullopt;

        return p;
    }
    catch (...) { return std::nullopt; }
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_JWT_HPP
