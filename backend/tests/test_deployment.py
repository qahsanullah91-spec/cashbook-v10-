import json
import os
from pathlib import Path
import unittest

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["CRON_SECRET"] = "test-cron-secret"

from fastapi.routing import APIRoute

from app.main import app, health
from app.database import normalize_database_url, resolve_database_url


PROJECT_ROOT = Path(__file__).resolve().parents[2]
VERCEL_INSTALL_COMMAND = "npm --prefix frontend ci"
VERCEL_BUILD_COMMAND = "npm --prefix frontend run build"
VERCEL_OUTPUT_DIRECTORY = "frontend/dist"


class DeploymentContractTests(unittest.TestCase):
    def test_health_returns_public_diagnostics_contract(self):
        payload = health(x_session_token=None)

        self.assertEqual("online", payload["backend"])
        self.assertEqual("connected", payload["database"])
        self.assertEqual("ok", payload["api"])
        self.assertEqual("ready", payload["auth"])
        self.assertEqual("ok", payload["status"])
        self.assertEqual("1.0.0", payload["version"])
        self.assertEqual("N/A", payload["port"])
        self.assertIn("timestamp", payload)
        self.assertIsNone(payload["currentUser"])

    def test_auth_status_route_is_registered(self):
        # Get all routes including those from included routers
        route_paths = set()
        for route in app.routes:
            if isinstance(route, APIRoute):
                route_paths.add(route.path)
        
        # Debug: print all registered routes
        print(f"\nRegistered routes: {sorted(route_paths)}")
        self.assertIn("/api/auth/status", route_paths)

    def test_neon_database_urls_use_installed_pg8000_driver(self):
        self.assertEqual(
            "postgresql+pg8000://user:pass@host/database",
            normalize_database_url("postgresql://user:pass@host/database"),
        )
        self.assertEqual(
            "postgresql+pg8000://user:pass@host/database",
            normalize_database_url("postgres://user:pass@host/database"),
        )

    def test_local_database_defaults_to_sqlite_when_env_is_absent(self):
        original_database_url = os.environ.pop("DATABASE_URL", None)
        original_vercel = os.environ.pop("VERCEL", None)
        original_vercel_env = os.environ.pop("VERCEL_ENV", None)
        try:
            self.assertEqual("sqlite:///./cashbook.db", resolve_database_url())
        finally:
            if original_database_url is not None:
                os.environ["DATABASE_URL"] = original_database_url
            if original_vercel is not None:
                os.environ["VERCEL"] = original_vercel
            if original_vercel_env is not None:
                os.environ["VERCEL_ENV"] = original_vercel_env

    def test_vercel_requires_database_url(self):
        original_database_url = os.environ.pop("DATABASE_URL", None)
        original_vercel = os.environ.get("VERCEL")
        original_vercel_env = os.environ.pop("VERCEL_ENV", None)
        os.environ["VERCEL"] = "1"
        try:
            with self.assertRaisesRegex(RuntimeError, "DATABASE_URL is required on Vercel"):
                resolve_database_url()
        finally:
            if original_database_url is not None:
                os.environ["DATABASE_URL"] = original_database_url
            if original_vercel is None:
                os.environ.pop("VERCEL", None)
            else:
                os.environ["VERCEL"] = original_vercel
            if original_vercel_env is not None:
                os.environ["VERCEL_ENV"] = original_vercel_env

    def test_production_vercel_rejects_sqlite_database_url(self):
        original_database_url = os.environ.get("DATABASE_URL")
        original_vercel = os.environ.get("VERCEL")
        original_vercel_env = os.environ.get("VERCEL_ENV")
        os.environ["DATABASE_URL"] = "sqlite:////tmp/cashbook.db"
        os.environ["VERCEL"] = "1"
        os.environ["VERCEL_ENV"] = "production"
        try:
            with self.assertRaisesRegex(RuntimeError, "must point to Neon/Postgres"):
                resolve_database_url()
        finally:
            if original_database_url is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = original_database_url
            if original_vercel is None:
                os.environ.pop("VERCEL", None)
            else:
                os.environ["VERCEL"] = original_vercel
            if original_vercel_env is None:
                os.environ.pop("VERCEL_ENV", None)
            else:
                os.environ["VERCEL_ENV"] = original_vercel_env

    def test_vercel_routes_api_before_spa_fallback(self):
        config = json.loads((PROJECT_ROOT / "vercel.json").read_text(encoding="utf-8"))
        rewrites = config["rewrites"]

        self.assertEqual("/api/index", rewrites[0]["destination"])
        self.assertEqual("/api/index", rewrites[1]["destination"])
        
        api_fallback_route = next(r for r in rewrites if r["source"] == "/api/:path*")
        self.assertEqual("/api/index", api_fallback_route["destination"])
        
        self.assertEqual("/index.html", rewrites[-1]["destination"])
        self.assertIn("health", rewrites[0]["source"])
        self.assertIn("health", rewrites[1]["source"])

    def test_vercel_builds_vite_and_fastapi_from_project_root(self):
        config = json.loads((PROJECT_ROOT / "vercel.json").read_text(encoding="utf-8"))

        self.assertEqual("vite", config["framework"])
        self.assertEqual(VERCEL_INSTALL_COMMAND, config["installCommand"])
        self.assertEqual(VERCEL_BUILD_COMMAND, config["buildCommand"])
        self.assertEqual(VERCEL_OUTPUT_DIRECTORY, config["outputDirectory"])
        self.assertNotIn("cd frontend", config["installCommand"])
        self.assertNotIn("cd frontend", config["buildCommand"])
        self.assertIn("api/index.py", config["functions"])
        self.assertEqual(
            "backend/**",
            config["functions"]["api/index.py"]["includeFiles"],
        )

    def test_linked_vercel_project_settings_match_committed_build_contract(self):
        project_config_path = PROJECT_ROOT / ".vercel" / "project.json"
        if not project_config_path.exists():
            self.skipTest("repository is not linked to a local Vercel project")

        settings = json.loads(project_config_path.read_text(encoding="utf-8"))["settings"]

        self.assertIsNone(settings["rootDirectory"])
        self.assertEqual("vite", settings["framework"])
        self.assertEqual(VERCEL_INSTALL_COMMAND, settings["installCommand"])
        self.assertEqual(VERCEL_BUILD_COMMAND, settings["buildCommand"])
        self.assertEqual(VERCEL_OUTPUT_DIRECTORY, settings["outputDirectory"])

    def test_production_frontend_uses_same_origin_api(self):
        api_source = (PROJECT_ROOT / "frontend/src/services/api.js").read_text(encoding="utf-8")

        self.assertIn(
            "import.meta.env?.PROD ? '' : (import.meta.env?.VITE_API_URL || 'http://localhost:8000')",
            api_source,
        )

    def test_vercel_upload_excludes_private_runtime_data(self):
        ignored = (PROJECT_ROOT / ".vercelignore").read_text(encoding="utf-8")

        self.assertIn("*.db", ignored)
        self.assertIn("backend/.vendor", ignored)
        self.assertIn("frontend/node_modules", ignored)
        self.assertIn(".env.*", ignored)


if __name__ == "__main__":
    unittest.main()
