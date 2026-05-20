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
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG        v0.15.3
)
FetchContent_MakeAvailable(cpp_httplib)

# nlohmann/json — header-only JSON
set(JSON_BuildTests OFF CACHE INTERNAL "")
set(JSON_Install    OFF CACHE INTERNAL "")
FetchContent_Declare(nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG        v3.11.3
)
FetchContent_MakeAvailable(nlohmann_json)

# =============================================================================
# Target
# =============================================================================

add_executable(cicdq_server src/main.cpp)

target_include_directories(cicdq_server PRIVATE
    include
    ${cpp_httplib_SOURCE_DIR}       # provides httplib.h
)

target_link_libraries(cicdq_server PRIVATE
    nlohmann_json::nlohmann_json
)

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
