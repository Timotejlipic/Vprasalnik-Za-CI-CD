#ifndef CICDQ_DB_HPP
#define CICDQ_DB_HPP

// =============================================================================
// Database connection pool (PostgreSQL via libpqxx)
//
// libpqxx connections are NOT safe to share across threads, and the HTTP server
// runs requests on a pool of threads. So we keep a fixed pool of open
// connections and hand one out per operation:
//
//   {
//       auto conn = db.acquire();         // borrows a connection (RAII)
//       pqxx::work txn(*conn);
//       auto r = txn.exec_params("SELECT ...", arg);
//       txn.commit();
//   }                                     // connection returned to the pool here
//
// acquire() blocks until a connection is free, so concurrency is naturally
// bounded by the pool size. A connection found dead on checkout is transparently
// reopened.
// =============================================================================

#include <condition_variable>
#include <cstddef>
#include <memory>
#include <mutex>
#include <queue>
#include <string>
#include <utility>

#include <pqxx/pqxx>

#include "crypto.hpp"   // for _MV_NODISCARD


namespace cicdq
{
inline namespace v1
{


class Db
{
public:
    // Opens `pool_size` connections eagerly so a bad connection string fails
    // fast at startup rather than on the first request.
    explicit Db(std::string conn_string, std::size_t pool_size = 8)
        : _conn_string(std::move(conn_string))
    {
        if (pool_size == 0) pool_size = 1;
        for (std::size_t i = 0; i < pool_size; ++i)
            _pool.push(std::make_unique<pqxx::connection>(_conn_string));
    }

    // RAII borrow: returns the connection to the pool on destruction.
    class Handle
    {
    public:
        Handle(Db* db, std::unique_ptr<pqxx::connection> c)
            : _db(db), _conn(std::move(c)) {}

        ~Handle() { if (_conn) _db->_release(std::move(_conn)); }

        Handle(Handle&&) noexcept            = default;
        Handle& operator=(Handle&&) noexcept = default;
        Handle(const Handle&)            = delete;
        Handle& operator=(const Handle&) = delete;

        pqxx::connection& operator*()  noexcept { return *_conn; }
        pqxx::connection* operator->() noexcept { return _conn.get(); }

    private:
        Db*                               _db;
        std::unique_ptr<pqxx::connection> _conn;
    };

    _MV_NODISCARD Handle acquire()
    {
        std::unique_lock<std::mutex> lock(_mutex);
        _cv.wait(lock, [this] { return !_pool.empty(); });

        auto c = std::move(_pool.front());
        _pool.pop();
        lock.unlock();

        // Replace a connection that has dropped (server restart, timeout, ...).
        if (!c->is_open())
            c = std::make_unique<pqxx::connection>(_conn_string);

        return Handle(this, std::move(c));
    }

private:
    void _release(std::unique_ptr<pqxx::connection> c)
    {
        {
            std::lock_guard<std::mutex> lock(_mutex);
            _pool.push(std::move(c));
        }
        _cv.notify_one();
    }

    std::string                                         _conn_string;
    std::mutex                                          _mutex;
    std::condition_variable                             _cv;
    std::queue<std::unique_ptr<pqxx::connection>>       _pool;
};


} // namespace v1
} // namespace cicdq

#endif // CICDQ_DB_HPP
