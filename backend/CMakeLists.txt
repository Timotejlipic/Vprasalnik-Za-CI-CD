cmake_minimum_required(VERSION 3.20)
project(cicdq_backend_cpp CXX)

# =============================================================================
# Language standard
# =============================================================================

set(CMAKE_CXX_STANDARD          17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS        OFF)

# =============================================================================
# Dependencies  (downloaded automatically on first configure)
# =============================================================================

include(FetchContent)

# cpp-httplib — header-only HTTP/1.1 server (HTTP only; no SSL needed locally)
FetchContent_Declare(cpp_httplib
    URL https://github.com/yhirose/cpp-httplib/archive/refs/tags/v0.15.3.tar.gz
)
FetchContent_MakeAvailable(cpp_httplib)

# nlohmann/json — header-only JSON
set(JSON_BuildTests OFF CACHE INTERNAL "")
set(JSON_Install    OFF CACHE INTERNAL "")
FetchContent_Declare(nlohmann_json
    URL https://github.com/nlohmann/json/archive/refs/tags/v3.11.3.tar.gz
)
FetchContent_MakeAvailable(nlohmann_json)

# libpqxx — C++ client for PostgreSQL.
#
# Cross-platform strategy: prefer a system / package-manager install of libpqxx
# (vcpkg on Windows, apt/brew/dnf on *nix) so the heavy native libpq dependency
# is provided by the platform. If it is not found, build libpqxx from source via
# FetchContent. Either way, libpq itself (PostgreSQL client lib) must be present
# and discoverable through find_package(PostgreSQL).
#
#   Windows : vcpkg install libpqxx        (configure with the vcpkg toolchain)
#   Debian  : sudo apt install libpqxx-dev libpq-dev
#   macOS   : brew install libpqxx libpq
#   Alpine  : apk add postgresql-dev (builds from source via FetchContent below)
find_package(PostgreSQL REQUIRED)
find_package(libpqxx CONFIG QUIET)

if(NOT libpqxx_FOUND)
    message(STATUS "libpqxx not found via find_package — building from source via FetchContent URL")
    set(PQXX_LIBRARIES PostgreSQL::PostgreSQL CACHE INTERNAL "")
    set(SKIP_BUILD_TEST ON CACHE INTERNAL "")
    FetchContent_Declare(libpqxx
        URL https://github.com/jtv/libpqxx/archive/refs/tags/7.9.2.tar.gz
    )
    FetchContent_MakeAvailable(libpqxx)
endif()

# =============================================================================
# Target
# =============================================================================

add_executable(cicdq_server src/main.cpp)

target_include_directories(cicdq_server PRIVATE
    include
)
# Mark third-party headers as SYSTEM so the compiler suppresses their warnings
# (e.g. -Wunused-parameter inside httplib.h which we cannot modify).
target_include_directories(cicdq_server SYSTEM PRIVATE
    ${cpp_httplib_SOURCE_DIR}
)

target_link_libraries(cicdq_server PRIVATE
    nlohmann_json::nlohmann_json
)

# libpqxx target is named libpqxx::pqxx (find_package) or pqxx (FetchContent)
if(TARGET libpqxx::pqxx)
    target_link_libraries(cicdq_server PRIVATE libpqxx::pqxx)
else()
    target_link_libraries(cicdq_server PRIVATE pqxx)
endif()

# Windows requires winsock for networking
if(WIN32)
    target_link_libraries(cicdq_server PRIVATE ws2_32)
endif()

# POSIX requires pthreads (cpp-httplib uses std::thread)
if(UNIX)
    target_link_libraries(cicdq_server PRIVATE pthread)
endif()

# Warnings
if(MSVC)
    target_compile_options(cicdq_server PRIVATE /W4 /utf-8)
else()
    target_compile_options(cicdq_server PRIVATE -Wall -Wextra -Wpedantic)
endif()
