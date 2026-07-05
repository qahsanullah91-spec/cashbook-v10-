import os
import unittest

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["CRON_SECRET"] = "test-cron-secret"

from fastapi.routing import APIRoute

from app.main import app


class SecurityBoundaryTests(unittest.TestCase):
    def test_accounting_routes_require_authentication(self):
        public_paths = {
            "/health",
            "/health/database",
            "/health/auth",
            "/api/auth/status",
            "/api/auth/setup",
            "/api/auth/login",
            "/api/auth/logout",
        }
        protected_prefixes = (
            "/api/accounts",
            "/api/transactions",
            "/api/summary",
            "/api/reports",
            "/api/export",
            "/api/settings",
        )

        for route in app.routes:
            if not isinstance(route, APIRoute) or route.path in public_paths:
                continue
            if route.path.startswith(protected_prefixes):
                dependency_names = {dependency.call.__name__ for dependency in route.dependant.dependencies}
                self.assertIn(
                    "require_authenticated_request",
                    dependency_names,
                    f"{route.path} is missing authentication",
                )

    def test_backup_routes_require_admin_except_cron(self):
        for route in app.routes:
            if not isinstance(route, APIRoute) or not route.path.startswith("/api/backup"):
                continue
            dependency_names = {dependency.call.__name__ for dependency in route.dependant.dependencies}
            if route.path in ("/api/backup/daily", "/api/backup/export-system"):
                self.assertNotIn("require_administrator_request", dependency_names)
            else:
                self.assertIn(
                    "require_administrator_request",
                    dependency_names,
                    f"{route.path} is missing administrator authorization",
                )


if __name__ == "__main__":
    unittest.main()
