#ifndef CICDQ_CRYPTO_HPP
#define CICDQ_CRYPTO_HPP

#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <random>
#include <string>
#include <vector>


// =============================================================================
// Portability macros
// =============================================================================

#if defined(__has_cpp_attribute) && __has_cpp_attribute(nodiscard)
#   define _MV_NODISCARD [[nodiscard]]
#else
#   define _MV_NODISCARD
#endif

#if defined(__has_cpp_attribute) && __has_cpp_attribute(nodiscard) >= 201907L
#   define _MV_NODISCARD_MSG(m) [[nodiscard(m)]]
#else
#   define _MV_NODISCARD_MSG(m) _MV_NODISCARD
#endif


namespace cicdq
{
inline namespace v1
{


// =============================================================================
// SHA-256 internal constants and helpers  (FIPS 180-4)
// prefix _c_ = compile-time constant, _f_ = function helper
// =============================================================================

inline constexpr std::array<uint32_t, 64> _c_k256 = {
    0x428a2f98u, 0x71374491u, 0xb5c0fbcfu, 0xe9b5dba5u,
    0x3956c25bu, 0x59f111f1u, 0x923f82a4u, 0xab1c5ed5u,
    0xd807aa98u, 0x12835b01u, 0x243185beu, 0x550c7dc3u,
    0x72be5d74u, 0x80deb1feu, 0x9bdc06a7u, 0xc19bf174u,
    0xe49b69c1u, 0xefbe4786u, 0x0fc19dc6u, 0x240ca1ccu,
    0x2de92c6fu, 0x4a7484aau, 0x5cb0a9dcu, 0x76f988dau,
    0x983e5152u, 0xa831c66du, 0xb00327c8u, 0xbf597fc7u,
    0xc6e00bf3u, 0xd5a79147u, 0x06ca6351u, 0x14292967u,
    0x27b70a85u, 0x2e1b2138u, 0x4d2c6dfcu, 0x53380d13u,
    0x650a7354u, 0x766a0abbu, 0x81c2c92eu, 0x92722c85u,
    0xa2bfe8a1u, 0xa81a664bu, 0xc24b8b70u, 0xc76c51a3u,
    0xd192e819u, 0xd6990624u, 0xf40e3585u, 0x106aa070u,
    0x19a4c116u, 0x1e376c08u, 0x2748774cu, 0x34b0bcb5u,
    0x391c0cb3u, 0x4ed8aa4au, 0x5b9cca4fu, 0x682e6ff3u,
    0x748f82eeu, 0x78a5636fu, 0x84c87814u, 0x8cc70208u,
    0x90befffau, 0xa4506cebu, 0xbef9a3f7u, 0xc67178f2u,
};

inline constexpr std::array<uint32_t, 8> _c_iv256 = {
    0x6a09e667u, 0xbb67ae85u, 0x3c6ef372u, 0xa54ff53au,
    0x510e527fu, 0x9b05688cu, 0x1f83d9abu, 0x5be0cd19u,
};

inline constexpr uint32_t _f_rotr32(uint32_t x, int n) noexcept
{
    return (x >> n) | (x << (32 - n));
}

inline constexpr uint32_t _f_ch (uint32_t e, uint32_t f, uint32_t g) noexcept { return (e & f) ^ (~e & g);          }
inline constexpr uint32_t _f_maj(uint32_t a, uint32_t b, uint32_t c) noexcept { return (a & b) ^ (a & c) ^ (b & c); }

inline constexpr uint32_t _f_bsig0(uint32_t a) noexcept { return _f_rotr32(a,  2) ^ _f_rotr32(a, 13) ^ _f_rotr32(a, 22); }
inline constexpr uint32_t _f_bsig1(uint32_t e) noexcept { return _f_rotr32(e,  6) ^ _f_rotr32(e, 11) ^ _f_rotr32(e, 25); }
inline constexpr uint32_t _f_ssig0(uint32_t x) noexcept { return _f_rotr32(x,  7) ^ _f_rotr32(x, 18) ^ (x >>  3);        }
inline constexpr uint32_t _f_ssig1(uint32_t x) noexcept { return _f_rotr32(x, 17) ^ _f_rotr32(x, 19) ^ (x >> 10);        }


// =============================================================================
// sha256 — raw 32-byte digest
// =============================================================================

_MV_NODISCARD inline std::array<uint8_t, 32>
sha256(const uint8_t* data, std::size_t len)
{
    // ---------------------------------------------------------------------------
    // Pad message to a multiple of 512 bits (64 bytes):
    //   append 0x80, then zeros until length ≡ 56 (mod 64), then 8-byte bit-count
    // ---------------------------------------------------------------------------
    std::size_t padded = len + 1;
    while (padded % 64 != 56) ++padded;
    padded += 8;

    std::vector<uint8_t> msg(padded, 0u);
    std::memcpy(msg.data(), data, len);
    msg[len] = 0x80u;

    const uint64_t bit_len = static_cast<uint64_t>(len) * 8u;
    for (int i = 0; i < 8; ++i)
        msg[padded - 8 + i] = static_cast<uint8_t>(bit_len >> ((7 - i) * 8));

    // ---------------------------------------------------------------------------
    // Compress each 512-bit block
    // ---------------------------------------------------------------------------
    std::array<uint32_t, 8> h = _c_iv256;

    for (std::size_t blk = 0; blk < padded; blk += 64)
    {
        std::array<uint32_t, 64> w{};

        for (int i = 0; i < 16; ++i)
            w[i] = (static_cast<uint32_t>(msg[blk + i*4])     << 24)
                 | (static_cast<uint32_t>(msg[blk + i*4 + 1]) << 16)
                 | (static_cast<uint32_t>(msg[blk + i*4 + 2]) <<  8)
                 | (static_cast<uint32_t>(msg[blk + i*4 + 3]));

        for (int i = 16; i < 64; ++i)
            w[i] = _f_ssig1(w[i-2]) + w[i-7] + _f_ssig0(w[i-15]) + w[i-16];

        uint32_t a = h[0], b = h[1], c = h[2], d = h[3];
        uint32_t e = h[4], f = h[5], g = h[6], hh = h[7];

        for (int i = 0; i < 64; ++i)
        {
            const uint32_t t1 = hh + _f_bsig1(e) + _f_ch(e,f,g) + _c_k256[i] + w[i];
            const uint32_t t2 = _f_bsig0(a) + _f_maj(a,b,c);
            hh = g; g = f; f = e; e = d + t1;
            d  = c; c = b; b = a; a = t1 + t2;
        }

        h[0] += a; h[1] += b; h[2] += c; h[3] += d;
        h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
    }

    // ---------------------------------------------------------------------------
    // Serialise to big-endian bytes
    // ---------------------------------------------------------------------------
    std::array<uint8_t, 32> digest{};
    for (int i = 0; i < 8; ++i)
    {
        digest[i*4]   = static_cast<uint8_t>(h[i] >> 24);
        digest[i*4+1] = static_cast<uint8_t>(h[i] >> 16);
        digest[i*4+2] = static_cast<uint8_t>(h[i] >>  8);
        digest[i*4+3] = static_cast<uint8_t>(h[i]);
    }
    return digest;
}

_MV_NODISCARD inline std::array<uint8_t, 32>
sha256(const std::string& s)
{
    return sha256(reinterpret_cast<const uint8_t*>(s.data()), s.size());
}

// Lowercase hex representation
_MV_NODISCARD inline std::string sha256_hex(const std::string& s)
{
    const auto d = sha256(s);
    char buf[65]{};
    for (int i = 0; i < 32; ++i)
        std::snprintf(buf + i*2, 3, "%02x", static_cast<unsigned>(d[i]));
    return buf;
}


// =============================================================================
// HMAC-SHA-256  (RFC 2104)
// =============================================================================

_MV_NODISCARD inline std::array<uint8_t, 32>
hmac_sha256(const std::string& key, const std::string& msg)
{
    constexpr std::size_t _block = 64u;

    // Normalise key length to exactly one block
    std::string k = key;
    if (k.size() > _block)
    {
        const auto kh = sha256(k);
        k.assign(kh.begin(), kh.end());
    }
    k.resize(_block, '\0');

    // Construct inner and outer padded keys
    std::string ki(_block, '\0'), ko(_block, '\0');
    for (std::size_t i = 0; i < _block; ++i)
    {
        ki[i] = static_cast<char>(static_cast<uint8_t>(k[i]) ^ 0x36u);
        ko[i] = static_cast<char>(static_cast<uint8_t>(k[i]) ^ 0x5cu);
    }

    // inner = SHA256(ki || msg)
    const auto inner_d = sha256(ki + msg);
    const std::string inner(inner_d.begin(), inner_d.end());

    // outer = SHA256(ko || inner)
    return sha256(ko + inner);
}


// =============================================================================
// Base64URL  (RFC 4648 §5, no padding)
// =============================================================================

inline constexpr std::string_view _c_b64url_chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

_MV_NODISCARD inline std::string base64url_encode(const std::string& in)
{
    std::string out;
    out.reserve(((in.size() + 2) / 3) * 4);

    int val = 0, valb = -6;
    for (const unsigned char c : in)
    {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0)
        {
            out.push_back(_c_b64url_chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6)
        out.push_back(_c_b64url_chars[((val << 8) >> (valb + 8)) & 0x3F]);
    return out;   // intentionally no '=' padding (JWT requirement)
}

_MV_NODISCARD inline std::string base64url_decode(const std::string& in)
{
    // Build reverse-lookup table at first call
    static const auto _lut = []() noexcept {
        std::array<int, 256> t{};
        t.fill(-1);
        for (int i = 0; i < 26; ++i) { t['A' + i] = i;      t['a' + i] = 26 + i; }
        for (int i = 0; i < 10; ++i)   t['0' + i] = 52 + i;
        t['-'] = 62; t['_'] = 63;
        t['+'] = 62; t['/'] = 63;   // also accept standard base64
        return t;
    }();

    std::string out;
    int val = 0, valb = -8;
    for (const unsigned char c : in)
    {
        if (_lut[c] == -1) break;
        val = (val << 6) + _lut[c];
        valb += 6;
        if (valb >= 0)
        {
            out.push_back(static_cast<char>((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}


// =============================================================================
// UUID v4
// =============================================================================

_MV_NODISCARD inline std::string generate_uuid4()
{
    // Thread-local engine avoids locking on every call
    static thread_local std::mt19937 _gen(std::random_device{}());
    static thread_local std::uniform_int_distribution<uint32_t> _dist;

    const uint32_t p1  = _dist(_gen);
    const uint16_t p2  = static_cast<uint16_t>(_dist(_gen));
    const uint16_t p3  = static_cast<uint16_t>((_dist(_gen) & 0x0FFFu) | 0x4000u);   // version 4
    const uint16_t p4  = static_cast<uint16_t>((_dist(_gen) & 0x3FFFu) | 0x8000u);   // variant
    const uint32_t p5h = _dist(_gen);
    const uint16_t p5l = static_cast<uint16_t>(_dist(_gen));

    char buf[37]{};
    std::snprintf(buf, sizeof(buf), "%08x-%04x-%04x-%04x-%08x%04x",
                  p1,
                  static_cast<unsigned>(p2),
                  static_cast<unsigned>(p3),
                  static_cast<unsigned>(p4),
                  p5h,
                  static_cast<unsigned>(p5l));
    return buf;
}


// =============================================================================
// Password helpers  (SHA-256 + random salt — intentionally simple for demo)
// =============================================================================

_MV_NODISCARD inline std::string hash_password(const std::string& password)
{
    const std::string salt = generate_uuid4().substr(0, 8);
    return salt + ':' + sha256_hex(salt + password);
}

_MV_NODISCARD inline bool verify_password(const std::string& password,
                                           const std::string& stored)
{
    const auto colon = stored.find(':');
    if (colon == std::string::npos) return false;
    const std::string salt     = stored.substr(0, colon);
    const std::string expected = stored.substr(colon + 1);
    return sha256_hex(salt + password) == expected;
}


} // namespace v1
} // namespace cicdq

#endif // CICDQ_CRYPTO_HPP
